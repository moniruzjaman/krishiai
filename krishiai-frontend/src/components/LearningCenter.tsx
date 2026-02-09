
import React, { useState, useRef } from 'react';
import {
  identifyPlantSpecimen,
  generateAgriQuiz,
  searchEncyclopedia
} from '../services/ai/geminiService';
import { queryQwenVL } from '../services/ai/huggingfaceService';
import { AgriQuizQuestion, Language } from '../types';
import { useSpeech } from '../App';

interface LearningCenterProps {
  onBack: () => void;
  onAction: (xp: number) => void;
  lang: Language;
}

const LearningCenter: React.FC<LearningCenterProps> = ({ onBack, onAction, lang }) => {
  const [activeMode, setActiveMode] = useState<'menu' | 'scan' | 'quiz' | 'dictionary'>('menu');
  const { stopSpeech } = useSpeech();

  const DashboardCard = ({ icon, title, desc, onClick, color }: any) => (
    <button onClick={onClick} className={`${color} p-8 rounded-[3rem] text-white text-left shadow-xl hover:scale-[1.02] transition-all active:scale-95 group relative overflow-hidden h-full flex flex-col`}>
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-700"></div>
      <div className="text-5xl mb-6 transform group-hover:rotate-12 transition-transform">{icon}</div>
      <h3 className="text-2xl font-black mb-3 tracking-tight">{title}</h3>
      <p className="text-sm font-medium opacity-80 leading-relaxed flex-1">{desc}</p>
      <div className="mt-8 flex justify-end"><div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">→</div></div>
    </button>
  );

  return (
    <div className="max-w-6xl mx-auto p-4 animate-fade-in font-sans pb-32">
      <div className="flex items-center space-x-4 mb-12">
        <button onClick={activeMode === 'menu' ? onBack : () => { setActiveMode('menu'); stopSpeech(); }} className="p-3 bg-white rounded-2xl shadow-sm border text-slate-400 hover:text-emerald-600 transition-all">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight leading-none">কৃষি শিখন কেন্দ্র</h1>
        </div>
      </div>

      {activeMode === 'menu' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in px-2">
          <DashboardCard icon="🔬" title="CABI ডায়াগনোসিস মাস্টারক্লাস" desc="আন্তর্জাতিক মানের রোগ শনাক্তকরণ পদ্ধতি শিখুন ও সার্টিফিকেট পান।" onClick={() => window.dispatchEvent(new CustomEvent('agritech_navigate', { detail: 'CABI_TRAINING' }))} color="bg-rose-600" />
          <DashboardCard icon="🌿" title="উদ্ভিদ শনাক্তকরণ" desc="যেকোনো গাছের ছবি তুলে তার বৈজ্ঞানিক নাম ও গুণাগুণ জানুন।" onClick={() => setActiveMode('scan')} color="bg-emerald-600" />
          <DashboardCard icon="🧠" title="এআই কৃষি কুইজ" desc="আপনার কৃষি জ্ঞান যাচাই করুন এবং নতুন XP অর্জন করুন।" onClick={() => setActiveMode('quiz')} color="bg-blue-600" />
          <DashboardCard icon="📖" title="এআই এনসাইক্লোপিডিয়া" desc="জটিল কৃষি টার্ম বা পদ্ধতির সহজ ব্যাখ্যা খুঁজুন।" onClick={() => setActiveMode('dictionary')} color="bg-indigo-600" />
        </div>
      )}

      {activeMode === 'scan' && <PlantScanner onComplete={(xp: number) => { onAction(xp); setActiveMode('menu'); }} lang={lang} />}
      {activeMode === 'quiz' && <QuizModule onComplete={(xp: number) => { onAction(xp); setActiveMode('menu'); }} lang={lang} />}
      {activeMode === 'dictionary' && <Encyclopedia lang={lang} />}
    </div>
  );
};

