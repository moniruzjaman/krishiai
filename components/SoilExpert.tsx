import React, { useState, useEffect, useRef, useMemo } from 'react';
import { performSoilHealthAudit } from '../services/geminiService';
import { detectCurrentAEZDetails, AEZInfo } from '../services/locationService';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { SavedReport } from '../types';
import ShareDialog from './ShareDialog';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';

interface SoilExpertProps {
  onAction?: () => void;
  onBack?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
}

const SOIL_EXPERT_TOUR: TourStep[] = [
  {
    title: "মৃত্তিকা বিশেষজ্ঞ",
    content: "আপনার জমির মাটির স্বাস্থ্য পরীক্ষা এবং উন্নতির উপায় জানতে এই টুলটি ব্যবহার করুন।",
    position: 'center'
  },
  {
    targetId: "soil-health-dashboard",
    title: "সমন্বিত ড্যাশবোর্ড",
    content: "এখানে আপনি একই সাথে আপনার এলাকার মাটির প্রোফাইল এবং ল্যাব রিপোর্টের পুষ্টি অডিট করতে পারবেন।",
    position: 'bottom'
  }
];

const textureSteps = [
  {
    id: 0,
    q: "ধাপ ১: বল পরীক্ষা (Ball Test)",
    instruction: "মুঠো ভরা মাটি নিয়ে সামান্য পানি মিশিয়ে বল তৈরির চেষ্টা করুন। বলটি কি তৈরি হচ্ছে?",
    image: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=400",
    options: [
      { l: "না, বল তৈরি হয় না / ভেঙে যাচ্ছে", res: "বেলে মাটি (Sandy Soil)", icon: "🏜️", desc: "এই মাটিতে বালির পরিমাণ বেশি। এটি খুব দ্রুত পানি শুষে নেয় এবং পুষ্টির অপচয় ঘটে।", management: "প্রচুর জৈব সার ও ভার্মিকম্পোস্ট ব্যবহার করুন। ঘন ঘন কিন্তু হালকা সেচ দিন।" },
      { l: "হ্যাঁ, বল তৈরি হচ্ছে", next: 1, icon: "🧶" }
    ]
  },
  {
    id: 1,
    q: "ধাপ ২: ফিতা পরীক্ষা (Ribbon Test)",
    instruction: "তৈরি করা বলটি বুড়ো আঙুল দিয়ে চেপে ফিতা (Ribbon) তৈরির চেষ্টা করুন। ফিতাটি কতটুকু লম্বা হয়?",
    image: "https://images.unsplash.com/photo-1464226184884-fa280b87c399?auto=format&fit=crop&q=80&w=400",
    options: [
      { l: "খুব ছোট বা ফিতা হয় না", res: "বেলে দোআঁশ (Loamy Sand)", icon: "🍂", desc: "এটি হালকা দোআঁশ মাটি। পানি ও পুষ্টি ধরে রাখার ক্ষমতা মাঝারি মানের।", management: "সবুজ সার (ধৈঞ্চা) চাষ করুন। পটাশ সারের ওপর গুরুত্ব দিন।" },
      { l: "২.৫ সেন্টিমিটারের চেয়ে ছোট", next: 2, icon: "📏" },
      { l: "২.৫ থেকে ৫ সেন্টিমিটার", next: 3, icon: "📏" },
      { l: "৫ সেন্টিমিটারের চেয়ে বড়", next: 4, icon: "📏" }
    ]
  },
  {
    id: 2,
    q: "ধাপ ৩: স্পর্শ অনুভূতি (Feel Test)",
    instruction: "মাটিটি আঙুল দিয়ে ঘষুন। এটি কেমন অনুভূত হচ্ছে?",
    image: "https://images.unsplash.com/photo-1599839619722-397514118634?auto=format&fit=crop&q=80&w=400",
    options: [
      { l: "বালির মতো খসখসে", res: "বেলে দোআঁশ (Sandy Loam)", icon: "🌱", desc: "চাষাবাদের জন্য ভালো মাটি। পানি নিষ্কাশন ব্যবস্থা ভালো থাকে।", management: "মাঝারি সেচ ও সুষম সার ব্যবহার করুন।" },
      { l: "খুব মসৃণ বা পাউডারের মতো", res: "পলি দোআঁশ (Silty Loam)", icon: "🌾", desc: "অত্যন্ত উর্বর মাটি। এতে পলি বা সিল্টের পরিমাণ বেশি থাকে।", management: "যেকোনো শস্যের জন্য উপযুক্ত। ড্রেনেজ ব্যবস্থা খেয়াল রাখুন।" },
      { l: "খসখসে বা মসৃণ কোনোটিই নয়", res: "দোআঁশ মাটি (Loam)", icon: "🌟", desc: "আদর্শ কৃষি মৃত্তিকা। বালু, পলি ও কাদার সঠিক ভারসাম্য।", management: "সুষম সার এবং সঠিক শস্য পর্যায়ক্রম (Crop Rotation) বজায় রাখুন।" }
    ]
  },
  {
    id: 3,
    q: "ধাপ ৩: স্পর্শ অনুভূতি (Feel Test)",
    instruction: "মাটিটি আঙুল দিয়ে ঘষুন। এটি কেমন অনুভূত হচ্ছে?",
    image: "https://images.unsplash.com/photo-1599839619722-397514118634?auto=format&fit=crop&q=80&w=400",
    options: [
      { l: "খসখসে (Gritty)", res: "বেলে এঁটেল দোআঁশ (Sandy Clay Loam)", icon: "🧱", desc: "মাঝারি ভারী মাটি। এটি পানি ধরে রাখতে পারে তবে মাঝে মাঝে শক্ত হয়ে যায়।", management: "মাটি গভীর করে চাষ দিন। পর্যাপ্ত কম্পোস্ট ব্যবহার করুন।" },
      { l: "খুব মসৃণ বা পিচ্ছিল", res: "পলি এঁটেল দোআঁশ (Silty Clay Loam)", icon: "🥣", desc: "ভারী দোআঁশ মাটি। বর্ষাকালে পানি জমতে পারে।", management: "নিষ্কাশন নালার ব্যবস্থা করুন। চুন প্রয়োগের প্রয়োজন হতে পারে।" },
      { l: "খসখসে বা মসৃণ কোনোটিই নয়", res: "এঁটেল দোআঁশ (Clay Loam)", icon: "🏺", desc: "উর্বর ও ভারী মাটি। ধানের জন্য অত্যন্ত ভালো।", management: "জমিতে পর্যাপ্ত রস না থাকলে চাষ দেবেন না (ব জো অবস্থা)।" }
    ]
  },
  {
    id: 4,
    q: "ধাপ ৩: স্পর্শ অনুভূতি (Feel Test)",
    instruction: "মাটিটি আঙুল দিয়ে ঘষুন। এটি কেমন অনুভূত হচ্ছে?",
    image: "https://images.unsplash.com/photo-1599839619722-397514118634?auto=format&fit=crop&q=80&w=400",
    options: [
      { l: "খসখসে (Gritty)", res: "বেলে এঁটেল (Sandy Clay)", icon: "🪨", desc: "খুব ভারী ও বালু মিশ্রিত কাদা মাটি। শুকিয়ে গেলে খুব শক্ত হয়ে যায়।", management: "জৈব সার বাড়িয়ে দিন। লাঙলের পরিবর্তে মালচার ব্যবহার কার্যকর হতে পারে।" },
      { l: "খুব মসৃণ বা পিচ্ছিল", res: "পলি এঁটেল (Silty Clay)", icon: "🌊", desc: "ভারী পলিযুক্ত কাদা মাটি। পানি নিষ্কাশন খুব কঠিন।", management: "উঁচু বেড তৈরি করে চাষ করুন। পানি জমার ঝুঁকি কমান।" },
      { l: "খসখসে বা মসৃণ কোনোটিই নয়", res: "এঁটেল মাটি (Clay)", icon: "🏺", desc: "বিশুদ্ধ কাদা মাটি। এটি পানি ও পুষ্টি অনেক বেশি ধরে রাখে।", management: "বড় দানাযুক্ত সার ব্যবহার করুন। বর্ষায় জলাবদ্ধতা থেকে সুরক্ষা দিন।" }
    ]
  }
];

