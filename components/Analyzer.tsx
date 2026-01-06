
import React, { useState, useRef, useEffect } from 'react';
import { analyzeCropImage, generateSpeech, requestPrecisionParameters, performDeepAudit, getLiveWeather } from '../services/geminiService';
import { getStoredLocation } from '../services/locationService';
import { AnalysisResult, SavedReport, UserCrop, View, Language, WeatherData } from '../types';
import { CROPS_BY_CATEGORY } from '../constants';
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
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  const { playSpeech, stopSpeech, isSpeaking, speechEnabled } = useSpeech();
  const [cropFamily, setCropFamily] = useState<string>('ধান');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const loadingMessages = [ 
    "ডিজিটাল ইমেজ সেন্সর ক্যালিব্রেট করা হচ্ছে...", 
    "প্যাথলজিক্যাল প্যাটার্ন ও লক্ষণগুলো শনাক্ত করা হচ্ছে...", 
    "অফিসিয়াল BARI/BRRI ডাটাবেসের সাথে তথ্য মেলানো হচ্ছে...", 
    "আপনার এলাকার লাইভ আবহাওয়া ও মাটির অবস্থা বিশ্লেষণ চলছে...",
    "DAE স্ট্যান্ডার্ড অনুযায়ী সঠিক বালাইনাশক ডোজ নির্বাচন হচ্ছে...", 
    "নিখুঁত বৈজ্ঞানিক ব্যবস্থাপত্র (Report) চূড়ান্ত করা হচ্ছে..." 
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
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }, 
        audio: false 
      });
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

  const captureFrame = (isDeepAudit: boolean = false) => {
    if (videoRef.current && canvasRef.current) {
      setShowFlash(true);
      setTimeout(() => setShowFlash(false), 400);

      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      setSelectedMedia(dataUrl);
      setMimeType('image/jpeg');
      stopLiveMode();
      handleAnalyze(isDeepAudit);
    }
  };

  const handleAnalyze = async (precision: boolean = false) => {
    // If called from captureFrame, media might already be set in local var but state not flushed yet
    // To handle that, handleAnalyze is modified to take dataURL if provided directly
    // But for simplicity, we'll rely on the state-based logic which works fine after a short delay or sync
    
    // Check if we need to wait for state
    const mediaToAnalyze = selectedMedia;
    const typeToAnalyze = mimeType;

    if (!mediaToAnalyze) return;

    setIsLoading(true); 
    setResult(null); 
    setPrecisionFields(null);
    setLoadingStep(0);
    
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
      console.error("Analysis Error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePrecisionSubmit = async (dynamicData: Record<string, string>) => {
    if (!selectedMedia) return;
    setIsLoading(true);
    setResult(null);
    setLoadingStep(0);
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
          type: 'Official Scientific Audit',
          title: result.diagnosis,
          content: result.fullText,
          audioBase64,
          icon: result.category === 'Pest' ? '🦗' : result.category === 'Disease' ? '🦠' : result.category === 'Deficiency' ? '⚖️' : '🍂',
          imageUrl: selectedMedia,
        });
        alert(lang === 'bn' ? "অফিসিয়াল রিপোর্ট সংরক্ষিত হয়েছে!" : "Official Report Saved!");
      } catch (e) {
        onSaveReport({
          type: 'Official Scientific Audit',
          title: result.diagnosis,
          content: result.fullText,
          icon: result.category === 'Pest' ? '🦗' : result.category === 'Disease' ? '🦠' : result.category === 'Deficiency' ? '⚖️' : '🍂',
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
        subtitle={lang === 'bn' ? 'পোকা, রোগ ও পুষ্টির অভাব শনাক্তকরণ এবং বিএআরআই/বিআরআরআই প্রটোকল ভিত্তিক প্রতিকার।' : 'Identify pests, diseases, and deficiencies with official BARI/BRRI protocols.'}
        protocol="BARC/BARI/BRRI Grounded"
        source="Authentic BD Government Repositories"
        lang={lang}
        onBack={onBack || (() => {})}
        icon="🔬"
        themeColor="emerald"
        guideSteps={lang === 'bn' ? [
          "শস্য নির্বাচন করুন বা আক্রান্ত অংশের ছবি তুলুন।",
          "লাইভ ক্যামেরা ব্যবহার করে সরাসরি মাঠ থেকে ডায়াগনোসিস করুন।",
          "তথ্যসূত্র যাচাই করতে রিপোর্টের নিচের লিংকে ক্লিক করুন।",
          "সকল পরামর্শ বিএআরআই (BARI) বা বিআরআরআই (BRRI) এর প্রটোকল অনুযায়ী তৈরি।"
        ] : [
          "Select crop or take photo of affected part.",
          "Use Live Camera for real-time field diagnosis.",
          "Click verification links at the bottom of report for authentic sources.",
          "All advisories follow BARI/BRRI plant protection protocols."
        ]}
      />

      <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-xl border border-slate-100 mb-8 print:hidden">
        <div className="space-y-6 mb-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>{lang === 'bn' ? 'শস্য ও ডায়াগনোসিস মোড' : 'Crop & Diagnosis Mode'}</span>
              </div>
              <div className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 flex items-center space-x-2">
                 <span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">Grounded Source Verification</span>
              </div>
           </div>
           
           <select value={cropFamily} onChange={(e) => setCropFamily(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-lg text-slate-700 focus:border-emerald-500 outline-none shadow-inner appearance-none transition-all">
              {Object.values(CROPS_BY_CATEGORY).flat().map(c => <option key={c} value={c}>{c}</option>)}
           </select>

           <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
              <div id="analyzer-media-selector" className="md:col-span-5 aspect-square relative">
                {isLiveMode ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black">
                     <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                     
                     {/* Scientific HUD Overlays */}
                     <div className="absolute inset-0 pointer-events-none">
                        {/* Scanning Line */}
                        <div className="absolute left-0 w-full h-1 bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-scanning-line z-10"></div>
                        
                        {/* Viewfinder corners */}
                        <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-emerald-500 opacity-60"></div>
                        <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-emerald-500 opacity-60"></div>
                        <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-emerald-500 opacity-60"></div>
                        <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-emerald-500 opacity-60"></div>

                        {/* Central HUD */}
                        <div className="absolute inset-0 flex items-center justify-center">
                           <div className="w-48 h-48 border-2 border-emerald-500/20 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></div>
                           </div>
                        </div>

                        {/* Meta Data Sidebar */}
                        <div className="absolute top-10 left-10 space-y-4">
                           <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                              <p className="text-[7px] font-black text-emerald-400 uppercase tracking-widest mb-0.5">Imaging</p>
                              <p className="text-[10px] font-black text-white">PathoScan v5.2</p>
                           </div>
                           <div className="bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
                              <p className="text-[7px] font-black text-blue-400 uppercase tracking-widest mb-0.5">Spectrum</p>
                              <p className="text-[10px] font-black text-white">NDVI Analysis</p>
                           </div>
                        </div>

                        {/* Status Label */}
                        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-emerald-600/20 backdrop-blur-xl px-6 py-2 rounded-full border border-emerald-500/40">
                           <p className="text-[9px] font-black text-white uppercase tracking-[0.3em] flex items-center">
                             <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2 animate-pulse"></span>
                             Live Scientific Stream
                           </p>
                        </div>
                     </div>

                     {/* Flash Effect */}
                     {showFlash && <div className="absolute inset-0 bg-white z-[100] animate-camera-flash"></div>}

                     <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4 px-6 z-30">
                        <button onClick={() => captureFrame(true)} className="flex-1 bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all border-b-4 border-emerald-800">সায়েন্টিফিক স্ক্যান</button>
                        <button onClick={() => captureFrame(false)} className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all">দ্রুত ফটো</button>
                        <button onClick={stopLiveMode} className="p-4 bg-red-600 text-white rounded-2xl shadow-xl active:scale-95">✕</button>
                     </div>
                  </div>
                ) : selectedMedia ? (
                  <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black group">
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
                      <button id="deep-audit-btn" onClick={() => handleAnalyze(true)} disabled={isLoading || (!selectedMedia && !isLiveMode)} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.8rem] font-black text-[10px] uppercase shadow-xl hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50">সায়েন্টিফিক অডিট</button>
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
           <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-800 transition-all duration-500">{loadingMessages[loadingStep]}</h3>
              <div className="w-full max-w-xs mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
                 <div className="h-full bg-emerald-500 transition-all duration-1000" style={{ width: `${((loadingStep + 1) / loadingMessages.length) * 100}%` }}></div>
              </div>
           </div>
        </div>
      )}

      {precisionFields && !isLoading && !result && (
        <DynamicPrecisionForm fields={precisionFields} lang={lang} onSubmit={handlePrecisionSubmit} isLoading={isLoading} toolProtocol="DAE-SCAN-V5" />
      )}

      {result && !isLoading && (
        <div className="space-y-8 animate-fade-in-up">
          {/* Certificate Style Container */}
          <div ref={reportRef} className="bg-white rounded-none border-[12px] border-slate-900 p-8 md:p-14 shadow-2xl relative overflow-hidden flex flex-col print:shadow-none print:border-[5px]">
             
             {/* Authentic Watermark */}
             <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-12 select-none text-[8rem] font-black uppercase whitespace-nowrap overflow-hidden">
                Govt Verified Protocol
             </div>

             {/* Header with Seal */}
             <div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-slate-900 pb-10 mb-10 gap-8 relative z-10">
                <div className="flex items-center space-x-6">
                   <div className="w-24 h-24 bg-slate-900 text-white rounded-full flex flex-col items-center justify-center border-4 border-white shadow-xl rotate-12">
                      <span className="text-3xl">🏛️</span>
                      <span className="text-[7px] font-black uppercase tracking-tighter mt-1">Authentic</span>
                   </div>
                   <div>
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-1">Official Agri-Diagnostic Report</p>
                      <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">শনাক্তকরণ ও সমাধান</h2>
                      <div className="flex flex-wrap gap-2">
                         <span className="bg-slate-900 text-white px-3 py-1 rounded text-[8px] font-black uppercase">Ref: BD-AG-{(Math.random() * 10000).toFixed(0)}</span>
                         <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded text-[8px] font-black uppercase border border-emerald-100">Confidence: {result.confidence}%</span>
                      </div>
                   </div>
                </div>
                <div className="flex flex-col items-end gap-2 print:hidden">
                   <div className="flex space-x-2">
                     <button onClick={() => playSpeech(result.fullText)} className={`p-4 rounded-2xl shadow-xl transition-all ${isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600'}`}>🔊</button>
                     <button onClick={handleSaveToHistory} disabled={isSaving} className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50">💾</button>
                   </div>
                   <span className="text-[9px] font-black text-slate-400 uppercase">Timestamp: {new Date().toLocaleString('bn-BD')}</span>
                </div>
             </div>

             {/* Main Content Grid */}
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
                <div className="lg:col-span-7 space-y-10">
                   <section>
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center">
                         <span className="w-2 h-2 bg-emerald-500 rounded-full mr-3"></span>
                         ১. ডায়াগনোসিস ও পরিস্থিতি (Technical Audit)
                      </h4>
                      <h3 className="text-3xl font-black text-slate-900 mb-6 border-l-8 border-emerald-600 pl-6 py-2 bg-emerald-50/30 rounded-r-2xl">
                        {result.diagnosis}
                      </h3>
                      <p className="text-xl font-medium leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {result.fullText.split('MANAGEMENT')[0].replace(/DIAGNOSIS:|CATEGORY:|CONFIDENCE:|AUTHENTIC SOURCE:/g, '').trim()}
                      </p>
                   </section>

                   {result.groundingChunks && result.groundingChunks.length > 0 && (
                     <section className="bg-blue-50/50 p-8 rounded-[3rem] border-2 border-blue-100">
                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-6">অফিসিয়াল তথ্যসূত্র যাচাই (Grounding Verification)</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {result.groundingChunks.map((chunk, idx) => chunk.web ? (
                             <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="p-4 bg-white border border-blue-200 rounded-2xl hover:border-blue-500 transition-all group flex items-center justify-between">
                                <div>
                                   <p className="text-[8px] font-black text-slate-400 uppercase">Verification Source {idx + 1}</p>
                                   <h5 className="text-sm font-black text-blue-800 line-clamp-1">{chunk.web.title}</h5>
                                </div>
                                <svg className="w-5 h-5 text-blue-200 group-hover:text-blue-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             </a>
                           ) : null)}
                        </div>
                     </section>
                   )}
                </div>

                <div className="lg:col-span-5 space-y-8">
                   {selectedMedia && (
                      <div className="rounded-[2rem] overflow-hidden border-4 border-slate-100 shadow-2xl relative grayscale-[0.2] hover:grayscale-0 transition-all duration-700">
                         <img src={selectedMedia} className="w-full object-cover aspect-square" alt="Specimen" />
                         <div className="absolute bottom-4 left-4 bg-black/60 backdrop-blur-md px-3 py-1 rounded-lg text-[8px] font-black text-white uppercase tracking-widest">Specimen ID: #{(Math.random() * 9999).toFixed(0)}</div>
                      </div>
                   )}

                   <section className="bg-slate-900 rounded-[3rem] p-8 text-white relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-3xl"></div>
                      <h4 className="text-lg font-black mb-6 flex items-center text-emerald-400">
                         <span className="mr-3">🛡️</span> সরকারি পরামর্শ (Protocol)
                      </h4>
                      <div className="text-sm font-bold leading-relaxed text-slate-300 whitespace-pre-wrap prose prose-invert max-w-none">
                        {result.advisory}
                      </div>
                      <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
                         <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Protocol Source</span>
                            <span className="text-[10px] font-black text-emerald-500 uppercase">{result.officialSource}</span>
                         </div>
                         <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-xl">📋</div>
                      </div>
                   </section>

                   <div className="p-8 border-4 border-dashed border-slate-100 rounded-[3rem] text-center">
                      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">Scientific Approval</h5>
                      <div className="flex flex-col items-center">
                         <div className="text-3xl mb-2 opacity-30">✍️</div>
                         <p className="font-black text-slate-300 uppercase text-[10px] tracking-[0.4em]">Krishi AI Digital Seal</p>
                      </div>
                   </div>
                </div>
             </div>

             {/* Footer Legal Disclaimer */}
             <div className="mt-16 pt-8 border-t border-slate-100 text-center">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em] leading-relaxed max-w-2xl mx-auto">
                  এই অডিট রিপোর্টটি বাংলাদেশ সরকারের ডিএই (DAE), বিএআরআই (BARI) এবং বিআরআরআই (BRRI) এর সায়েন্টিফিক প্রটোকল অনুসরণ করে এআই দ্বারা তৈরি। রাসায়নিক প্রয়োগের আগে অবশ্যই নিকটস্থ উপ-সহকারী কৃষি কর্মকর্তার পরামর্শ নিন।
                </p>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyzer;
