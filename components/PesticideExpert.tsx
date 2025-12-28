import React, { useState, useEffect, useRef } from 'react';
import { 
  getPesticideExpertAdvice, 
  analyzePesticideMixing, 
  getPesticideRotationAdvice,
  generateSpeech, 
  decodeBase64, 
  decodeAudioData, 
  getLiveWeather
} from '../services/geminiService';
import { View, GroundingChunk, WeatherData } from '../types';
import { getStoredLocation } from '../services/locationService';
import { VideoGenerator } from './VideoGenerator';
import { shareContent } from '../services/shareService';
import GuidedTour, { TourStep } from './GuidedTour';

interface PesticideExpertProps {
  onNavigate: (view: View) => void;
  onBack?: () => void;
  onAction?: () => void;
  onSaveReport?: (report: any) => void;
  onShowFeedback?: () => void;
}

const PESTICIDE_TOUR: TourStep[] = [
  {
    title: "বালাইনাশক বিশেষজ্ঞ",
    content: "নিরাপদভাবে ঔষধ প্রয়োগ এবং পোকামাকড়ের প্রতিরোধ ক্ষমতা মোকাবিলা করতে এই টুলটি ব্যবহার করুন।",
    position: 'center'
  },
  {
    targetId: "pesticide-tabs",
    title: "টুলস মেনু",
    content: "রোটেশন গাইড, মিক্সিং সামঞ্জস্যতা এবং WALES মেথড এর মধ্যে সুইচ করুন।",
    position: 'bottom'
  },
  {
    targetId: "pesticide-search-box",
    title: "তথ্য অনুসন্ধান",
    content: "যেকোনো বালাইনাশকের নাম বা রোগের নাম লিখে বিস্তারিত গাইডলাইন পান।",
    position: 'top'
  }
];

const quickLinks = [
  { name: 'মাজরা পোকা', icon: '🐛' },
  { name: 'ম্যানকোজেব', icon: '🧪' },
  { name: 'লেট ব্লাইট', icon: '🥔' },
  { name: 'ব্লাস্ট রোগ', icon: '🌾' },
  { name: 'ইউরিয়া', icon: '⚖️' },
  { name: 'জৈবিক দমন', icon: '🐞' }
];