const PlantScanner = ({ onComplete, lang }: any) => {
  const [image, setImage] = useState<string | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { playSpeech } = useSpeech();

  const handleScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const base64 = (ev.target?.result as string).split(',')[1];
        setImage(ev.target?.result as string);
        setIsLoading(true);
        try {
          const prompt = "Identify this botanical specimen. Scientific name and usage.";
          const qwenRes = await queryQwenVL(prompt, base64, lang);
          if (qwenRes) {
            setReport(qwenRes);
            playSpeech(qwenRes);
          } else {
            const res = await identifyPlantSpecimen(base64, file.type, lang);
            setReport(res.text);
            if (res.text) playSpeech(res.text);
          }
          onComplete(30);
        } catch (err) { alert("Error identifying plant."); } finally { setIsLoading(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="bg-white rounded-[4rem] p-10 shadow-2xl border animate-fade-in-up">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-black text-slate-800">উদ্ভিদ শনাক্তকরণ (Qwen-VL)</h2>
        <p className="text-slate-500 font-medium max-w-sm mx-auto mt-2">যেকোনো কৃষি গাছের ছবি নিন, এআই তার বিস্তারিত পরিচয় জানাবে।</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="space-y-6">
          <div className="aspect-square bg-slate-50 rounded-[3rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center overflow-hidden relative">
            {image ? <img src={image} className="w-full h-full object-cover" alt="Sample" /> : <p className="text-slate-400 font-bold">ছবি দিন</p>}
            <input type="file" ref={fileInputRef} className="hidden" onChange={handleScan} accept="image/*" />
          </div>
          <button onClick={() => fileInputRef.current?.click()} disabled={isLoading} className="w-full bg-emerald-600 text-white py-6 rounded-[2.2rem] font-black text-lg shadow-xl">ছবি নির্বাচন করুন</button>
        </div>
        <div className="flex flex-col">
          {isLoading ? <div className="flex-1 bg-slate-50 rounded-[3rem] flex flex-col items-center justify-center space-y-4"><div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin"></div><p className="font-black text-slate-400 uppercase text-xs">Analyzing Specimen...</p></div> : report ? <div className="flex-1 bg-slate-900 rounded-[3rem] p-10 text-white prose prose-invert max-w-none whitespace-pre-wrap leading-relaxed">{report}</div> : <div className="flex-1 border-4 border-dashed rounded-[3rem] opacity-30"></div>}
        </div>
      </div>
    </div>
  );
};

const Encyclopedia = ({ lang }: any) => {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { playSpeech } = useSpeech();

  const handleSearch = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const prompt = `Define and detail: ${query}. Focus on official agricultural context.`;
      const qwenRes = await queryQwenVL(prompt, undefined, lang);
      if (qwenRes) {
        setResult(qwenRes);
        playSpeech(qwenRes);
      } else {
        const data = await searchEncyclopedia(query, lang);
        setResult(data.text);
        if (data.text) playSpeech(data.text);
      }
    } catch (e) { alert("Search failed."); } finally { setIsLoading(false); }
  };

  return (
    <div className="bg-white rounded-[4rem] p-10 md:p-16 shadow-2xl animate-fade-in border">
      <div className="text-center mb-12"><h2 className="text-3xl font-black text-slate-800">এআই এনসাইক্লোপিডিয়া</h2></div>
      <div className="flex gap-3 mb-12">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="টার্ম খুঁজুন..." className="flex-1 bg-slate-50 border-2 rounded-[2rem] px-8 py-5 font-bold outline-none" onKeyDown={(e) => e.key === 'Enter' && handleSearch()} />
        <button onClick={handleSearch} disabled={isLoading} className="bg-indigo-600 text-white px-10 rounded-[2rem] font-black">{isLoading ? '...' : 'খুঁজুন'}</button>
      </div>
      {result && <div className="bg-slate-50 rounded-[3rem] p-10 border relative animate-fade-in-up prose prose-slate max-w-none whitespace-pre-wrap text-lg leading-relaxed">{result}</div>}
    </div>
  );
};

const QuizModule = ({ onComplete, lang }: any) => {
  const [questions, setQuestions] = useState<AgriQuizQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);

  const startQuiz = async (selectedTopic: string) => {
    setIsLoading(true);
    try {
      const data = await generateAgriQuiz(selectedTopic, lang);
      setQuestions(data);
    } catch (e) { alert("Quiz generation failed."); }
    finally { setIsLoading(false); }
  };

  const handleAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (idx === questions[currentIndex].correctAnswer) setScore(s => s + 1);
  };

  if (isLoading) return <div className="bg-white p-24 text-center rounded-[4rem]">প্রস্তুত হচ্ছে...</div>;

  if (!questions.length && !isFinished) return (
    <div className="bg-white p-12 rounded-[4rem] shadow-2xl text-center">
      <h2 className="text-3xl font-black mb-8">কুইজ বিষয় নির্বাচন করুন</h2>
      <div className="grid grid-cols-2 gap-4">
        {['ধান চাষ', 'মৃত্তিকা পুষ্টি', 'জৈবিক দমন', 'স্মার্ট প্রযুক্তি'].map(t => (
          <button key={t} onClick={() => startQuiz(t)} className="p-6 bg-slate-50 border-2 rounded-3xl font-black hover:border-blue-500 transition-all">{t}</button>
        ))}
      </div>
    </div>
  );

  const q = questions[currentIndex];

  return (
    <div className="bg-white rounded-[4rem] p-10 md:p-16 shadow-2xl border animate-fade-in">
      <h3 className="text-3xl font-black text-slate-800 leading-tight mb-12">"{q.question}"</h3>
      <div className="grid grid-cols-1 gap-4 mb-10">
        {q.options.map((opt, i) => (
          <button key={i} onClick={() => handleAnswer(i)} className={`text-left p-6 rounded-[2rem] border-2 font-black transition-all ${selectedAnswer === null ? 'bg-slate-50' : i === q.correctAnswer ? 'bg-emerald-50 border-emerald-500' : 'bg-rose-50 border-rose-500 opacity-50'}`}>{opt}</button>
        ))}
      </div>
      {selectedAnswer !== null && (
        <button onClick={() => currentIndex < questions.length - 1 ? (setCurrentIndex(prev => prev + 1), setSelectedAnswer(null)) : (setIsFinished(true), onComplete(score * 20))} className="w-full bg-slate-900 text-white py-6 rounded-[2.2rem] font-black">পরবর্তী প্রশ্ন</button>
      )}
    </div>
  );
};

export default LearningCenter;
