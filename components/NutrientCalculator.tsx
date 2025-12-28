import React, { useState, useRef, useEffect } from 'react';
import { detectCurrentAEZDetails } from '../services/locationService';
import { getAIPlantNutrientAdvice } from '../services/geminiService';
import { CROPS_BY_CATEGORY } from '../constants';
import { User, SavedReport } from '../types';
import ShareDialog from './ShareDialog';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';

interface NutrientCalculatorProps {
  user?: User;
  onBack?: () => void;
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
}

const NUTRIENT_TOUR: TourStep[] = [
  {
    title: "সার ক্যালকুলেটর",
    content: "সঠিক পরিমাণে সার প্রয়োগ করে চাষের খরচ কমান এবং পরিবেশ রক্ষা করুন।",
    position: 'center'
  },
  {
    targetId: "nutrient-form-container",
    title: "তথ্য প্রদান",
    content: "আপনার ফসল, জমির মাপ এবং মাটি পরীক্ষা (ঐচ্ছিক) এর তথ্য দিন।",
    position: 'bottom'
  },
  {
    targetId: "nutrient-aez-info",
    title: "অঞ্চল ভিত্তিক পরামর্শ",
    content: "আপনার এলাকার জন্য বিএআরসি (BARC) নির্ধারিত মান অনুযায়ী পরামর্শ পেতে লোকেশন বাটনটি ব্যবহার করুন।",
    position: 'top'
  }
];

const nutrientLoadingSteps = [
  "সার সুপারিশমালা তৈরি হচ্ছে...",
  "মাটি ও ফসলের সমন্বয় হচ্ছে...",
  "পরিমাণ গণনা চলছে..."
];