const WALES_STEPS = [ 
  { letter: 'W', label: 'Wettable Powders', color: 'bg-sky-400', text: 'text-sky-600', bg: 'bg-sky-50', bangla: 'দানাদার ঔষধ (WP, WDG)', desc: 'প্রথমে দানাদার বা পাউডার জাতীয় ঔষধ পানিতে দিন। এগুলো গুলতে সময় নেয় তাই প্রথমে মেশানো জরুরি।', icon: '❄️', jarClass: 'h-[20%] bg-sky-200/60 bottom-0' }, 
  { letter: 'A', label: 'Agitate', color: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50', bangla: 'ভালোভাবে মিশানো (Agitate)', desc: 'পাউডারগুলো পানির সাথে সম্পূর্ণ না মিশে যাওয়া পর্যন্ত লাঠি বা অন্য কিছু দিয়ে ভালো করে নাড়াচাড়া করুন।', icon: '🌀', jarClass: 'animate-pulse' }, 
  { letter: 'L', label: 'Liquid Flowables', color: 'bg-emerald-400', text: 'text-emerald-600', bg: 'bg-emerald-50', bangla: 'তরল সাসপেনশন (SC, F)', desc: 'এরপর তরল ফ্লোয়েবল বা সাসপেনশন (SC/F) জাতীয় ঔষধ যোগ করুন। এটি পানির ঘনত্ব বাড়াবে।', icon: '🧪', jarClass: 'h-[45%] bg-emerald-300/40 bottom-0' }, 
  { letter: 'E', label: 'Emulsifiable', color: 'bg-rose-400', text: 'text-rose-600', bg: 'bg-rose-50', bangla: 'ইমালসিফাইবল (EC)', desc: 'এখন ইমালসিফাইবল কনসেন্ট্রেট (EC) জাতীয় ঔষধগুলো মিশান। এটি তেলের মতো পানিতে মিশে সাদা রঙ ধারণ করবে।', icon: '🧴', jarClass: 'h-[70%] bg-rose-200/50 bottom-0' }, 
  { letter: 'S', label: 'Surfactants', color: 'bg-purple-400', text: 'text-purple-600', bg: 'bg-purple-50', bangla: 'আঠা বা স্টিকার (Surfactants)', desc: 'সবশেষে সারফ্যাক্ট্যান্ট, আঠা বা স্টিকার যোগ করুন। এটি পাতায় ঔষধ লেগে থাকতে সাহায্য করবে।', icon: '💧', jarClass: 'h-[85%] bg-purple-200/40 bottom-0' }, 
];

const MixingBeaker: React.FC<{ stepIdx: number }> = ({ stepIdx }) => {
  const isAgitating = stepIdx === 1;
  return (
    <div className="relative w-48 h-64 mx-auto">
      <div className="absolute inset-0 border-x-4 border-b-4 border-slate-300 rounded-b-3xl z-20 pointer-events-none"></div>
      <div className="absolute top-0 left-0 right-0 h-4 border-t-4 border-slate-300 rounded-t-full z-20 opacity-30"></div>
      <div className="absolute bottom-0 left-1 right-1 h-[95%] bg-blue-50/50 z-0 rounded-b-2xl"></div>
      <div className={`absolute left-1 right-1 bottom-0 transition-all duration-1000 ease-in-out rounded-b-2xl ${stepIdx >= 0 ? 'h-[25%] bg-sky-200/70 border-t border-sky-300' : 'h-0'}`}></div>
      <div className={`absolute left-1 right-1 bottom-0 transition-all duration-1000 ease-in-out rounded-b-2xl ${stepIdx >= 2 ? 'h-[50%] bg-emerald-200/60 border-t border-emerald-300' : 'h-0'}`}></div>
      <div className={`absolute left-1 right-1 bottom-0 transition-all duration-1000 ease-in-out rounded-b-2xl ${stepIdx >= 3 ? 'h-[75%] bg-rose-100/60 border-t border-rose-300' : 'h-0'}`}></div>
      <div className={`absolute left-1 right-1 bottom-0 transition-all duration-1000 ease-in-out rounded-b-2xl ${stepIdx >= 4 ? 'h-[88%] bg-purple-100/50 border-t border-purple-300' : 'h-0'}`}>
        {stepIdx >= 4 && (
          <div className="absolute top-0 left-0 right-0 h-4 overflow-hidden">
            <div className="flex space-x-2 animate-bounce">
              {[1,2,3,4,5,6].map(i => <div key={i} className="w-2 bg-white rounded-full opacity-60"></div>)}
            </div>
          </div>
        )}
      </div>
      {isAgitating && (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
          <div className="w-32 h-32 border-4 border-dashed border-amber-400 rounded-full animate-[spin_3s_linear_infinite] opacity-60"></div>
          <div className="absolute text-4xl animate-pulse">🌀</div>
        </div>
      )}
      <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between py-8 pl-1 z-30">
        {[100, 75, 50, 25].map(m => <div key={m} className="w-2 h-0.5 bg-slate-300"></div>)}
      </div>
    </div>
  );
};

const loadingMessages = [ 
  "বালাইনাশক ডাটাবেস অনুসন্ধান করা হচ্ছে...", 
  "রাসায়নিক উপাদানের (Active Ingredients) সক্রিয়তা যাচাই চলছে...", 
  "মিক্সিং সামঞ্জস্যতা ও রিয়্যাকশন ঝুঁকি বিশ্লেষণ হচ্ছে...", 
  "বর্তমান আবহাওয়ায় স্প্রে করার নিরাপত্তা পরীক্ষা চলছে...",
  "বিশেষজ্ঞ রিপোর্ট ও রোটেশন গাইড চূড়ান্ত হচ্ছে..."
];

const PesticideExpert: React.FC<PesticideExpertProps> = ({ onNavigate, onBack, onAction, onSaveReport, onShowFeedback }) => {
  const [activeTab, setActiveTab] = useState<'search' | 'rotation' | 'mixing_guide' | 'compatibility'>('search');
  const [query, setQuery] = useState('');
  const [rotationQuery, setRotationQuery] = useState('');
  const [advice, setAdvice] = useState<{ text: string, groundingChunks: GroundingChunk[], compatibility?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  const [videoModal, setVideoModal] = useState<{ open: boolean, prompt: string, title: string }>({ open: false, prompt: '', title: '' });
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [showTour, setShowTour] = useState(false);
  
  // Mix Compatibility States
  const [mixItems, setMixItems] = useState<{ id: number, data: string | null, text: string, mimeType: string }[]>([
    { id: 1, data: null, text: '', mimeType: 'image/jpeg' },
    { id: 2, data: null, text: '', mimeType: 'image/jpeg' }
  ]);
  const [walesStepIdx, setWalesStepIdx] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_pesticide');
    if (!tourDone) setShowTour(true);

    const loadWeather = async () => {
      const loc = getStoredLocation();
      if (loc) {
        try {
          const data = await getLiveWeather(loc.lat, loc.lng);
          setWeather(data);
        } catch (e) {}
      }
    };
    loadWeather();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (activeTab === 'search') {
          setQuery(prev => prev + ' ' + transcript);
        } else if (activeTab === 'rotation') {
          setRotationQuery(prev => prev + ' ' + transcript);
        }
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, [activeTab]);

  const toggleListening = (targetId?: number) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট আপনার ব্রাউজারে সমর্থিত নয়।");
    
    if (targetId !== undefined) {
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const newMix = [...mixItems];
        const idx = newMix.findIndex(i => i.id === targetId);
        if (idx !== -1) {
          newMix[idx].text += ' ' + transcript;
          setMixItems(newMix);
        }
      };
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  useEffect(() => {
    let interval: any;
    if (isLoading) { 
      interval = setInterval(() => { 
        setLoadingStep(prev => (prev + 1) % loadingMessages.length); 
      }, 2500); 
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleShare = async () => {
    if (!advice) return;
    const res = await shareContent("রাসায়নিক ও বালাই অ্যাডভাইজরি", advice.text);
    if (res.method === 'clipboard') {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const handleSearchSubmit = async (searchQuery?: string) => {
    const textToSearch = searchQuery || query;
    if (!textToSearch.trim()) return;
    setIsLoading(true);
    setAdvice(null);
    setLoadingStep(0);

    if (!audioContextRef.current) { 
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); 
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    try {
      const prompt = `আপনি একজন বালাইনাশক ও শস্য সুরক্ষা বিশেষজ্ঞ। '${textToSearch}' সম্পর্কে বিস্তারিত জানান। স্প্রে করার সময়, ফ্রিকোয়েন্সি এবং রোটেশন (MoA Groups) এর ওপর বিশেষ জোর দিন।`;
      const result = await getPesticideExpertAdvice(prompt);
      setAdvice(result);
      if (result.text) playTTS(result.text);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (err) { 
      alert("তথ্য সংগ্রহ করতে সমস্যা হয়েছে।"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleRotationSubmit = async () => {
    if (!rotationQuery.trim()) return;
    setIsLoading(true);
    setAdvice(null);
    setLoadingStep(0);

    if (!audioContextRef.current) { 
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); 
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    try {
      const result = await getPesticideRotationAdvice(rotationQuery);
      setAdvice(result);
      if (result.text) playTTS(result.text);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (err) { 
      alert("রোটেশন গাইড তৈরিতে সমস্যা হয়েছে।"); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleMixingSubmit = async () => {
    const hasData = mixItems.some(i => i.data || i.text.trim());
    if (!hasData) return alert("কমপক্ষে একটি বালাইনাশকের তথ্য বা ছবি দিন।");
    
    setIsLoading(true);
    setAdvice(null);
    setLoadingStep(0);

    if (!audioContextRef.current) { 
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); 
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    try {
      const items = mixItems
        .filter(i => i.data || i.text.trim())
        .map(i => ({ data: i.data || '', mimeType: i.mimeType, text: i.text }));
      
      const result = await analyzePesticideMixing(items, weather || undefined);
      setAdvice({ text: result.text, groundingChunks: result.groundingChunks, compatibility: result.compatibility });
      if (result.text) playTTS(result.text);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (err) {
      alert("মিক্সিং বিশ্লেষণে সমস্যা হয়েছে।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = (reader.result as string).split(',')[1];
        const newMix = [...mixItems];
        newMix[idx].data = base64;
        newMix[idx].mimeType = file.type;
        setMixItems(newMix);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateMixText = (idx: number, val: string) => {
    const newMix = [...mixItems];
    newMix[idx].text = val;
    setMixItems(newMix);
  };

  const playTTS = async (textOverride?: string) => {
    const textToSpeak = textOverride || advice?.text;
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
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (error) { 
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

  const handleSaveReport = () => {
    if (advice && onSaveReport) {
      onSaveReport({
        type: 'Pesticide Expert',
        title: query || rotationQuery || 'বালাইনাশক বিশেষজ্ঞ রিপোর্ট',
        content: advice.text,
        icon: '🧪'
      });
      alert("রিপোর্টটি প্রোফাইলে সংরক্ষণ করা হয়েছে।");
    }
  };

  const currentWales = WALES_STEPS[walesStepIdx];

  const TooltipGuide = ({ text }: { text: string }) => (
    <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl mb-6 animate-fade-in flex items-start space-x-3">
       <div className="text-xl shrink-0">💡</div>
       <p className="text-[11px] font-bold text-emerald-800 leading-relaxed italic">{text}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 bg-slate-50 min-h-screen pb-24 font-sans text-slate-900">
      {showTour && <GuidedTour steps={PESTICIDE_TOUR} tourKey="pesticide" onClose={() => setShowTour(false)} />}
      {videoModal.open && <VideoGenerator prompt={videoModal.prompt} title={videoModal.title} onClose={() => setVideoModal({ ...videoModal, open: false })} />}
      
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-[#0A8A1F] hover:text-white transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight leading-none">রোগ ও বালাইনাশক বিশেষজ্ঞ</h1>
          <p className="text-[10px] font-black text-rose-600 uppercase tracking-widest bg-rose-50 px-2 py-0.5 rounded-full inline-block border border-rose-100 mt-2">Integrated Chemical & Spray Advisor</p>
        </div>
      </div>

      <div id="pesticide-tabs" className="flex bg-white p-1.5 rounded-[2rem] shadow-sm mb-8 border border-slate-200 overflow-x-auto scrollbar-hide">
        <button onClick={() => { setActiveTab('search'); stopTTS(); }} className={`flex-1 min-w-[100px] px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'search' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-500'}`}>সার্চ</button>
        <button onClick={() => { setActiveTab('rotation'); stopTTS(); }} className={`flex-1 min-w-[100px] px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'rotation' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-500'}`}>রোটেশন (IRAC/FRAC)</button>
        <button onClick={() => { setActiveTab('compatibility'); stopTTS(); }} className={`flex-1 min-w-[100px] px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'compatibility' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-500'}`}>সামঞ্জস্যতা (Mixing)</button>
        <button onClick={() => { setActiveTab('mixing_guide'); stopTTS(); }} className={`flex-1 min-w-[100px] px-4 py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeTab === 'mixing_guide' ? 'bg-rose-600 text-white shadow-xl' : 'text-slate-500'}`}>WALES মেথড</button>
      </div>

      {activeTab === 'search' && (
        <div className="space-y-8 animate-fade-in">
          <TooltipGuide text="যেকোনো বালাইনাশকের সক্রিয় উপাদানের নাম (যেমন: কার্বেন্ডাজিম) লিখে সার্চ করুন। এআই আপনাকে এর কাজ করার পদ্ধতি এবং সঠিক ডোজ জানাবে।" />
          <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-rose-50 rounded-full -mr-16 -mt-16 opacity-40"></div>
             <div id="pesticide-search-box" className="flex flex-col md:flex-row gap-4 mb-10 relative z-10">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={query} 
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="নাম বা সক্রিয় উপাদান (যেমন: মাজরা পোকা, ম্যানকোজেব...)" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 pr-12 font-bold text-slate-700 focus:outline-none focus:border-rose-600 shadow-inner transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                  />
                  <button 
                    onClick={() => toggleListening()}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-rose-50'}`}
                    title="ভয়েস ইনপুট"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </button>
                </div>
                <button onClick={() => handleSearchSubmit()} disabled={isLoading} className="bg-rose-600 text-white font-black px-10 py-5 rounded-2xl shadow-xl active:scale-95 transition-all disabled:bg-slate-300">বিশ্লেষণ করুন</button>
             </div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                {quickLinks.map(link => (
                  <button key={link.name} onClick={() => { setQuery(link.name); handleSearchSubmit(link.name); }} className="bg-slate-50 hover:bg-rose-50 border border-slate-100 p-3 rounded-2xl transition-all flex flex-col items-center group active:scale-90">
                    <span className="text-xl mb-1">{link.icon}</span>
                    <span className="text-[8px] font-black text-slate-600 group-hover:text-rose-600 text-center">{link.name}</span>
                  </button>
                ))}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'rotation' && (
        <div className="space-y-8 animate-fade-in">
          <TooltipGuide text="পোকামাকড় বা ছত্রাক যাতে ঔষধের বিরুদ্ধে প্রতিরোধ ক্ষমতা (Resistance) গড়ে তুলতে না পারে সেজন্য ভিন্ন ভিন্ন গ্রুপের বালাইনাশক পর্যায়ক্রমে ব্যবহার করতে হয়।" />
          <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-40"></div>
             <div className="flex flex-col md:flex-row gap-4 mb-6 relative z-10">
                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    value={rotationQuery} 
                    onChange={(e) => setRotationQuery(e.target.value)}
                    placeholder="ঔষধের নাম (যেমন: অ্যাবামেকটিন, সাইপারমেথ্রিন...)" 
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 px-6 pr-12 font-bold text-slate-700 focus:outline-none focus:border-blue-600 shadow-inner transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleRotationSubmit()}
                  />
                  <button 
                    onClick={() => toggleListening()}
                    className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                    title="ভয়েস ইনপুট"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                  </button>
                </div>
                <button onClick={handleRotationSubmit} disabled={isLoading} className="bg-slate-900 text-white font-black px-10 py-5 rounded-2xl shadow-xl active:scale-95 transition-all disabled:bg-slate-300">গ্রুপ ও রোটেশন দেখুন</button>
             </div>
             <div className="flex items-center space-x-2 text-[10px] font-black uppercase text-slate-400">
                <span className="bg-blue-100 text-blue-600 px-2 py-0.5 rounded">IRAC</span>
                <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded">FRAC</span>
                <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded">HRAC</span>
                <span>Standards Active</span>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'compatibility' && (
        <div className="space-y-8 animate-fade-in">
          <TooltipGuide text="দুই বা ততোধিক বালাইনাশক একত্রে মেশানো যাবে কি না তা নিশ্চিত হতে লেবেলের ছবি তুলুন অথবা নাম লিখুন। এআই রাসায়নিক প্রতিক্রিয়া বিশ্লেষণ করবে।" />
          <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100">
             <div className="text-center mb-8">
                <h2 className="text-xl font-black text-slate-800 tracking-tight">মিক্সিং সামঞ্জস্যতা চেক</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Check Safety of Mixing Multiple Products</p>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
                {mixItems.map((item, idx) => (
                  <div key={item.id} className="bg-slate-50 rounded-[2.5rem] p-6 border-2 border-slate-100 relative group overflow-hidden">
                     <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">বালাইনাশক {item.id}</span>
                        <div className="flex space-x-2">
                           <button onClick={() => fileInputRefs.current[idx]?.click()} className="p-2 bg-white rounded-lg shadow-sm text-rose-600 hover:bg-rose-50 transition-all" title="ছবি/QR স্ক্যান">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                           </button>
                           <button onClick={() => toggleListening(item.id)} className={`p-2 rounded-lg shadow-sm transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-rose-600 hover:bg-rose-50'}`} title="ভয়েস ইনপুট">
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                           </button>
                        </div>
                     </div>
                     <input type="file" ref={el => { fileInputRefs.current[idx] = el; }} className="hidden" accept="image/*" onChange={(e) => handleFileChange(idx, e)} />
                     
                     {item.data ? (
                       <div className="relative h-40 w-full mb-4 rounded-2xl overflow-hidden border border-slate-200">
                          <img src={`data:${item.mimeType};base64,${item.data}`} className="w-full h-full object-cover" alt="Label" />
                          <button onClick={() => { const n = [...mixItems]; n[idx].data = null; setMixItems(n); }} className="absolute top-2 right-2 p-1.5 bg-rose-500 text-white rounded-full shadow-lg">✕</button>
                       </div>
                     ) : (
                       <textarea 
                        value={item.text}
                        onChange={(e) => updateMixText(idx, e.target.value)}
                        placeholder="পণ্যের নাম বা লেবেল থেকে পড়া টেক্সট এখানে লিখুন..."
                        className="w-full h-40 bg-white border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 outline-none focus:border-rose-500 transition-all resize-none shadow-inner"
                       />
                     )}
                  </div>
                ))}
             </div>

             <button 
               onClick={handleMixingSubmit}
               disabled={isLoading}
               className="w-full bg-rose-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl active:scale-95 transition-all text-xl flex items-center justify-center space-x-3 disabled:bg-slate-300"
             >
                <span>নিরাপত্তা যাচাই করুন</span>
             </button>
          </div>
        </div>
      )}

      {activeTab === 'mixing_guide' && (
        <div className="space-y-8 animate-fade-in">
          <TooltipGuide text="WALES পদ্ধতি হলো বালাইনাশক মেশানোর একটি বৈজ্ঞানিক ক্রম। এটি অনুসরণ করলে ঔষধের গুণাগুণ বজায় থাকে এবং স্প্রে মেশিনে জট বাঁধে না।" />
          <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
             <div className="text-center mb-10">
                <h2 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">WALES মিক্সিং মেথড</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Scientific Multi-Pesticide Blending Sequence</p>
             </div>
             <div className="relative flex justify-between items-center max-w-lg mx-auto mb-16 px-4">
                <div className="absolute left-4 right-4 top-1/2 -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0">
                  <div className="h-full bg-slate-900 transition-all duration-700 rounded-full" style={{ width: `${(walesStepIdx / (WALES_STEPS.length - 1)) * 100}%` }} />
                </div>
                {WALES_STEPS.map((step, idx) => (
                  <button key={idx} onClick={() => setWalesStepIdx(idx)} className={`relative z-10 w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-all transform active:scale-95 ${idx <= walesStepIdx ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border-2 border-slate-100'} ${idx === walesStepIdx ? 'scale-125' : ''}`}>
                    {step.letter}
                  </button>
                ))}
             </div>
             <div className={`${currentWales.bg} rounded-[3rem] p-8 md:p-12 border-2 border-white shadow-inner animate-fade-in relative overflow-hidden min-h-[400px] flex flex-col lg:flex-row items-center gap-10`}>
                <div className="relative z-10 flex-shrink-0"><MixingBeaker stepIdx={walesStepIdx} /></div>
                <div className="relative z-10 text-center lg:text-left space-y-6 flex-1">
                   <div>
                     <p className={`text-[10px] font-black uppercase tracking-widest ${currentWales.text} mb-2`}>ধাপ {walesStepIdx + 1}: {currentWales.label}</p>
                     <h3 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-4">{currentWales.bangla}</h3>
                     <p className="text-lg font-medium text-slate-600 leading-relaxed">{currentWales.desc}</p>
                </div>
                   <div className="flex items-center justify-center lg:justify-start space-x-4 pt-4">
                      <button onClick={() => setWalesStepIdx(prev => Math.max(0, prev - 1))} disabled={walesStepIdx === 0} className={`p-4 rounded-2xl shadow-md active:scale-90 ${walesStepIdx === 0 ? 'bg-white/50 text-slate-300' : 'bg-white text-slate-600'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg></button>
                      <button onClick={() => setWalesStepIdx(prev => Math.min(WALES_STEPS.length - 1, prev + 1))} disabled={walesStepIdx === WALES_STEPS.length - 1} className="flex-1 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center space-x-2"><span>পরবর্তী ধাপ</span><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg></button>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="bg-white rounded-[3.5rem] p-16 md:p-24 shadow-2xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-10 mt-8 animate-fade-in relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50 rounded-full -mr-32 -mt-32 opacity-40"></div>
           <div className="relative w-32 h-32">
              <div className="absolute inset-0 border-[10px] border-rose-50 rounded-full"></div>
              <div className="absolute inset-0 border-[10px] border-rose-600 border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-5xl">🛡️</div>
           </div>
           <div className="max-w-md mx-auto">
             <h3 className="text-2xl md:text-3xl font-black text-slate-800 mb-4">{loadingStep < loadingMessages.length ? loadingMessages[loadingStep] : "বিশ্লেষণ চূড়ান্ত হচ্ছে..."}</h3>
             <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em] mt-2">Connecting to CABI & BARC Repositories</p>
           </div>
           <div className="w-full max-w-xs h-2 bg-slate-50 rounded-full overflow-hidden">
              <div className="h-full bg-rose-600 transition-all duration-1000" style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}></div>
           </div>
        </div>
      )}

      {advice && !isLoading && (
        <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl animate-fade-in border-t-[16px] border-rose-600 mt-8 relative overflow-hidden flex flex-col">
          {advice.compatibility && (
            <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[2rem] font-black text-[10px] uppercase tracking-widest text-white shadow-xl ${
              advice.compatibility === 'Safe' ? 'bg-emerald-600' : 
              advice.compatibility === 'Warning' ? 'bg-amber-500' : 'bg-rose-600'
            }`}>
               Status: {advice.compatibility}
            </div>
          )}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-8 border-b-2 border-slate-50 gap-8 relative z-10">
            <div className="flex items-center space-x-6">
               <div className="w-20 h-20 bg-rose-600 text-white rounded-[2rem] flex items-center justify-center text-4xl shadow-2xl">🛡️</div>
               <div>
                 <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">বিশেষজ্ঞ অ্যাডভাইজরি রিপোর্ট</h3>
                 <p className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.3em]">Official Source: DAE & BARC-2024</p>
               </div>
            </div>
            <div className="flex items-center space-x-3">
               <button onClick={handleShare} className="p-5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all active:scale-90" title="শেয়ার করুন">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
               </button>
               <button 
                onClick={() => playTTS()} 
                className={`p-6 rounded-full shadow-[0_15px_40px_rgba(225,29,72,0.3)] transition-all active:scale-90 relative overflow-hidden group ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                title="Voice Advisory"
              >
                 <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                 {isPlaying ? (
                   <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg>
                 ) : (
                   <svg className="w-8 h-8 relative z-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                 )}
                 {!isPlaying && (
                   <span className="absolute -top-1 -right-1 flex h-4 w-4">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500/80"></span>
                   </span>
                 )}
               </button>
               <button onClick={handleSaveReport} className="p-5 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all active:scale-90" title="সেভ করুন">
                  <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
               </button>
            </div>
          </div>
          
          <div className="flex-1 prose prose-slate max-w-none text-slate-800 whitespace-pre-wrap leading-[1.8] font-medium text-lg md:text-xl first-letter:text-7xl first-letter:font-black first-letter:text-rose-600 first-letter:float-left first-letter:mr-4 first-letter:leading-none">
            {advice.text}
          </div>

          {advice.groundingChunks && advice.groundingChunks.length > 0 && (
            <div className="mt-12 pt-8 border-t-2 border-dashed border-slate-100">
               <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">যাচাইকৃত তথ্যসূত্র:</h4>
               <div className="flex flex-wrap gap-2">
                 {advice.groundingChunks.map((chunk, idx) => chunk.web ? (
                   <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black border border-blue-100 hover:bg-blue-100 transition shadow-sm">
                     <svg className="w-3 h-3 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                     {chunk.web.title}
                   </a>
                 ) : null)}
               </div>
            </div>
          )}
        </div>
      )}

      {shareToast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-[10px] animate-fade-in z-[200]">📋 কপি করা হয়েছে!</div>}
    </div>
  );
};

export default PesticideExpert;
