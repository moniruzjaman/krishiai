
import React, { useState, useRef, useEffect } from 'react';
import { analyzeCropImage, generateSpeech, requestPrecisionParameters, performDeepAudit, getLiveWeather } from '../services/geminiService';
import { getStoredLocation } from '../services/locationService';
import { AnalysisResult, SavedReport, UserCrop, View, Language, WeatherData } from '../types';
import { CROP_CATEGORIES, CROPS_BY_CATEGORY } from '../constants';
import ShareDialog from './ShareDialog';
import DynamicPrecisionForm from './DynamicPrecisionForm';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';
import { ToolGuideHeader } from './ToolGuideHeader';

interface AnalyzerProps {
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  onNavigate?: (view: View) => void;
  userRank?: string;
  userCrops?: UserCrop[];
  lang: Language;
}

const ANALYZER_TOUR: TourStep[] = [
  { title: "সমন্বিত এআই অডিট", content: "এই এআই স্ক্যানার একই সাথে পোকা (Pest), রোগ (Disease) এবং পুষ্টির অভাব (Nutrient Deficiency) শনাক্ত করতে পারে।", position: 'center' },
  { targetId: "analyzer-media-selector", title: "মিডিয়া নির্বাচন", content: "আপনি এখন ছবি অথবা ভিডিওর মাধ্যমে নিখুঁত ডায়াগনোসিস করতে পারেন।", position: 'bottom' },
  { targetId: "live-cam-btn", title: "লাইভ এআই ক্যামেরা", content: "সরাসরি মাঠ থেকে লাইভ ভিডিও এবং অডিওর মাধ্যমে ডায়াগনোসিস করতে এটি ব্যবহার করুন।", position: 'top' }
];

