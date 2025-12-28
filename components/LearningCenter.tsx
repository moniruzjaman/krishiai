
import React, { useState, useRef, useEffect } from 'react';
import { identifyPlantSpecimen, generateSpeech, decodeBase64, decodeAudioData, getAgriQuiz, searchAgriculturalInfo } from '../services/geminiService';
import { GroundingChunk, SavedReport, AgriQuizQuestion } from '../types';
import ShareDialog from './ShareDialog';

interface LearningCenterProps {
  onAction: (xp: number) => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
}

const plantIdLoadingSteps = [
  "উদ্ভিদ নমুনা চিত্র বিশ্লেষণ করা হচ্ছে...",
  "CABI ট্যাক্সোনমি এবং উদ্ভিদ ডাটাবেস যাচাই চলছে...",
  "বৈজ্ঞানিক নাম ও পরিবারের তথ্য শনাক্ত করা হচ্ছে...",
  "উদ্ভিদের গুণাগুণ ও বৈশিষ্ট্য বিশ্লেষণ হচ্ছে...",
  "বিস্তারিত রিপোর্ট চূড়ান্ত করা হচ্ছে..."
];

const quizLoadingSteps = [
  "আপনার নির্বাচিত বিষয় বিশ্লেষণ করা হচ্ছে...",
  "BARI/BRRI কারিকুলাম অনুযায়ী প্রশ্ন তৈরি করা হচ্ছে...",
  "সঠিক উত্তরের যুক্তি এবং ব্যাখ্যা সাজানো হচ্ছে...",
  "কুইজ চ্যালেঞ্জ প্রস্তুত করা হচ্ছে..."
];

