import React, { useState, useRef, useEffect } from 'react';
import { analyzeCropImage } from '../services/geminiService';
import { AnalysisResult, SavedReport, UserCrop } from '../types';
import { CROP_CATEGORIES, CROPS_BY_CATEGORY } from '../constants';
import ShareDialog from './ShareDialog';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';

interface AnalyzerProps {
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  userRank?: string;
  userCrops?: UserCrop[];
}

const ANALYZER_TOUR: TourStep[] = [
  {
    title: "জ্যেষ্ঠ বিজ্ঞানী স্ক্যানার",
    content: "এআই বিজ্ঞানী হিসেবে আমি আপনার ফসলের রোগ নির্ণয়ে এবং বিএআরসি/বিএআরআই মানদণ্ড অনুযায়ী পরামর্শ দেব।",
    position: 'center'
  },
  {
    targetId: "analyzer-command-bar",
    title: "কমান্ড বার",
    content: "এখানে আপনার সমস্যাটি লিখে বা মুখে বলে বর্ণনা করুন এবং পোকা বা রোগের আক্রান্ত অংশের পরিষ্কার ছবি আপলোড করুন।",
    position: 'bottom'
  }
];

const Analyzer: React.FC<AnalyzerProps> = ({ onAction, onSaveReport, onShowFeedback, onBack, userRank, userCrops = [] }) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const { playSpeech, stopSpeech, isSpeaking, speechEnabled } = useSpeech();

  const [selectedCategory, setSelectedCategory] = useState<string>('cereals');
  const [cropFamily, setCropFamily] = useState<string>('ধান');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  const loadingMessages = [
    "CABI ডায়াগনোসিস গাইড বিশ্লেষণ হচ্ছে...",
    "BARC/BRRI/BARI অ্যাডভাইজরি যাচাই চলছে...",
    "রোগতাত্ত্বিক লক্ষণ শনাক্ত করা হচ্ছে...",
    "সিনিয়র বিজ্ঞানী রিপোর্ট চূড়ান্ত করছেন..."
  ];

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_analyzer_v3');
    if (!tourDone) setShowTour(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        setUserQuery(prev => prev + ' ' + event.results[0][0].transcript);
      };
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId);
    const crops = CROPS_BY_CATEGORY[catId] || [];
    if (crops.length > 0) setCropFamily(crops[0]);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট আপনার ব্রাউজারে সমর্থিত নয়।");
    if (isListening) recognitionRef.current.stop();
    else recognitionRef.current.start();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setMimeType(file.type);
        setResult(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedImage) return alert("অনুগ্রহ করে একটি ছবি নির্বাচন করুন।");
    setIsLoading(true);
    setResult(null);
    try {
      const base64 = selectedImage.split(',')[1];
      const analysis = await analyzeCropImage(base64, mimeType, {
        cropFamily: `${selectedCategory}: ${cropFamily}`,
        userRank,
        query: userQuery
      });
      setResult(analysis);
      if (speechEnabled) playSpeech(analysis.fullText);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (error) {
      alert("বিশ্লেষণে সমস্যা হয়েছে। পুনরায় চেষ্টা করুন।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToProfile = () => {
    if (result && onSaveReport) {
      onSaveReport({
        type: 'AI Diagnosis',
        title: `${cropFamily} - ${result.diagnosis}`,
        content: result.fullText,
        icon: '🔬'
      });
      alert('রিপোর্ট প্রোফাইলে সেভ করা হয়েছে!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      {showTour && <GuidedTour steps={ANALYZER_TOUR} tourKey="analyzer_v3" onClose={() => setShowTour(false)} />}
      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="কৃষি বিজ্ঞানী এআই রিপোর্ট" content={result?.fullText || ""} />}
      
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-[#0A8A1F] hover:text-white transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight leading-none">সিনিয়র কৃষি বিজ্ঞানী স্ক্যানার</h2>
          <div className="flex gap-2 mt-2">
            <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-blue-100 tracking-widest">CABI Diagnosis Standard</span>
            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[8px] font-black uppercase border border-emerald-100 tracking-widest">BARC | DAE | BARI</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-xl border border-slate-100 mb-8 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
        <div className="space-y-6 mb-10">
           <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>ফসল নির্বাচন করুন</span>
           </div>
           <div className="flex overflow-x-auto space-x-2 pb-2 scrollbar-hide">
              {CROP_CATEGORIES.map(cat => (
                <button key={cat.id} onClick={() => handleCategoryChange(cat.id)} className={`flex-none flex items-center space-x-2 px-6 py-3 rounded-2xl border-2 transition-all ${selectedCategory === cat.id ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[10px] font-black uppercase tracking-tighter">{cat.label}</span>
                </button>
              ))}
           </div>
           <select value={cropFamily} onChange={(e) => setCropFamily(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-4 px-8 font-black text-lg text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner appearance-none">
              {(CROPS_BY_CATEGORY[selectedCategory] || []).map(c => <option key={c} value={c}>{c}</option>)}
           </select>
        </div>

        <div className="space-y-6">
           <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span>লক্ষণ বর্ণনা ও ছবি (CABI Standard)</span>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div className="md:col-span-4 aspect-square md:aspect-auto md:h-full relative group">
                {selectedImage ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-500 shadow-2xl relative">
                    <img src={selectedImage} className="w-full h-full object-cover" alt="Selected" />
                    <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-rose-500 transition-all">
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  </div>
                ) : (
                  <button onClick={() => fileInputRef.current?.click()} className="w-full h-full min-h-[250px] bg-slate-50 rounded-[2.5rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-4 hover:border-emerald-400 hover:bg-emerald-50/30 transition-all group">
                    <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center text-4xl shadow-sm group-hover:scale-110 transition-transform">📸</div>
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest">ছবি তুলুন বা আপলোড করুন</p>
                  </button>
                )}
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleFileChange} />
              </div>
              <div id="analyzer-command-bar" className="md:col-span-8 space-y-4 flex flex-col">
                 <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] p-6 relative flex flex-col focus-within:border-emerald-500 transition-all group shadow-inner">
                    <textarea value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder="সমস্যাটি বর্ণনা করুন... (যেমন: পাতায় ছোট কালো দাগ দেখা যাচ্ছে)" className="w-full flex-1 bg-transparent resize-none font-bold text-slate-700 placeholder:text-slate-300 outline-none pr-12 text-lg" />
                    <div className="flex items-center justify-between mt-4">
                       <div className="flex space-x-2">
                          <button onClick={() => fileInputRef.current?.click()} className="p-3 bg-white rounded-2xl shadow-sm text-slate-400 hover:text-emerald-600 transition-all active:scale-90" title="Attach Photo">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                          </button>
                          <button onClick={toggleListening} className={`p-3 rounded-2xl shadow-sm transition-all active:scale-90 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-400 hover:text-blue-600'}`} title="Voice Input">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                          </button>
                       </div>
                       <button onClick={handleAnalyze} disabled={isLoading || !selectedImage} className={`px-10 py-4 rounded-[1.8rem] font-black text-sm uppercase tracking-widest transition-all shadow-xl active:scale-95 flex items-center space-x-3 ${!selectedImage ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}>
                          {isLoading ? <span>বিশ্লেষণ হচ্ছে...</span> : <span>বিজ্ঞানী মতামত দিন</span>}
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                       </button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white p-12 rounded-[3.5rem] text-center shadow-2xl border border-slate-50 flex flex-col items-center space-y-10 animate-fade-in my-8">
           <div className="relative w-32 h-32">
              <div className="absolute inset-0 border-[10px] border-emerald-50 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl">🔬</div>
           </div>
           <div className="max-w-md mx-auto space-y-4">
              <h3 className="text-3xl font-black text-slate-800 leading-tight">{loadingMessages[loadingStep % loadingMessages.length]}</h3>
              <p className="text-sm text-slate-400 font-bold uppercase tracking-[0.3em]">Connecting to CABI & BARC Intelligence</p>
           </div>
           <div className="w-full max-w-xs h-2 bg-slate-50 rounded-full overflow-hidden">
              <div className="h-full bg-emerald-600 transition-all duration-1000" style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}></div>
           </div>
        </div>
      )}

      {result && !isLoading && (
        <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl animate-fade-in border-t-[20px] border-emerald-600 relative overflow-hidden flex flex-col">
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 pb-10 border-b-2 border-slate-50 gap-10 relative z-10">
             <div className="flex items-center space-x-6">
                <div className="w-20 h-20 bg-emerald-600 text-white rounded-[2.2rem] flex items-center justify-center text-4xl shadow-2xl">👨‍🔬</div>
                <div>
                  <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3">বিজ্ঞানী অ্যাডভাইজরি রিপোর্ট</h3>
                  <div className="flex items-center space-x-2">
                     <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">Verified Advisory</span>
                     <span className="text-[8px] font-bold text-slate-300 uppercase">Protocols: CABI & BARI</span>
                  </div>
                </div>
             </div>
             <div className="flex items-center space-x-3">
               <button onClick={() => setIsShareOpen(true)} className="p-5 rounded-full bg-slate-50 text-slate-400 hover:text-emerald-600 transition-all active:scale-90 border border-slate-100 shadow-sm" title="Share">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
               </button>
               <button onClick={() => playSpeech(result.fullText)} className={`p-7 rounded-full shadow-2xl transition-all active:scale-90 relative group ${isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                  {isSpeaking ? (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg>
                  ) : (
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                  )}
               </button>
               <button onClick={handleSaveToProfile} className="p-5 rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 transition-all active:scale-90" title="Save to Profile">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 5h14m-14 0v14l7-7 7 7V5m-14 0h14" /></svg>
               </button>
             </div>
           </div>
           <div className="prose prose-slate max-w-none font-medium leading-[1.8] whitespace-pre-wrap text-slate-800 text-xl md:text-2xl first-letter:text-8xl first-letter:font-black first-letter:text-emerald-600 first-letter:float-left first-letter:mr-6 first-letter:leading-none">
             {result.fullText}
           </div>
           {result.groundingChunks && result.groundingChunks.length > 0 && (
             <div className="mt-16 pt-10 border-t-2 border-dashed border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">তথ্যসূত্র ও রেফারেন্স (Grounding Sources):</h4>
                <div className="flex flex-wrap gap-3">
                  {result.groundingChunks.map((chunk, idx) => chunk.web ? (
                    <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-5 py-2.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black border border-blue-100 hover:bg-blue-100 transition shadow-sm">
                      <svg className="w-3.5 h-3.5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                      {chunk.web.title}
                    </a>
                  ) : null)}
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

export default Analyzer;