const Analyzer: React.FC<AnalyzerProps> = ({ onAction, onSaveReport, onShowFeedback, onBack, onNavigate, userRank, userCrops = [], lang }) => {
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('');
  const [userQuery, setUserQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [precisionFields, setPrecisionFields] = useState<any[] | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isLiveMode, setIsLiveMode] = useState(false);

  const { playSpeech, stopSpeech, isSpeaking, speechEnabled } = useSpeech();
  const [cropFamily, setCropFamily] = useState<string>('ধান');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const loadingMessages = [ 
    "মিডিয়া প্রসেসিং হচ্ছে...", 
    "সরকারি ডাটাসোর্স যাচাই হচ্ছে...", 
    "সাপোর্টিং সাইনবোর্ড ইনফো দেখা হচ্ছে...",
    "লাইভ আবহাওয়া সমন্বয় করা হচ্ছে...",
    "সঠিক বালাইনাশক ও ডোজ নির্বাচন চলছে...", 
    "নিখুঁত ব্যবস্থাপত্র চূড়ান্ত হচ্ছে..." 
  ];

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_analyzer_v5');
    if (!tourDone) setShowTour(true);

    const loadWeather = async () => {
      const loc = getStoredLocation();
      if (loc) {
        try {
          const data = await getLiveWeather(loc.lat, loc.lng, false, lang);
          setWeather(data);
        } catch (e) {}
      }
    };
    loadWeather();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = lang === 'bn' ? 'bn-BD' : 'en-US';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => setUserQuery(prev => prev + ' ' + event.results[0][0].transcript);
      recognitionRef.current.onend = () => setIsListening(false);
      recognitionRef.current.onerror = () => setIsListening(false);
    }
  }, [lang]);

  useEffect(() => {
    let interval: any;
    if (isLoading) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % loadingMessages.length), 2000);
    return () => clearInterval(interval);
  }, [isLoading]);

  const startLiveMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsLiveMode(true);
        setSelectedMedia(null);
        setResult(null);
      }
    } catch (err) {
      alert(lang === 'bn' ? "ক্যামেরা অ্যাক্সেস করা সম্ভব হয়নি।" : "Camera access denied.");
    }
  };

  const stopLiveMode = () => {
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsLiveMode(false);
  };

  const captureFrame = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg');
      setSelectedMedia(dataUrl);
      setMimeType('image/jpeg');
      stopLiveMode();
      handleAnalyze(false);
    }
  };

  const handleAnalyze = async (precision: boolean = false) => {
    if (!selectedMedia && !isLiveMode) return alert(lang === 'bn' ? "ছবি বা ভিডিও নির্বাচন করুন।" : "Select media.");
    
    let mediaToAnalyze = selectedMedia;
    let typeToAnalyze = mimeType;

    if (isLiveMode && videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context?.drawImage(videoRef.current, 0, 0);
        mediaToAnalyze = canvasRef.current.toDataURL('image/jpeg');
        typeToAnalyze = 'image/jpeg';
        stopLiveMode();
    }

    if (!mediaToAnalyze) return;

    setIsLoading(true); 
    setResult(null); 
    setPrecisionFields(null);
    setAnswers({});
    
    try {
      const base64 = mediaToAnalyze.split(',')[1];
      if (precision) {
        const fields = await requestPrecisionParameters(base64, typeToAnalyze, cropFamily, lang);
        if (!fields || fields.length === 0) {
           const analysis = await analyzeCropImage(base64, typeToAnalyze, { cropFamily, userRank, query: userQuery, lang, weather: weather || undefined });
           setResult(analysis);
           if (speechEnabled) playSpeech(analysis.fullText);
        } else {
           setPrecisionFields(fields);
        }
      } else {
        const analysis = await analyzeCropImage(base64, typeToAnalyze, { cropFamily, userRank, query: userQuery, lang, weather: weather || undefined });
        setResult(analysis);
        if (speechEnabled) playSpeech(analysis.fullText);
        if (onAction) onAction();
      }
    } catch (error: any) {
      alert(lang === 'bn' ? "বিশ্লেষণে সমস্যা হয়েছে।" : "Analysis failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrecisionSubmit = async (dynamicData: Record<string, string>) => {
    if (!selectedMedia) return;
    setIsLoading(true);
    setResult(null);
    try {
      const base64 = selectedMedia.split(',')[1];
      const analysis = await performDeepAudit(base64, mimeType, cropFamily, dynamicData, lang, weather || undefined);
      setResult(analysis);
      setPrecisionFields(null);
      if (speechEnabled) playSpeech(analysis.fullText);
      if (onAction) onAction();
    } catch (e) {
      alert(lang === 'bn' ? "ডিপ অডিট ব্যর্থ হয়েছে।" : "Deep Audit Failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if (result && onSaveReport && selectedMedia) {
      setIsSaving(true);
      try {
        const audioBase64 = await generateSpeech(result.fullText.replace(/[*#_~]/g, ''));
        onSaveReport({
          type: 'AI Scientific Audit',
          title: result.diagnosis,
          content: result.fullText,
          audioBase64,
          icon: result.category === 'Pest' ? '🦗' : result.category === 'Disease' ? '🦠' : '🍂',
          imageUrl: selectedMedia,
        });
        alert(lang === 'bn' ? "অডিওসহ প্রোফাইলে সংরক্ষিত হয়েছে!" : "Saved to profile with audio!");
      } catch (e) {
        onSaveReport({
          type: 'AI Scientific Audit',
          title: result.diagnosis,
          content: result.fullText,
          icon: result.category === 'Pest' ? '🦗' : result.category === 'Disease' ? '🦠' : '🍂',
          imageUrl: selectedMedia,
        });
        alert(lang === 'bn' ? "সংরক্ষিত হয়েছে (অডিও ছাড়া)" : "Saved (without audio)");
      } finally {
        setIsSaving(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      {showTour && <GuidedTour steps={ANALYZER_TOUR} tourKey="analyzer_v5" onClose={() => setShowTour(false)} />}
      
      <ToolGuideHeader 
        title={lang === 'bn' ? 'অফিসিয়াল সায়েন্টিফিক অডিট' : 'Official Scientific Audit'}
        subtitle={lang === 'bn' ? 'সাইনবোর্ড রিডার ও রিয়েল-টাইম ওয়েদার কানেক্টেড ডায়াগনোসিস।' : 'Signboard reader with real-time weather-integrated diagnosis.'}
        protocol="BARC-PP-25 / DAE V5"
        source="Official Govt. Authentic Repositories"
        lang={lang}
        onBack={onBack || (() => {})}
        icon="📸"
        themeColor="emerald"
        guideSteps={lang === 'bn' ? [
          "শস্য নির্বাচন করুন বা সাইনবোর্ড থাকলে ছবি তুলুন।",
          "লাইভ ক্যামেরা ব্যবহার করে সরাসরি মাঠ থেকে ডায়াগনোসিস করুন।",
          "নিখুঁত ফলাফলের জন্য 'ডিপ অডিট' প্রশ্নগুলোর উত্তর দিন।",
          "আবহাওয়া অনুযায়ী সঠিক দমন ব্যবস্থা অনুসরণ করুন।"
        ] : [
          "Select crop or take photo of demonstration signboards.",
          "Use Live Camera for real-time field diagnosis with audio support.",
          "Answer follow-up questions in 'Deep Audit' for 100% precision.",
          "Follow dosages adjusted for local weather conditions."
        ]}
      />

      <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-xl border border-slate-100 mb-8 print:hidden">
        <div className="space-y-6 mb-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{lang === 'bn' ? 'শস্য ও ডায়াগনোসিস মোড' : 'Crop & Diagnosis Mode'}</span>
              </div>
              {isLiveMode && (
                <div className="flex items-center space-x-2">
                   <span className="w-2 h-2 bg-red-500 rounded-full animate-ping"></span>
                   <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Live Feed Active</span>
                </div>
              )}
           </div>
           
           <select value={cropFamily} onChange={(e) => setCropFamily(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-lg text-slate-700 focus:border-emerald-500 outline-none shadow-inner appearance-none transition-all">
              {Object.values(CROPS_BY_CATEGORY).flat().map(c => <option key={c} value={c}>{c}</option>)}
           </select>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div id="analyzer-media-selector" className="md:col-span-5 aspect-square relative">
                {isLiveMode ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-500 shadow-2xl relative bg-black">
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                     <div className="absolute inset-0 border-2 border-white/20 pointer-events-none"></div>
                     <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4 px-6">
                        <button onClick={captureFrame} className="flex-1 bg-white text-emerald-700 py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">ফটো তুলুন</button>
                        <button onClick={stopLiveMode} className="p-4 bg-red-600 text-white rounded-2xl shadow-xl active:scale-95">✕</button>
                     </div>
                  </div>
                ) : selectedMedia ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-500 shadow-2xl relative bg-black group">
                    {mimeType.startsWith('video/') ? <video src={selectedMedia} className="w-full h-full object-cover" controls /> : <img src={selectedMedia} className="w-full h-full object-cover" alt="Scan" />}
                    <button onClick={() => { setSelectedMedia(null); setPrecisionFields(null); setResult(null); }} className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 h-full">
                    <button id="live-cam-btn" onClick={startLiveMode} className="col-span-2 bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 flex flex-col items-center justify-center space-y-3 hover:bg-black transition-all group overflow-hidden relative">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
                      <div className="text-4xl">🔴</div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest">{lang === 'bn' ? 'লাইভ এআই ক্যামেরা' : 'Live AI Camera'}</p>
                    </button>
                    <button onClick={() => fileInputRef.current?.click()} className="col-span-1 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2 hover:border-emerald-400 transition-all">
                      <div className="text-2xl">🖼️</div>
                      <p className="text-[8px] font-black text-slate-400 uppercase">{lang === 'bn' ? 'ছবি আপলোড' : 'Upload'}</p>
                    </button>
                    <button onClick={() => videoInputRef.current?.click()} className="col-span-1 bg-rose-50 rounded-[2rem] border-4 border-dashed border-rose-200 flex flex-col items-center justify-center space-y-2 hover:border-rose-400 transition-all">
                      <div className="text-2xl">📹</div>
                      <p className="text-[8px] font-black text-rose-600 uppercase">{lang === 'bn' ? 'ভিডিও' : 'Video'}</p>
                    </button>
                  </div>
                )}
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => { setSelectedMedia(reader.result as string); setMimeType(file.type); setPrecisionFields(null); setResult(null); };
                    reader.readAsDataURL(file);
                  }
                }} />
                <input type="file" ref={videoInputRef} accept="video/*" className="hidden" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => { setSelectedMedia(reader.result as string); setMimeType(file.type); setPrecisionFields(null); setResult(null); };
                    reader.readAsDataURL(file);
                  }
                }} />
                <canvas ref={canvasRef} className="hidden" />
              </div>

              <div className="md:col-span-7 flex flex-col space-y-4">
                 <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-6 flex flex-col focus-within:ring-4 ring-emerald-500/30 transition-all shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                    <textarea value={userQuery} onChange={(e) => setUserQuery(e.target.value)} placeholder={lang === 'bn' ? "লক্ষণগুলো বা অতিরিক্ত তথ্য লিখুন..." : "Describe symptoms..."} className="w-full flex-1 bg-transparent resize-none font-bold text-white placeholder:text-slate-700 outline-none text-lg min-h-[140px] relative z-10" />
                    <div className="flex items-center justify-between mt-4 gap-2 relative z-10">
                      <button onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()} className={`p-4 rounded-2xl transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-emerald-400 hover:bg-white/20'}`} title="ভয়েস প্রম্পট">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                      </button>
                      <button id="deep-audit-btn" onClick={() => handleAnalyze(true)} disabled={isLoading || (!selectedMedia && !isLiveMode)} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.8rem] font-black text-[10px] uppercase shadow-xl hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50">ডিপ অডিট</button>
                      <button onClick={() => handleAnalyze(false)} disabled={isLoading || (!selectedMedia && !isLiveMode)} className="flex-1 bg-slate-800 text-white py-5 rounded-[1.8rem] font-black text-[10px] uppercase shadow-xl hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">দ্রুত স্ক্যান</button>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {isLoading && (
        <div className="bg-white p-12 rounded-[3.5rem] text-center shadow-2xl flex flex-col items-center space-y-8 animate-fade-in my-8">
           <div className="relative">
              <div className="w-24 h-24 border-[10px] border-emerald-50 border-t-emerald-600 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">🔬</div>
           </div>
           <h3 className="text-2xl font-black text-slate-800">{loadingMessages[loadingStep]}</h3>
        </div>
      )}

      {precisionFields && !isLoading && !result && (
        <DynamicPrecisionForm fields={precisionFields} lang={lang} onSubmit={handlePrecisionSubmit} isLoading={isLoading} toolProtocol="DAE-SCAN-V5" />
      )}

      {result && !isLoading && (
        <div className="space-y-8 animate-fade-in-up">
          {/* Enhanced Result Card */}
          <div ref={reportRef} className="bg-white rounded-[4rem] shadow-[0_40px_100px_rgba(0,0,0,0.1)] border-t-[24px] border-emerald-600 relative overflow-hidden flex flex-col print:rounded-none print:shadow-none print:border-t-[10px] print:p-8 print:m-0">
             
             {/* Decorative Background */}
             <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-50 rounded-full -mr-48 -mt-48 opacity-40 blur-[100px] pointer-events-none"></div>

             {/* Header Section */}
             <div className="px-8 pt-12 md:px-14 flex flex-col md:flex-row justify-between items-start md:items-center mb-12 pb-10 border-b-2 border-slate-50 gap-8 relative z-10 print:border-slate-200">
               <div className="flex items-center space-x-8">
                  <div className="w-24 h-24 bg-slate-900 text-white rounded-[2.2rem] flex items-center justify-center text-5xl shadow-[0_20px_40px_rgba(15,23,42,0.3)] transform -rotate-3 transition-transform hover:rotate-0">
                    {result.category === 'Pest' ? '🦗' : result.category === 'Disease' ? '🦠' : '🍂'}
                  </div>
                  <div>
                    <h3 className="text-4xl font-black text-slate-900 tracking-tighter leading-none mb-3">{result.diagnosis}</h3>
                    <div className="flex flex-wrap items-center gap-2">
                       <span className="bg-emerald-600 text-white px-4 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-md">{lang === 'bn' ? 'শনাক্তকৃত' : result.category}</span>
                       <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-200">Confidence: {result.confidence}%</span>
                       <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100">Official Protocol</span>
                    </div>
                  </div>
               </div>
               
               <div className="flex items-center gap-3 print:hidden">
                  <button onClick={() => playSpeech(result.fullText)} className={`p-6 rounded-3xl shadow-2xl transition-all active:scale-95 flex items-center space-x-3 border-b-4 ${isSpeaking ? 'bg-rose-500 text-white border-rose-800 animate-pulse' : 'bg-slate-900 text-white border-slate-950'}`}>
                    <span className="text-xl">{isSpeaking ? '🔇' : '🔊'}</span>
                    <span className="text-[10px] font-black uppercase tracking-widest">{isSpeaking ? (lang === 'bn' ? 'বন্ধ করুন' : 'Stop Reading') : (lang === 'bn' ? 'রিপোর্টটি শুনুন' : 'Read Aloud')}</span>
                  </button>
                  <button onClick={handleSaveToHistory} disabled={isSaving} className="p-5 rounded-3xl bg-emerald-50 text-emerald-600 border-2 border-emerald-100 shadow-xl active:scale-95 transition-all disabled:opacity-50" title="সেভ করুন">
                    {isSaving ? <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div> : <span className="text-2xl">💾</span>}
                  </button>
                  <button onClick={() => setIsShareOpen(true)} className="p-5 rounded-3xl bg-blue-50 text-blue-600 border-2 border-blue-100 shadow-xl active:scale-95 transition-all" title="শেয়ার করুন">
                    <span className="text-2xl">🔗</span>
                  </button>
               </div>
             </div>

             {/* Content Body */}
             <div className="px-8 pb-12 md:px-14 grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                <div className="lg:col-span-7 prose prose-slate max-w-none">
                  <p className="text-slate-800 font-medium leading-[1.8] whitespace-pre-wrap text-xl md:text-2xl first-letter:text-7xl first-letter:font-black first-letter:text-emerald-600 first-letter:float-left first-letter:mr-4 first-letter:leading-none print:text-base print:first-letter:text-4xl">
                    {result.fullText}
                  </p>
                  
                  {result.officialSource && (
                    <div className="mt-10 p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 flex items-start space-x-4">
                       <span className="text-3xl">📜</span>
                       <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Official Reference</p>
                          <p className="text-sm font-bold text-slate-600">{result.officialSource}</p>
                       </div>
                    </div>
                  )}
                </div>

                <div className="lg:col-span-5 space-y-6">
                  {selectedMedia && !mimeType.startsWith('video/') && (
                    <div className="rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white bg-slate-50 rotate-1 transition-transform hover:rotate-0 duration-500 group/img">
                      <img src={selectedMedia} className="w-full object-cover aspect-square transition-transform duration-700 group-hover/img:scale-110" alt="Audit Evidence" />
                      <div className="bg-white p-6 text-center">
                         <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Analyzed Field Evidence</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="bg-emerald-50 rounded-[3rem] p-8 border-2 border-emerald-100">
                     <h4 className="text-lg font-black text-emerald-800 mb-4 flex items-center">
                        <span className="mr-3">🛡️</span> প্রতিকার সংক্ষেপ
                     </h4>
                     <p className="text-sm font-bold text-emerald-700 leading-relaxed">
                        {result.advisory}
                     </p>
                  </div>
                </div>
             </div>

             {/* Footer Action */}
             <div className="px-8 py-10 md:px-14 bg-slate-50 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
                <button 
                  onClick={() => onNavigate?.(View.PEST_EXPERT)}
                  className="w-full md:w-auto px-10 py-5 bg-slate-900 text-white rounded-3xl font-black text-xs uppercase tracking-widest shadow-2xl hover:scale-105 transition-all"
                >
                  বিস্তারিত বালাইনাশক ডোজ জানুন
                </button>
                <div className="flex items-center space-x-4">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Audit ID: #{Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                </div>
             </div>
          </div>
        </div>
      )}

      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title={`AI Diagnosis: ${result?.diagnosis}`} content={result?.fullText || ""} />}

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden; }
          .print\\:visible, [ref="reportRef"], [ref="reportRef"] * { visibility: visible; }
          [ref="reportRef"] { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            height: auto !important;
            border: none !important; 
            box-shadow: none !important; 
            background: white !important;
            padding: 40px !important;
          }
          header, nav, footer, button, .print\\:hidden { display: none !important; }
          @page { size: portrait; margin: 15mm; }
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(100%); }
        }
      `}} />
    </div>
  );
};

export default Analyzer;