const mixerData = [
  { id: 'water', title: 'পানি ধারণ ক্ষমতা বৃদ্ধি', icon: '💧', color: 'blue', recipe: '৫-১০% কোকো-পিট বা বায়োচার যোগ করুন। এটি বালুময় মাটির পানি ধরে রাখার ক্ষমতা দ্বিগুণ করে।', ingredients: ['কোকো-পিট', 'বায়োচার'] },
  { id: 'microbe', title: 'উপকারী অণুজীব বৃদ্ধি', icon: '🦠', color: 'emerald', recipe: 'ট্রাইকোডার্মা মিশ্রিত কম্পোস্ট এবং চিটাগুড় মিশ্রিত পানি ছিটিয়ে দিন। এটি মাটিতে উপকারী অণুজীব দ্রুত বাড়াবে।', ingredients: ['ট্রাইকোডার্মা', 'চিটাগুড়'] },
  { id: 'nutrient', title: 'পুষ্টির যোগান বাড়ানো', icon: '🔋', color: 'amber', recipe: 'জৈব সারের সাথে হাড়ের গুড়ো বা সরিষার খৈল মেশান। এটি নাইট্রোজেন ও ফসফরাসের প্রাকৃতিক উৎস।', ingredients: ['সরিষার খৈল', 'হাড়ের গুড়ো'] }
];