const LearningCenter: React.FC<LearningCenterProps> = ({ onAction, onSaveReport, onShowFeedback }) => {
  const [activeMode, setActiveMode] = useState<'menu' | 'scan' | 'quiz' | 'dictionary'>('menu');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [report, setReport] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  
  const [quizTopic, setQuizTopic] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<AgriQuizQuestion[]>([]);
  const [currentQuizIdx, setCurrentQuizIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizFinished, setQuizFinished] = useState(false);

  const [dictQuery, setDictQuery] = useState('');
  const [dictResult, setDictResult] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    let interval: any;
    if (isLoading || isQuizLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % 5);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading, isQuizLoading]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (activeMode === 'quiz') setQuizTopic(transcript);
        if (activeMode === 'dictionary') setDictQuery(transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [activeMode]);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট আপনার ব্রাউজারে সমর্থিত নয়।");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setIsLoading(true); 
        setReport(null);
        setLoadingStep(0);

        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }

        try {
          const res = await identifyPlantSpecimen(base64, file.type);
          setReport(res); 
          if (res.text) playTTS(res.text);
          onAction(30);
          if (onShowFeedback) onShowFeedback();
        } catch (err) { 
          alert("শনাক্তকরণ ব্যর্থ হয়েছে।"); 
        } finally { 
          setIsLoading(false); 
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = (data?: string) => {
    const textToSave = data || report?.text || dictResult?.text;
    if (textToSave && onSaveReport) {
      onSaveReport({
        type: 'Learning Resource',
        title: activeMode === 'dictionary' ? `ডিকশনারি: ${dictQuery}` : 'শিখন কেন্দ্র রিপোর্ট',
        content: textToSave,
        icon: '🎓'
      });
      alert("সংরক্ষণ করা হয়েছে!");
    }
  };

  const startQuiz = async () => {
    if (!quizTopic.trim()) return alert("একটি বিষয় লিখুন।");
    setIsQuizLoading(true);
    setQuizQuestions([]);
    setQuizFinished(false);
    setScore(0);
    setCurrentQuizIdx(0);
    setLoadingStep(0);
    try {
      const questions = await getAgriQuiz(quizTopic);
      setQuizQuestions(questions);
    } catch (e) {
      alert("কুইজ তৈরি করা সম্ভব হয়নি।");
    } finally {
      setIsQuizLoading(false);
    }
  };

  const handleDictSearch = async () => {
    if (!dictQuery.trim()) return;
    setIsLoading(true);
    setDictResult(null);
    try {
      const res = await searchAgriculturalInfo(`Define and explain "${dictQuery}" in the context of agriculture for a student. Respond in Bangla.`);
      setDictResult(res);
      if (res.text) playTTS(res.text);
      onAction(15);
      if (onShowFeedback) onShowFeedback();
    } catch (e) {
      alert("তথ্য পাওয়া যায়নি।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswer = (idx: number) => {
    if (idx === quizQuestions[currentQuizIdx].correctAnswer) {
      setScore(prev => prev + 1);
    }
    if (currentQuizIdx < quizQuestions.length - 1) {
      setCurrentQuizIdx(prev => prev + 1);
    } else {
      setQuizFinished(true);
      onAction(50);
      if (onShowFeedback) onShowFeedback();
    }
  };

  const playTTS = async (textOverride?: string) => {
    const textToSpeak = textOverride || report?.text || dictResult?.text;
    if (!textToSpeak) return;

    if (isPlaying && !textOverride) { 
      stopTTS(); 
      return; 
    }

    try {
      stopTTS();
      setIsPlaying(true);
      if (!audioContextRef.current) { 
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); 
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const cleanText = textToSpeak.replace(/[*#_~]/g, '');
      const base64Audio = await generateSpeech(cleanText);
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (e) { 
      setIsPlaying(false); 
    }
  };

  const stopTTS = () => { 
    if (currentSourceRef.current) { 
      currentSourceRef.current.stop(); 
      currentSourceRef.current = null; 
    } 
    setIsPlaying(false); 
  };

  const DashboardCard = ({ icon, title, desc, onClick, color }: any) => (
    <button onClick={onClick} className={`bg-white p-8 rounded-[2.5rem] shadow-xl hover:shadow-2xl transition-all border border-slate-100 group flex flex-col text-left relative overflow-hidden`}>
      <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-5 ${color}`}></div>
      <div className={`w-16 h-16 ${color.replace('bg-', 'bg-opacity-10 bg-')} rounded-2xl flex items-center justify-center text-4xl mb-6 shadow-inner group-hover:scale-110 transition-transform`}>{icon}</div>
      <h3 className="text-xl font-black text-slate-800 mb-2 tracking-tight group-hover:text-emerald-600 transition-colors">{title}</h3>
      <p className="text-sm font-medium text-slate-400 leading-relaxed">{desc}</p>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="শিখন কেন্দ্র" content={report?.text || dictResult?.text || ""} />
      
      <div className="flex items-center space-x-4 mb-10">
        <button onClick={() => { activeMode === 'menu' ? window.history.back() : setActiveMode('menu'); stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-slate-50 transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">কৃষি শিখন কেন্দ্র</h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Academic & Research Hub</p>
        </div>
      </div>

      {activeMode === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
          <DashboardCard icon="🌿" title="উদ্ভিদ শনাক্তকরণ" desc="যেকোনো গাছের ছবি তুলে তার বৈজ্ঞানিক নাম ও গুণাগুণ জানুন।" onClick={() => setActiveMode('scan')} color="bg-emerald-600" />
          <DashboardCard icon="🧠" title="এআই কৃষি কুইজ" desc="আপনার কৃষি জ্ঞান যাচাই করুন এবং নতুন XP অর্জন করুন।" onClick={() => setActiveMode('quiz')} color="bg-blue-600" />
          <DashboardCard icon="📖" title="এআই এনসাইক্লোপিডিয়া" desc="জটিল কৃষি টার্ম বা পদ্ধতির সহজ ব্যাখ্যা খুঁজুন।" onClick={() => setActiveMode('dictionary')} color="bg-indigo-600" />
          <DashboardCard icon="🎴" title="কৃষি ফ্ল্যাশকার্ড" desc="মজার মাধ্যমে শস্য পুষ্টি ও চাষাবাদ পদ্ধতি শিখুন।" onClick={() => window.dispatchEvent(new CustomEvent('agritech_navigate', { detail: 'FLASHCARDS' }))} color="bg-amber-600" />
        </div>
      )}

      {activeMode === 'scan' && (
        <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
           {!isLoading && (
             <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 text-center relative overflow-hidden group">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
                <div className="w-20 h-20 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-emerald-100">🌿</div>
                <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">উদ্ভিদ নমুনা শনাক্তকরণ</h2>
                <button onClick={() => fileInputRef.current?.click()} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-xl transition-all text-xl active:scale-95">ছবি আপলোড করুন</button>
             </div>
           )}
           {isLoading && (
             <div className="bg-white rounded-[3rem] p-16 text-center shadow-xl border border-slate-100 flex flex-col items-center space-y-8 animate-fade-in">
                <div className="relative w-28 h-28">
                   <div className="absolute inset-0 border-8 border-blue-50 rounded-full animate-spin border-t-blue-600"></div>
                   <div className="absolute inset-0 flex items-center justify-center text-4xl">🔬</div>
                </div>
                <h3 className="text-2xl font-black text-slate-800">{plantIdLoadingSteps[loadingStep % plantIdLoadingSteps.length]}</h3>
             </div>
           )}
           {report && !isLoading && (
             <div className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border-t-[14px] border-emerald-600 relative overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start mb-8 pb-6 border-b border-slate-100 gap-6 relative z-10">
                   <div>
                      <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-1">শনাক্তকৃত উদ্ভিদ রিপোর্ট</h3>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Grounding: CABI & Local Flora DB</p>
                   </div>
                   <div className="flex items-center space-x-2">
                      <button onClick={() => setIsShareOpen(true)} className="p-4 rounded-full bg-slate-100 text-slate-600"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
                      <button onClick={() => playTTS()} className={`p-4 rounded-full shadow-lg ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>{isPlaying ? '🔇' : '🔊'}</button>
                      <button onClick={()=>handleSave()} className="p-4 rounded-full bg-slate-900 text-white shadow-lg"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 5h14m-14 0v14l7-7 7 7V5m-14 0h14" /></svg></button>
                   </div>
                </div>
                <div className="prose prose-slate max-w-none font-medium leading-relaxed whitespace-pre-wrap text-lg first-letter:text-5xl first-letter:font-black first-letter:float-left first-letter:mr-4 first-letter:text-emerald-600">{report.text}</div>
             </div>
           )}
        </div>
      )}

      {activeMode === 'quiz' && (
        <div className="max-w-3xl mx-auto animate-fade-in">
           {!quizQuestions.length && !quizFinished && (
             <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 space-y-6 text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto text-4xl shadow-inner">🧠</div>
                {isQuizLoading ? (
                   <div className="py-10 animate-fade-in space-y-6">
                      <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      <h3 className="text-xl font-black text-slate-800">{quizLoadingSteps[loadingStep % quizLoadingSteps.length]}</h3>
                   </div>
                ) : (
                   <div className="space-y-6">
                    <h2 className="text-2xl font-black text-slate-800">এআই কৃষি কুইজ</h2>
                    <p className="text-slate-500 font-medium max-w-sm mx-auto">একটি বিষয় লিখুন (যেমন: ব্রি ধান৭৪, স্মার্ট সেচ) এবং এআই আপনার জন্য প্রশ্ন তৈরি করবে।</p>
                    <div className="relative">
                        <input type="text" value={quizTopic} onChange={(e) => setQuizTopic(e.target.value)} placeholder="বিষয় লিখুন..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 pr-12 font-bold text-slate-700 outline-none focus:border-blue-600 shadow-inner" onKeyDown={(e) => e.key === 'Enter' && startQuiz()} />
                        <button onClick={toggleListening} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-blue-600'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                    </div>
                    <button onClick={startQuiz} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl active:scale-95 text-lg">কুইজ শুরু করুন</button>
                   </div>
                )}
             </div>
           )}
           {quizQuestions.length > 0 && !quizFinished && (
             <div className="bg-white rounded-[3rem] p-10 shadow-2xl border-t-[12px] border-blue-600 animate-fade-in">
                <div className="flex justify-between items-center mb-8 pb-4 border-b border-slate-50">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">প্রশ্ন: {currentQuizIdx + 1} / {quizQuestions.length}</span>
                   <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">স্কোর: {score}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 mb-10 leading-tight">{quizQuestions[currentQuizIdx].question}</h3>
                <div className="grid grid-cols-1 gap-4">
                   {quizQuestions[currentQuizIdx].options.map((opt, i) => (
                     <button key={i} onClick={() => handleAnswer(i)} className="bg-slate-50 border-2 border-slate-100 p-6 rounded-2xl text-left font-bold text-slate-700 hover:border-blue-600 hover:bg-white transition-all shadow-sm"><span className="w-8 h-8 bg-white rounded-lg inline-flex items-center justify-center mr-4 shadow-sm text-blue-600 font-black">{i + 1}</span>{opt}</button>
                   ))}
                </div>
             </div>
           )}
           {quizFinished && (
             <div className="bg-white rounded-[3rem] p-12 shadow-2xl text-center animate-fade-in border-4 border-emerald-500/20">
                <div className="text-7xl mb-8">🎉</div>
                <h2 className="text-3xl font-black text-slate-800 mb-10">কুইজ সম্পন্ন! আপনার স্কোর: {score}</h2>
                <button onClick={() => { setQuizQuestions([]); setQuizFinished(false); setActiveMode('menu'); }} className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black shadow-xl">ফিরে যান</button>
             </div>
           )}
        </div>
      )}

      {activeMode === 'dictionary' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
           <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 text-center relative overflow-hidden">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 text-4xl shadow-inner border border-indigo-100">📖</div>
              <h2 className="text-2xl font-black text-slate-800 mb-6">এআই এগ্রো-এনসাইক্লোপিডিয়া</h2>
              <div className="flex flex-col md:flex-row gap-3">
                 <div className="flex-1 relative">
                    <input type="text" value={dictQuery} onChange={(e) => setDictQuery(e.target.value)} placeholder="যেমন: হাইড্রোপনিক্স, আইপিএম মেথড..." className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-12 font-bold text-slate-700 outline-none focus:border-indigo-500" onKeyDown={(e) => e.key === 'Enter' && handleDictSearch()} />
                    <button onClick={toggleListening} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-indigo-600'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button>
                 </div>
                 <button onClick={handleDictSearch} disabled={isLoading} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 disabled:bg-slate-300">ব্যাখ্যা করুন</button>
              </div>
           </div>

           {isLoading && (
              <div className="flex flex-col items-center justify-center py-20 bg-white rounded-[3rem] border border-slate-100 shadow-xl">
                 <div className="w-12 h-12 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                 <p className="mt-4 font-black text-slate-400 uppercase tracking-widest text-xs">AI Knowledge Engine Active...</p>
              </div>
           )}

           {dictResult && !isLoading && (
              <div className="bg-white rounded-[3.5rem] p-10 md:p-12 shadow-2xl border-t-[14px] border-indigo-600 animate-fade-in relative overflow-hidden flex flex-col">
                 <div className="flex justify-between items-start mb-8 pb-6 border-b border-slate-100 relative z-10">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tighter">এনসাইক্লোপিডিয়া এন্ট্রি</h3>
                    <div className="flex items-center space-x-2">
                       <button onClick={() => playTTS()} className={`p-4 rounded-full shadow-lg ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600 text-white'}`}>{isPlaying ? '🔊' : '🔈'}</button>
                       <button onClick={()=>handleSave()} className="p-4 rounded-full bg-slate-900 text-white shadow-lg"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 5h14m-14 0v14l7-7 7 7V5m-14 0h14" /></svg></button>
                    </div>
                 </div>
                 <div className="prose prose-indigo max-w-none text-slate-800 leading-[1.8] font-medium text-lg whitespace-pre-wrap first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-indigo-600">{dictResult.text}</div>
              </div>
           )}
        </div>
      )}
    </div>
  );
};

export default LearningCenter;
