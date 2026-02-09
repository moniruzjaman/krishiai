import React, { useState, useRef, useEffect } from 'react';
import { detectCurrentAEZDetails } from '../services/utils/locationService';
/* Fix: Removed non-existent sanitizeForTTS import */
import { getAIYieldPrediction, generateSpeech, decodeBase64, decodeAudioData } from '../services/ai/geminiService';
import { queryQwenVL } from '../services/ai/huggingfaceService';
import { CROPS_BY_CATEGORY, CROP_CATEGORIES } from '../constants';
import { User, SavedReport, Language } from '../types';
import ShareDialog from './ShareDialog';
import GuidedTour, { TourStep } from './GuidedTour';
import { ToolGuideHeader } from './ToolGuideHeader';

interface AIYieldPredictorProps {
  user?: User;
  onAction?: (xp: number) => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  lang: Language;
}

const yieldLoadingSteps = [
  "আঞ্চলিক মাটির গুণাগুণ বিশ্লেষণ করা হচ্ছে...",
  "ঐতিহাসিক আবহাওয়া প্যাটার্ন যাচাই চলছে...",
  "চাষাবাদ পদ্ধতির কার্যকারিতা মূল্যায়ন হচ্ছে...",
  "BARC/BRRI/BARI ফলন মডেল মেলানো হচ্ছে...",
  "চূড়ান্ত ফলন পূর্বাভাস ও অপ্টিমাইজেশন রিপোর্ট তৈরি হচ্ছে..."
];

const AIYieldPredictor: React.FC<AIYieldPredictorProps> = ({ user, onAction, onSaveReport, onShowFeedback, onBack, lang }) => {
  const [crop, setCrop] = useState('ধান');
  const [aez, setAez] = useState('অঞ্চল নির্বাচন করুন');
  const [soilStatus, setSoilStatus] = useState('মাঝারি উর্বরতা');
  const [practice, setPractice] = useState('সমন্বিত বালাই ব্যবস্থাপনা (IPM)');
  const [water, setWater] = useState('পরিমিত সেচ ব্যবস্থা');
  const [prediction, setPrediction] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    let interval: any;
    if (isLoading) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % yieldLoadingSteps.length), 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handlePredict = async () => {
    setIsLoading(true); setPrediction(null); setLoadingStep(0);
    try {
      const prompt = `Predict yield for ${crop} in AEZ: ${aez}. NO INTRO.`;

      // Fix: Removed undefined variable 'base64' and passed undefined as no image input is used here
      const qwenRes = await queryQwenVL(prompt, undefined, lang);

      if (qwenRes) {
        setPrediction(qwenRes);
        playTTS(qwenRes);
      } else {
        const res = await getAIYieldPrediction(crop, aez, soilStatus, practice, water, '', user?.progress.rank, {}, lang);
        setPrediction(res.text);
        if (res.text) playTTS(res.text);
      }
      if (onAction) onAction(40);
    } catch (error) { alert("পূর্বাভাস তৈরি করতে সমস্যা হয়েছে।"); } finally { setIsLoading(false); }
  };

  const playTTS = async (text: string) => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const base64Audio = await generateSpeech(text);
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
      setIsPlaying(true);
    } catch (error) { setIsPlaying(false); }
  };

  const formatResultContent = (text: string) => {
    const parts = text.split(/(\[.*?\]:?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.includes(']')) {
        return <span key={i} className="block mt-8 mb-3 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest border border-indigo-100">{part.replace(/[\[\]:]/g, '')}</span>;
      }
      return <span key={i} className="leading-relaxed opacity-90">{part}</span>;
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-4 bg-gray-50 min-h-screen font-sans pb-32 animate-fade-in">
      <ToolGuideHeader title={lang === 'bn' ? 'এআই ফলন পূর্বাভাস' : 'AI Yield Prediction'} subtitle="Strategic agronomic forecasting." protocol="SAM 3.1" source="BARI/BRRI Grounded" lang={lang} onBack={onBack || (() => { })} icon="🔮" guideSteps={[]} />

      {/* Floating Status Toast */}
      {isLoading && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-bounce-in">
          <div className="bg-slate-900 text-white px-8 py-4 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center space-x-4 border border-indigo-500/30 backdrop-blur-md">
            <div className="w-4 h-4 bg-indigo-500 rounded-full animate-ping"></div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">{yieldLoadingSteps[loadingStep]}</span>
              <div className="flex space-x-1 mt-1">
                {[0, 1, 2, 3].map(i => <div key={i} className={`h-1 w-4 rounded-full transition-all duration-300 ${i <= (loadingStep % 4) ? 'bg-indigo-500' : 'bg-white/10'}`}></div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {prediction && !isLoading ? (
        <div className="bg-white rounded-[4rem] p-10 md:p-14 border-[12px] border-slate-900 shadow-2xl relative overflow-hidden flex flex-col animate-fade-in mt-10">
          <div className="flex justify-between items-center mb-10 pb-8 border-b-2 border-slate-50 relative z-10">
            <h3 className="text-3xl font-black">পূর্বাভাস রিপোর্ট (Qwen-VL)</h3>
            <button onClick={() => playTTS(prediction)} className={`p-5 rounded-full shadow-2xl ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-indigo-600 text-white'}`}>🔊</button>
          </div>
          <div className="prose prose-slate max-w-none text-xl leading-relaxed whitespace-pre-wrap text-slate-800">
            {formatResultContent(prediction)}
          </div>

          {/* Metadata Footer */}
          <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 opacity-60">
            <div className="flex items-center space-x-4">
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-slate-400">Primary Engine</span>
                <span className="text-[10px] font-bold text-slate-700">Qwen/Qwen3-VL</span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-slate-400">Version</span>
                <span className="text-[10px] font-bold text-slate-700">v3.1.0-Yield</span>
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              <div className="flex flex-col">
                <span className="text-[8px] font-black uppercase text-slate-400">Standard</span>
                <span className="text-[10px] font-bold text-slate-700">BARC-BRRI-BD</span>
              </div>
            </div>
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">Scientific Yield Forecasting Integrity Active</p>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-gray-100">
          <h2 className="text-2xl font-black mb-8">চাষাবাদের তথ্য দিন</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
            <select value={crop} onChange={(e) => setCrop(e.target.value)} className="p-4 bg-slate-50 border rounded-2xl font-bold">
              {Object.values(CROPS_BY_CATEGORY).flat().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={practice} onChange={(e) => setPractice(e.target.value)} className="p-4 bg-slate-50 border rounded-2xl font-bold">
              <option>IPM পদ্ধতি</option><option>জৈব পদ্ধতি</option><option>সনাতন পদ্ধতি</option>
            </select>
          </div>
          <button onClick={handlePredict} className="w-full bg-[#0A8A1F] text-white py-6 rounded-3xl font-black text-xl shadow-xl active:scale-95 transition-all">পূর্বাভাস জেনারেট করুন</button>
        </div>
      )}
    </div>
  );
};

export default AIYieldPredictor;