const soilAuditLoadingSteps = [
  "মৃত্তিকা উপাদানের অণু বিশ্লেষণ হচ্ছে...",
  "১৭টি পুষ্টি উপাদানের ক্রিটিক্যাল লিমিট পরীক্ষা চলছে...",
  "বার্ক (BARC) ২০২৪ নির্দেশিকা অনুযায়ী মানদণ্ড যাচাই হচ্ছে...",
  "অঞ্চল (AEZ) ভিত্তিক গড় পুষ্টির মানের সাথে তুলনা হচ্ছে...",
  "সারের সঠিক ডোজ এবং মাটির স্বাস্থ্য স্কোর নির্ধারিত হচ্ছে...",
  "বিশেষজ্ঞ রিপোর্ট চূড়ান্ত হচ্ছে..."
];

const SoilExpert: React.FC<SoilExpertProps> = ({ onAction, onBack, onSaveReport, onShowFeedback }) => {
  const [aezData, setAezData] = useState<AEZInfo | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isListeningField, setIsListeningField] = useState<string | null>(null);
  const [showTour, setShowTour] = useState(false);

  const { playSpeech, stopSpeech, isSpeaking, speechEnabled } = useSpeech();
  
  const [activeTab, setActiveTab] = useState<'audit' | 'texture' | 'om_calc'>('audit');
  const [landArea, setLandArea] = useState<number>(33); 
  const [currentOC, setCurrentOC] = useState<number>(0.8);
  const [targetOC, setTargetOC] = useState<number>(2.0);
  const [selectedMixer, setSelectedMixer] = useState<string | null>(null);

  const [textureMode, setTextureMode] = useState<'interactive' | 'scientific'>('interactive');
  const [sand, setSand] = useState(40);
  const [silt, setSilt] = useState(40);
  const [clay, setClay] = useState(20);
  const [currentTextureStep, setCurrentTextureStep] = useState(0);
  const [textureResult, setTextureResult] = useState<{name: string, desc: string, management: string} | null>(null);

  const [auditInputs, setAuditInputs] = useState({ 
    ph: 6.5, oc: 0.8, om: 1.5,
    n: 0.1, p: 15, k: 0.15,
    s: 15, ca: 3.5, mg: 0.8,
    b: 0.4, zn: 1.0, fe: 12, mn: 6, cu: 0.5, mo: 0.15, cl: 15, ni: 0.08,
    ec: 0.8
  });

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_soil_expert');
    if (!tourDone) setShowTour(true);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        const numericValue = parseFloat(transcript.replace(/[^0-9.]/g, ''));
        if (!isNaN(numericValue) && isListeningField) {
           setAuditInputs(prev => ({ ...prev, [isListeningField]: numericValue }));
        }
      };
      recognitionRef.current.onend = () => setIsListeningField(null);
    }
  }, [isListeningField]);

  useEffect(() => {
    if (activeTab === 'texture' && textureMode === 'interactive' && !textureResult && speechEnabled) {
      const step = textureSteps.find(s => s.id === currentTextureStep);
      if (step) playSpeech(`${step.q}। ${step.instruction}`);
    }
  }, [currentTextureStep, activeTab, textureMode, textureResult, speechEnabled]);

  const toggleListening = (field: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListeningField === field) recognitionRef.current.stop();
    else { setIsListeningField(field); recognitionRef.current.start(); }
  };

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % soilAuditLoadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const chartData = useMemo(() => {
    const nutrients = [
      { label: 'N', key: 'n', max: 0.3 },
      { label: 'P', key: 'p', max: 40 },
      { label: 'K', key: 'k', max: 0.4 },
      { label: 'S', key: 's', max: 40 },
      { label: 'Ca', key: 'ca', max: 8 },
      { label: 'Zn', key: 'zn', max: 3 },
      { label: 'OC', key: 'oc', max: 5 }
    ];
    const getQualitativeScore = (level?: string) => {
      switch(level) {
        case 'Very Low': return 20; case 'Low': return 40; case 'Medium': return 60;
        case 'High': return 80; case 'Very High': return 100; default: return 50;
      }
    };
    return nutrients.map(item => {
      const userVal = (auditInputs as any)[item.key];
      const normalizedUser = Math.min(100, (userVal / item.max) * 100);
      const zoneTypical = aezData ? getQualitativeScore(aezData.nutrients[item.key as keyof typeof aezData.nutrients]) : 0;
      return { subject: item.label, user: normalizedUser, zone: zoneTypical, fullMark: 100 };
    });
  }, [auditInputs, aezData]);

  const handleTextureOption = (opt: any) => {
    if (opt.res) {
      const resData = { name: opt.res, desc: opt.desc, management: opt.management || "সুষম সার ও সঠিক শেষ ব্যবস্থাপনা নিশ্চিত করুন।" };
      setTextureResult(resData);
      playSpeech(`শনাক্তকৃত মাটির বুনট: ${resData.name}। ${resData.desc}। পরামর্শ: ${resData.management}`);
    } else if (opt.next !== undefined) setCurrentTextureStep(opt.next);
  };

  const calculateScientificTexture = () => {
    const sum = sand + silt + clay;
    if (sum !== 100) return alert("বালি, পলি ও কাদার যোগফল ১০০ হতে হবে। বর্তমান যোগফল: " + sum);
    let res = ""; let desc = ""; let management = "";
    if (clay >= 40) {
      if (sand > 45) res = "বেলে এঁটেল (Sandy Clay)";
      else if (silt >= 40) res = "পলি এঁটেল (Silty Clay)";
      else res = "এঁটেল মাটি (Clay)";
      desc = "এটি একটি ভারী মাটি যা অনেক বেশি পানি ধরে রাখতে পারে।";
      management = "বর্ষাকালে জলাবদ্ধতা নিরসনে গভীর নিষ্কাশন নালার ব্যবস্থা করুন।";
    } else if (clay >= 27) {
      res = "এঁটেল দোআঁশ (Clay Loam)";
      desc = "মাঝারি ভারী মাটি, যা অধিকাংশ ফসলের জন্য উর্বর।";
      management = "সঠিক সময়ে (ব জো অবস্থা) চাষ দিয়ে মাটির গঠন বজায় রাখুন।";
    } else if (sand >= 52) {
      res = "বেলে দোআঁশ (Sandy Loam)";
      desc = "হালকা দোআঁশ মাটি, যাতে পানি দ্রুত নিচে চলে যায়।";
      management = "জৈব সার বাড়িয়ে দিন এবং নিয়মিত হালকা সেচ দিন।";
    } else {
      res = "দোআঁশ মাটি (Loam)";
      desc = "আদর্শ কৃষি মৃত্তিকা।";
      management = "সুষম সার প্রয়োগ ও শস্য বহুমুখীকরণ বজায় রাখুন।";
    }
    const resData = { name: res, desc, management };
    setTextureResult(resData);
    playSpeech(`বৈজ্ঞানিক গণনা অনুযায়ী আপনার মাটির বুনট: ${res}। ${desc}। পরামর্শ: ${management}`);
  };

  const handleDetectAEZ = async () => {
    setIsDetecting(true);
    try {
      const data = await detectCurrentAEZDetails(true);
      setAezData(data);
    } catch (error) { alert('লোকেশন শনাক্ত করা সম্ভব হয়নি।'); } finally { setIsDetecting(false); }
  };

  const handleAuditSubmit = async () => {
    setIsLoading(true); setAdvice(null); setLoadingStep(0);
    try {
      const res = await performSoilHealthAudit(auditInputs, aezData || undefined);
      setAdvice(res);
      if (speechEnabled) playSpeech(res);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (error) { alert("অডিট রিপোর্ট তৈরিতে সমস্যা হয়েছে।"); } finally { setIsLoading(false); }
  };

  const handleSaveReport = () => {
    if (advice && onSaveReport) {
      onSaveReport({ type: 'Soil Audit', title: '১৭-উপাদান বিশিষ্ট স্বাস্থ্য অডিট', content: advice, icon: '🏺' });
      alert('রিপোর্ট সংরক্ষিত হয়েছে!');
    }
  };

  const omRequirement = useMemo(() => {
    const diff = Math.max(0, targetOC - currentOC);
    return (diff * (landArea / 33) * 1.5).toFixed(2);
  }, [currentOC, targetOC, landArea]);

  return (
    <div className="max-w-4xl mx-auto p-4 bg-slate-50 min-h-screen pb-24 font-sans text-slate-900 animate-fade-in">
      {showTour && <GuidedTour steps={SOIL_EXPERT_TOUR} tourKey="soil_expert" onClose={() => setShowTour(false)} />}
      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="মৃত্তিকা স্বাস্থ্য রিপোর্ট" content={advice || ""} />}
      
      <div className="flex items-center space-x-4 mb-8">
        <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-[#0A8A1F] hover:text-white transition-all active:scale-90 text-slate-400">
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-800 leading-none">মৃত্তিকা বিশেষজ্ঞ ও অডিট</h1>
          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-2 py-0.5 rounded-full inline-block border border-amber-100 mt-2">SRDI & BARC GUIDE-2024 STANDARDS</p>
        </div>
      </div>

      <div className="flex bg-white p-1.5 rounded-[2rem] shadow-sm mb-8 border border-slate-200 overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveTab('audit')} className={`flex-none px-8 py-3 text-xs font-black rounded-[1.5rem] transition-all ${activeTab === 'audit' ? 'bg-[#0A8A1F] text-white shadow-xl' : 'text-slate-500'}`}>স্বাস্থ্য অডিট ও প্রোফাইল</button>
        <button onClick={() => setActiveTab('texture')} className={`flex-none px-8 py-3 text-xs font-black rounded-[1.5rem] transition-all ${activeTab === 'texture' ? 'bg-[#0A8A1F] text-white shadow-xl' : 'text-slate-500'}`}>বুনট ক্যালকুলেটর</button>
        <button onClick={() => setActiveTab('om_calc')} className={`flex-none px-8 py-3 text-xs font-black rounded-[1.5rem] transition-all ${activeTab === 'om_calc' ? 'bg-[#0A8A1F] text-white shadow-xl' : 'text-slate-500'}`}>জৈব সার ক্যালক</button>
      </div>

      {activeTab === 'audit' && (
        <div id="soil-health-dashboard" className="animate-fade-in space-y-8">
           <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-50"></div>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-emerald-100 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-emerald-50">📍</div>
                  <div><h3 className="text-xl font-black text-slate-800 tracking-tight leading-none">অঞ্চল শনাক্তকরণ (AEZ)</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Required for Regional Benchmarking</p></div>
                </div>
                <button onClick={handleDetectAEZ} disabled={isDetecting} className="bg-[#0A8A1F] text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg active:scale-95 transition-all flex items-center space-x-2">
                   {isDetecting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : 'অঞ্চল শনাক্ত করুন'}
                </button>
              </div>
              {aezData && (
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-200 text-left animate-fade-in shadow-inner flex flex-col md:flex-row gap-8 items-start">
                   <div className="flex-1">
                      <p className="font-black text-emerald-600 uppercase text-[10px] tracking-widest mb-2">শনাক্তকৃত অঞ্চল:</p>
                      <h3 className="text-2xl font-black text-slate-800 mb-4">{aezData.name}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">মাটির ধরণ</p><p className="text-xs font-bold text-slate-700 leading-tight">{aezData.soilType}</p></div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100"><p className="text-[9px] font-black text-slate-400 uppercase mb-1">pH সীমা</p><p className="text-xs font-bold text-slate-700 leading-tight">{aezData.phRange}</p></div>
                      </div>
                   </div>
                </div>
              )}
           </div>

           <div className="bg-white rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100">
              <div className="flex justify-between items-center mb-10"><h3 className="text-xl font-black text-slate-800 flex items-center"><span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-3 animate-pulse"></span>১৭-পুষ্টি উপাদান অডিট ইনপুট</h3><div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-500 uppercase tracking-widest">BARC-2024 Standards</div></div>
              <div className="space-y-12">
                 <AuditGroup title="ভৌত ও রাসায়নিক মার্কার" nutrients={['ph', 'oc', 'om', 'ec']} nutrientsBn={{ph: 'pH', oc: 'জৈব কার্বন', om: 'জৈব পদার্থ', ec: 'EC'}} inputs={auditInputs} onChange={setAuditInputs} onVoice={toggleListening} activeField={isListeningField} />
                 <AuditGroup title="মুখ্য পুষ্টি উপাদান (Primary)" nutrients={['n', 'p', 'k']} nutrientsBn={{n: 'নাইট্রোজেন', p: 'ফসফরাস', k: 'পটাশিয়াম'}} inputs={auditInputs} onChange={setAuditInputs} onVoice={toggleListening} activeField={isListeningField} />
                 <AuditGroup title="গৌণ পুষ্টি উপাদান (Secondary)" nutrients={['s', 'ca', 'mg']} nutrientsBn={{s: 'সালফার', ca: 'ক্যালসিয়াম', mg: 'ম্যাগনেসিয়াম'}} inputs={auditInputs} onChange={setAuditInputs} onVoice={toggleListening} activeField={isListeningField} />
                 <AuditGroup title="অণু পুষ্টি উপাদান (Micronutrients)" nutrients={['b', 'zn', 'fe', 'mn', 'cu', 'mo', 'cl', 'ni']} nutrientsBn={{b: 'বোরন', zn: 'জিঙ্ক', fe: 'আয়রন', mn: 'ম্যাঙ্গানিজ', cu: 'কপার', mo: 'মলিবডেনাম', cl: 'ক্লোরিন', ni: 'নিকেল'}} inputs={auditInputs} onChange={setAuditInputs} onVoice={toggleListening} activeField={isListeningField} />
              </div>
              <div className="bg-slate-50 dark:bg-slate-900/30 rounded-[2rem] p-6 my-12 border border-slate-100"><h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">স্বাস্থ্য তুলনা চিত্র (User vs AEZ)</h4><div className="h-[350px] w-full"><ResponsiveContainer width="100%" height="100%"><RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}><PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="subject" tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' }} /><Radar name="আপনার মাটি" dataKey="user" stroke="#0A8A1F" fill="#10b981" fillOpacity={0.6} />{aezData && <Radar name="আঞ্চলিক গড়" dataKey="zone" stroke="#3b82f6" fill="#60a5fa" fillOpacity={0.3} />}<Tooltip /><Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '20px' }} /></RadarChart></ResponsiveContainer></div></div>
              <button onClick={handleAuditSubmit} disabled={isLoading} className="w-full bg-[#0A8A1F] text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all flex items-center justify-center space-x-4">
                {isLoading ? <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div> : 'পূর্ণাঙ্গ অডিট রিপোর্ট জেনারেট করুন'}
              </button>
           </div>

           {isLoading && (
             <div className="bg-white p-16 rounded-[3.5rem] text-center shadow-xl border border-slate-50 flex flex-col items-center space-y-8 animate-fade-in"><div className="relative w-24 h-24"><div className="absolute inset-0 border-4 border-[#0A8A1F] border-t-transparent rounded-full animate-spin"></div><div className="absolute inset-0 flex items-center justify-center text-4xl">🔬</div></div><h3 className="text-2xl font-black text-slate-800">{soilAuditLoadingSteps[loadingStep]}</h3></div>
           )}

           {advice && !isLoading && (
             <div className="space-y-6">
               <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border-t-[16px] border-emerald-600 animate-fade-in relative overflow-hidden flex flex-col">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 pb-8 border-b border-slate-50 gap-6 relative z-10">
                  <div><h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none mb-2">বিশেষজ্ঞ অডিট রিপোর্ট</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scientific Guidance • BARC 2024 Protocol</p></div>
                  <div className="flex items-center space-x-3">
                    <button onClick={() => playSpeech(advice)} className={`p-6 rounded-full shadow-2xl transition-all active:scale-90 ${isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 text-white'}`}>
                        {isSpeaking ? '🔇' : '🔊'}
                    </button>
                    <button onClick={handleSaveReport} className="p-6 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all active:scale-90" title="সেভ করুন">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>
                    </button>
                  </div>
                </div>
                <div className="prose prose-slate max-w-none font-medium leading-relaxed whitespace-pre-wrap text-slate-700 text-lg md:text-xl first-letter:text-7xl first-letter:font-black first-letter:text-[#0A8A1F] first-letter:float-left first-letter:mr-4 first-letter:leading-none">{advice}</div>
               </div>
             </div>
           )}
        </div>
      )}

      {activeTab === 'texture' && (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8">
           <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
              <div className="flex justify-between items-center mb-10"><div><h2 className="text-2xl font-black text-slate-800">বুনট ক্যালকুলেটর</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Determine Soil Texture Class (USDA System)</p></div><div className="bg-slate-100 p-1 rounded-2xl flex space-x-1"><button onClick={() => { stopSpeech(); setTextureMode('interactive'); setTextureResult(null); }} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${textureMode === 'interactive' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>ইন্টারেক্টিভ টেস্ট</button><button onClick={() => { stopSpeech(); setTextureMode('scientific'); setTextureResult(null); }} className={`px-4 py-2 text-[9px] font-black uppercase rounded-xl transition-all ${textureMode === 'scientific' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>বৈজ্ঞানিক ক্যালক</button></div></div>
              {textureMode === 'interactive' ? (
                <div className="animate-fade-in">
                   {textureResult ? (
                     <TextureResultDisplay result={textureResult} onReset={() => { setTextureResult(null); setCurrentTextureStep(0); }} />
                   ) : (
                     <div className="bg-white rounded-[3rem] shadow-xl overflow-hidden border border-slate-100"><div className="aspect-video relative overflow-hidden"><img src={textureSteps.find(s => s.id === currentTextureStep)?.image} className="w-full h-full object-cover transition-transform duration-[2000ms] hover:scale-105" alt="Texture Test" /><div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div><div className="absolute bottom-6 left-8 right-8"><div className="flex items-center space-x-2 mb-2"><span className="bg-emerald-500 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest">Interactive Protocol</span><div className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden"><div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${((currentTextureStep + 1) / 3) * 100}%` }}></div></div></div><p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-1">{textureSteps.find(s => s.id === currentTextureStep)?.q}</p><h3 className="text-white text-xl md:text-2xl font-black leading-tight">{textureSteps.find(s => s.id === currentTextureStep)?.instruction}</h3></div></div><div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">{textureSteps.find(s => s.id === currentTextureStep)?.options.map((opt, i) => (<button key={i} onClick={() => handleTextureOption(opt)} className="group bg-slate-50 hover:bg-[#0A8A1F] p-6 rounded-[2rem] border-2 border-slate-100 hover:border-[#0A8A1F] transition-all flex items-center space-x-4 active:scale-95 shadow-sm text-left"><div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform shadow-sm">{opt.icon}</div><span className="text-base font-black text-slate-700 group-hover:text-white leading-tight">{opt.l}</span></button>))}</div><div className="px-8 pb-8 flex justify-center"><button onClick={() => { setCurrentTextureStep(0); setTextureResult(null); stopSpeech(); }} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-rose-500">শুরু থেকে আবার শুরু করুন</button></div></div>
                   )}
                </div>
              ) : (
                <div className="animate-fade-in space-y-10">
                   {textureResult ? (
                      <TextureResultDisplay result={textureResult} onReset={() => { setTextureResult(null); }} />
                   ) : (
                     <div className="space-y-10"><div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 flex gap-4"><div className="text-3xl">🔬</div><p className="text-xs text-blue-800 font-bold leading-relaxed italic">মাটির বালি (Sand), পলি (Silt) এবং কাদা (Clay) এর শতকরা হার ইনপুট দিন। এদের যোগফল অবশ্যই ১০০ হতে হবে। এটি USDA এবং SRDI মানদণ্ড অনুসরণ করে।</p></div><div className="grid grid-cols-1 md:grid-cols-3 gap-8"><TextureSlider label="বালি (Sand %)" val={sand} onChange={setSand} color="amber" /><TextureSlider label="পলি (Silt %)" val={silt} onChange={setSilt} color="slate" /><TextureSlider label="কাদা (Clay %)" val={clay} onChange={setClay} color="rose" /></div><div className="text-center"><p className="text-2xl font-black mb-6">মোট যোগফল: <span className={sand + silt + clay === 100 ? 'text-emerald-600' : 'text-rose-500'}>{sand + silt + clay}%</span></p><button onClick={calculateScientificTexture} className="w-full bg-slate-900 text-white py-6 rounded-[2.5rem] font-black text-xl shadow-2xl active:scale-95 transition-all">বুনট শ্রেণি নির্ধারণ করুন</button></div></div>
                   )}
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === 'om_calc' && (
        <div className="animate-fade-in max-w-3xl mx-auto space-y-8">
           <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
              <div className="flex items-center space-x-4 mb-8"><div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-amber-100">💩</div><div><h3 className="text-2xl font-black text-slate-800 tracking-tight">জৈব সার ক্যালকুলেটর</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Organic Matter Requirement Estimator</p></div></div>
              <div className="space-y-10">
                 <div className="space-y-4"><div className="flex justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">জমির পরিমাণ (বিঘা)</label><span className="text-xs font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">{landArea} বিঘা</span></div><input type="range" min="1" max="100" value={landArea} onChange={(e) => setLandArea(parseInt(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-emerald-600" /></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-4"><div className="flex justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">বর্তমান জৈব কার্বন (%)</label><span className="text-xs font-black text-rose-500 bg-rose-50 px-3 py-1 rounded-full">{currentOC}%</span></div><input type="range" min="0.1" max="5.0" step="0.1" value={currentOC} onChange={(e) => setCurrentOC(parseFloat(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-rose-500" /></div><div className="space-y-4"><div className="flex justify-between"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">লক্ষ্যমাত্রা (%)</label><span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">{targetOC}%</span></div><input type="range" min="0.1" max="5.0" step="0.1" value={targetOC} onChange={(e) => setTargetOC(parseFloat(e.target.value))} className="w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer accent-blue-600" /></div></div>
                 <div className="bg-slate-900 rounded-[2.5rem] p-10 text-white text-center shadow-2xl relative overflow-hidden mt-10 border-b-8 border-emerald-500"><div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 blur-2xl"></div><p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-4">প্রয়োজনীয় জৈব সারের পরিমাণ</p><div className="flex flex-col items-center"><h4 className="text-7xl font-black text-white leading-none">{omRequirement} <span className="text-2xl font-bold opacity-30">টন</span></h4><p className="text-sm font-bold text-slate-400 mt-6 max-w-xs mx-auto leading-relaxed">আপনার {landArea} বিঘা জমিতে জৈব কার্বন {currentOC}% থেকে বাড়িয়ে {targetOC}% করতে হলে প্রায় {omRequirement} টন পচা গোবর বা উন্নত কম্পোস্ট প্রয়োজন।</p></div></div>
              </div>
           </div>
           <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 animate-fade-in">
              <div className="flex items-center space-x-4 mb-8"><div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-3xl shadow-inner border border-emerald-100">🧪</div><div><h3 className="text-2xl font-black text-slate-800 tracking-tight">মাটির বিশেষ গুণাগুণ বৃদ্ধিতে এআই মিক্সার</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Enhance specific soil attributes with natural additives</p></div></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">{mixerData.map(item => (<button key={item.id} onClick={() => setSelectedMixer(item.id === selectedMixer ? null : item.id)} className={`p-6 rounded-[2.5rem] border-2 transition-all flex flex-col items-center text-center space-y-4 active:scale-95 ${selectedMixer === item.id ? `bg-emerald-600 border-emerald-600 text-white shadow-xl scale-105` : `bg-white border-slate-100 text-slate-500 hover:border-emerald-500`}`}><span className="text-4xl">{item.icon}</span><span className="text-[10px] font-black uppercase tracking-widest leading-none">{item.title}</span></button>))}</div>
              {selectedMixer && (<div className="bg-slate-50 rounded-[2.5rem] p-8 md:p-10 border border-slate-200 animate-fade-in shadow-inner relative overflow-hidden"><h4 className="text-xl font-black text-slate-800 mb-6">{mixerData.find(m => m.id === selectedMixer)?.title}</h4><p className="text-lg font-medium text-slate-700 leading-relaxed mb-8 italic">"{mixerData.find(m => m.id === selectedMixer)?.recipe}"</p><div className="flex flex-wrap gap-2">{mixerData.find(m => m.id === selectedMixer)?.ingredients.map(ing => (<span key={ing} className="bg-white px-4 py-2 rounded-xl text-[10px] font-black uppercase text-emerald-600 border border-emerald-100 shadow-sm">+ {ing}</span>))}</div></div>)}
           </div>
        </div>
      )}
      <footer className="mt-20 text-center pb-12 opacity-30"><p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">Krishi AI Core v3.1 • SRDI & BARC Integrated Protocol</p></footer>
    </div>
  );
};

const AuditGroup = ({ title, nutrients, nutrientsBn, inputs, onChange, onVoice, activeField }: any) => (
  <div className="space-y-6">
    <h4 className="text-[11px] font-black text-emerald-600 uppercase tracking-widest pl-4 border-l-4 border-emerald-500">{title}</h4>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
       {nutrients.map((key: string) => (
         <div key={key} className="space-y-1.5 group">
            <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{nutrientsBn[key] || key.toUpperCase()}</label><button onClick={() => onVoice(key)} className={`p-1 rounded transition-all ${activeField === key ? 'bg-red-500 text-white animate-pulse' : 'text-slate-300 hover:text-emerald-500'}`}>🎙️</button></div>
            <input type="number" step="0.01" value={(inputs as any)[key]} onChange={(e) => onChange({...inputs, [key]: parseFloat(e.target.value) || 0})} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-black text-slate-700 outline-none focus:border-amber-500 shadow-inner" />
         </div>
       ))}
    </div>
  </div>
);

const TextureSlider = ({ label, val, onChange, color }: any) => {
  const colors: any = { amber: 'accent-amber-500', slate: 'accent-slate-500', rose: 'accent-rose-500' };
  return (
    <div className="space-y-4">
       <div className="flex justify-between items-center px-1"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{label}</label><span className="text-sm font-black">{val}%</span></div>
       <input type="range" min="0" max="100" value={val} onChange={(e) => onChange(parseInt(e.target.value))} className={`w-full h-2 bg-slate-100 rounded-full appearance-none cursor-pointer ${colors[color]}`} />
    </div>
  );
};

const TextureResultDisplay = ({ result, onReset }: any) => (
  <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border-t-[20px] border-[#0A8A1F] text-center animate-fade-in flex flex-col items-center relative overflow-hidden">
     <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 opacity-40"></div>
     <div className="text-7xl mb-8 transform hover:scale-110 transition-transform duration-500">🏺</div>
     <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mb-2">শনাক্তকৃত মাটির বুনট (Texture Class)</p>
     <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">{result.name}</h2>
     <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 mb-8 max-w-lg"><p className="text-sm font-bold text-emerald-800 leading-relaxed italic">"{result.desc}"</p></div>
     <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white text-left w-full max-w-lg mb-10 relative overflow-hidden"><div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -mr-12 -mt-12"></div><h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></span>মৃত্তিকা ব্যবস্থাপনা পরামর্শ</h4><p className="text-lg font-medium leading-relaxed text-slate-200">{result.management}</p></div>
     <div className="space-y-4 w-full max-w-xs"><button onClick={onReset} className="w-full bg-[#0A8A1F] text-white py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all">আবার পরীক্ষা করুন</button><button onClick={() => window.print()} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">রিপোর্ট ডাউনলোড করুন</button></div>
  </div>
);

export default SoilExpert;