const NutrientCalculator: React.FC<NutrientCalculatorProps> = ({ user, onBack, onAction, onSaveReport, onShowFeedback }) => {
  const [crop, setCrop] = useState('ধান');
  const [aez, setAez] = useState('AEZ 1: Old Himalayan Piedmont Plain');
  const [soil, setSoil] = useState('মাঝারি উর্বরতা');
  const [unit, setUnit] = useState<'bigha' | 'decimal'>('bigha');
  const [areaSize, setAreaSize] = useState<number>(33);
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [activeListeningId, setActiveListeningId] = useState<string | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const { playSpeech, stopSpeech, isSpeaking, speechEnabled } = useSpeech();

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_nutrient');
    if (!tourDone) setShowTour(true);
  }, []);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (activeListeningId === 'crop') {
          const allCrops = Object.values(CROPS_BY_CATEGORY).flat();
          const found = allCrops.find(c => transcript.includes(c));
          if (found) setCrop(found);
        } else if (activeListeningId === 'areaSize') {
          const num = parseFloat(transcript.replace(/[^0-9.]/g, ''));
          if (!isNaN(num)) setAreaSize(num);
        }
      };
      recognitionRef.current.onerror = () => { setIsListening(false); setActiveListeningId(null); };
      recognitionRef.current.onend = () => { setIsListening(false); setActiveListeningId(null); };
    }
  }, [activeListeningId]);

  const toggleListening = (id: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListening && activeListeningId === id) recognitionRef.current.stop();
    else { setActiveListeningId(id); recognitionRef.current.start(); }
  };

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % nutrientLoadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleDetectAEZ = async () => {
    setIsDetecting(true);
    try {
      const detected = await detectCurrentAEZDetails(true);
      setAez(`AEZ ${detected.id}: ${detected.name}`);
    } catch (error) { alert('লোকেশন পাওয়া যায়নি।'); } finally { setIsDetecting(false); }
  };

  const calculateNutrientsAI = async () => {
    setIsLoading(true); setAdvice(null); setLoadingStep(0);
    try {
      const result = await getAIPlantNutrientAdvice(crop, aez, soil, areaSize, unit, user?.progress.rank || 'নবিশ কৃষক');
      setAdvice(result);
      if (speechEnabled && result) playSpeech(result);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (error) { alert("পরামর্শ তৈরি করতে সমস্যা হয়েছে।"); } finally { setIsLoading(false); }
  };

  const handleSave = () => {
    if (advice && onSaveReport) {
      onSaveReport({ type: 'Fertilizer', title: `${crop} - সার সুপারিশমালা`, content: advice, icon: '⚖️' });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-gray-50 min-h-screen pb-32 font-sans">
      {showTour && <GuidedTour steps={NUTRIENT_TOUR} tourKey="nutrient" onClose={() => setShowTour(false)} />}
      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="সার সুপারিশমালা রিপোর্ট" content={advice || ""} />}
      
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-[#0A8A1F] hover:text-white transition-all active:scale-90"><svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <div>
            <h1 className="text-2xl font-black text-gray-800 leading-tight">সার সুপারিশমালা (BARC)</h1>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-1">Official Digital Fertilizer Recommendation Hub</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div id="nutrient-form-container" className="bg-white rounded-[3rem] p-8 shadow-xl border border-gray-100 space-y-6 relative overflow-hidden">
          <div className="space-y-4 relative z-10">
            <div>
              <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">ফসলের নাম</label><button onClick={() => toggleListening('crop')} className={`p-2 rounded-xl transition-all ${isListening && activeListeningId === 'crop' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`} title="Crop Name Search"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div>
              <select value={crop} onChange={(e) => setCrop(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#0A8A1F] focus:outline-none font-bold text-gray-800 shadow-inner">
                {Object.values(CROPS_BY_CATEGORY).flat().map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
               <div className="flex justify-between items-center mb-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 block">জমির পরিমাণ ({unit === 'bigha' ? 'বিঘা' : 'শতাংশ'})</label><button onClick={() => toggleListening('areaSize')} className={`p-2 rounded-xl transition-all ${isListening && activeListeningId === 'areaSize' ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`} title="Area Size Input"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div>
               <div className="flex gap-2">
                  <input type="number" value={areaSize} onChange={(e) => setAreaSize(parseFloat(e.target.value))} className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl py-4 px-5 focus:ring-2 focus:ring-[#0A8A1F] focus:outline-none font-bold text-gray-800 shadow-inner" />
                  <div className="flex bg-slate-100 p-1 rounded-2xl"><button onClick={() => setUnit('bigha')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${unit === 'bigha' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>বিঘা</button><button onClick={() => setUnit('decimal')} className={`px-4 py-2 text-[10px] font-black uppercase rounded-xl transition-all ${unit === 'decimal' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>শতাংশ</button></div>
               </div>
            </div>
            <div id="nutrient-aez-info"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 mb-2 block">অঞ্চল (AEZ)</label><div className="flex gap-2"><input type="text" readOnly value={aez} className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-500 shadow-inner" /><button onClick={handleDetectAEZ} disabled={isDetecting} className="bg-blue-50 text-blue-600 px-6 rounded-2xl border border-blue-100 active:scale-95 transition flex items-center justify-center"><span>{isDetecting ? '...' : '📍'}</span></button></div></div>
            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex items-center space-x-3"><div className="text-xl">📜</div><p className="text-[9px] font-black text-blue-700 uppercase leading-relaxed">এটি BARC Fertilizer Recommendation Guide-2024 এর বিজ্ঞানভিত্তিক প্রোটোকল অনুসরণ করে।</p></div>
            <button onClick={calculateNutrientsAI} disabled={isLoading} className="w-full bg-[#0A8A1F] text-white font-black py-6 rounded-[2rem] shadow-2xl transition-all active:scale-95 flex justify-center items-center text-xl">{isLoading ? 'প্রসেস হচ্ছে...' : 'পরামর্শ জেনারেট করুন'}</button>
          </div>
        </div>

        <div className="flex flex-col space-y-6 min-h-[400px]">
          {isLoading ? (
            <div className="bg-white rounded-[3rem] p-12 text-center shadow-xl border border-slate-100 flex flex-col items-center justify-center space-y-8 animate-fade-in h-full"><div className="relative w-24 h-24"><div className="absolute inset-0 border-4 border-green-100 rounded-full"></div><div className="absolute inset-0 border-4 border-[#0A8A1F] border-t-transparent rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center text-3xl">⚖️</div></div><div><h3 className="text-xl font-black text-slate-800">{nutrientLoadingSteps[loadingStep % nutrientLoadingSteps.length]}</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Connecting to BARC-2024 Advisory System</p></div></div>
          ) : advice ? (
            <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl animate-fade-in relative overflow-hidden flex-1 border-4 border-emerald-500/30">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl"></div>
              <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-4 relative z-10">
                <div><h3 className="text-xl font-black tracking-tight">অ্যাডভাইজরি রিপোর্ট</h3><div className="flex gap-2 mt-1"><span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">Official BARC-2024</span><span className="bg-blue-600 text-white px-2 py-0.5 rounded text-[7px] font-black uppercase">Verified Logic</span></div></div>
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setIsShareOpen(true)} className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 shadow-xl border border-white/10" title="শেয়ার করুন"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg></button>
                    <button onClick={() => playSpeech(advice)} className={`p-4 rounded-full shadow-2xl transition-all ${isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-emerald-600'}`}>{isSpeaking ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>}</button>
                  </div>
                  <button onClick={handleSave} className="w-full bg-white/10 hover:bg-white/20 text-white py-2 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center space-x-2 border border-white/10"><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 5h14m-14 0v14l7-7 7 7V5m-14 0h14" /></svg><span>সেভ করুন</span></button>
                </div>
              </div>
              <div className="prose prose-invert max-w-none font-medium leading-relaxed whitespace-pre-wrap text-slate-300 first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-emerald-500">{advice}</div>
            </div>
          ) : (
            <div className="bg-gray-100 rounded-[3rem] p-12 border-4 border-dashed border-gray-200 flex flex-col items-center justify-center text-center space-y-6 h-full opacity-60"><span className="text-6xl">⚖️</span><p className="font-black text-gray-400">রিপোর্ট জেনারেট করতে বাম পাশের তথ্যগুলো পূরণ করুন</p></div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NutrientCalculator;