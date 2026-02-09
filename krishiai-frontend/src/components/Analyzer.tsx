
import React, { useState, useRef, useEffect } from 'react';
/* Fix: Removed non-existent sanitizeForTTS import */
import { getOrchestrationService } from '../services/quota/orchestrationInit';
import { getLiveWeather, decodeBase64, decodeAudioData } from '../services/ai/geminiService';
import { getStoredLocation } from '../services/utils/locationService';
import { AnalysisResult, SavedReport, UserCrop, View, Language, WeatherData, SourceReference, ManagementAdvice, AIModel, ConfidenceLevel } from '../types';
import { CROPS_BY_CATEGORY } from '../constants';
import { apiService } from '../services/utils/apiService';
import ShareDialog from './ShareDialog';
import DynamicPrecisionForm from './DynamicPrecisionForm';
import { useSpeech } from '../App';
import GuidedTour, { TourStep } from './GuidedTour';
import { ToolGuideHeader } from './ToolGuideHeader';
import { GoogleGenAI, Modality } from '@google/genai';

interface AnalyzerProps {
  userId?: string;
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
  { targetId: "analyzer-media-selector", title: "লাইভ ভিশন এআই", content: "এখন সরাসরি ভিডিও এবং অডিওর মাধ্যমে রিয়েল-টাইম ডায়াগনোসিস করতে 'লাইভ ভিশন' বাটনটি ব্যবহার করুন।", position: 'top' }
];

const Analyzer: React.FC<AnalyzerProps> = ({ userId, onAction, onSaveReport, onShowFeedback, onBack, onNavigate, userRank, userCrops = [], lang }) => {
  const orchestration = getOrchestrationService();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLiveMode, setIsLiveMode] = useState<boolean>(false);
  const [isLiveStreaming, setIsLiveStreaming] = useState<boolean>(false);
  const [liveTranscription, setLiveTranscription] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [isOrchestrationLoading, setIsOrchestrationLoading] = useState<boolean>(false);
  const [loadingStep, setLoadingStep] = useState<number>(0);
  const [sources, setSources] = useState<SourceReference[]>([]);
  const [confidence, setConfidence] = useState<number>(0);
  const [needsSecondOpinion, setNeedsSecondOpinion] = useState<boolean>(false);
  const [modelUsed, setModelUsed] = useState<AIModel>('gemini-2.5-flash');

  const { playSpeech, stopSpeech, isSpeaking, speechEnabled } = useSpeech();
  const [cropFamily, setCropFamily] = useState<string>('ধান');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string>('image/jpeg');
  const [userQuery, setUserQuery] = useState<string>('');
  const [isListening, setIsListening] = useState<boolean>(false);
  const [precisionFields, setPrecisionFields] = useState<any[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showTour, setShowTour] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const liveSessionRef = useRef<any>(null);
  const frameIntervalRef = useRef<number | null>(null);

  const loadingMessages = lang === 'bn' ? [
    "এআই অডিট সিস্টেম সক্রিয় করা হচ্ছে...",
    "বহু-মডেল ইন্টেলিজেন্স চালু হচ্ছে...",
    "CABI/BRRI/BARI ডাটাসোর্স লোড হচ্ছে...",
    "ডিপ ভিশন ইঞ্জিন প্রস্তুত হচ্ছে...",
    "রিয়েল-টাইম সিম্পটম বিশ্লেষণ চলছে...",
    "অফিসিয়াল সোর্স অনুযায়ী সমাধান খোঁজা হচ্ছে...",
    "বৈজ্ঞানিক ব্যবস্থাপত্র চূড়ান্ত করা হচ্ছে..."
  ] : [
    "AI Audit System Initializing...",
    "Multi-Model Intelligence Activating...",
    "Loading CABI/BRRI/BARI Data Sources...",
    "Deep Vision Engine Preparing...",
    "Real-Time Symptom Analysis Running...",
    "Finding Solutions Based on Official Sources...",
    "Finalizing Scientific Management Protocol..."
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
        } catch (e) { }
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

    return () => {
      stopLiveStreaming();
    };
  }, [lang]);

  useEffect(() => {
    let interval: any;
    if (isOrchestrationLoading) interval = setInterval(() => setLoadingStep(prev => (prev + 1) % loadingMessages.length), 1600);
    return () => clearInterval(interval);
  }, [isOrchestrationLoading, loadingMessages.length]);

  const startLiveMode = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } },
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

  const startLiveStreaming = async () => {
    setIsLoading(true);
    setLiveTranscription('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsLiveStreaming(true);
            setIsLoading(false);
            frameIntervalRef.current = window.setInterval(() => {
              if (videoRef.current && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                canvasRef.current.width = 320;
                canvasRef.current.height = 240;
                ctx?.drawImage(videoRef.current, 0, 0, 320, 240);
                const base64Data = canvasRef.current.toDataURL('image/jpeg', 0.5).split(',')[1];
                sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: { data: base64Data, mimeType: 'image/jpeg' } });
                });
              }
            }, 1000);
          },
          onmessage: async (message) => {
            if (message.serverContent?.outputTranscription) {
              setLiveTranscription(prev => prev + message.serverContent?.outputTranscription?.text);
            }
          },
          onerror: (e) => {
            console.error("Live Stream Error:", e);
            stopLiveStreaming();
          },
          onclose: () => stopLiveStreaming(),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          outputAudioTranscription: {},
          systemInstruction: `Role: BD Govt Senior Scientific Officer. NO INTRO. Strictly respond in ${lang === 'bn' ? 'Bangla (বাংলা)' : 'English'}.`,
        },
      });

      liveSessionRef.current = sessionPromise;
    } catch (err) {
      alert("Live stream could not be initialized.");
      setIsLoading(false);
    }
  };

  const stopLiveStreaming = () => {
    if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    const stream = videoRef.current?.srcObject as MediaStream;
    stream?.getTracks().forEach(track => track.stop());
    setIsLiveStreaming(false);
    setIsLiveMode(false);
  };

  const captureFrame = (isDeepAudit: boolean = false) => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      context?.drawImage(videoRef.current, 0, 0);
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.95);
      setSelectedMedia(dataUrl);
      setMimeType('image/jpeg');
      stopLiveMode();
      handleAnalyze(isDeepAudit, dataUrl);
    }
  };

  const handleAnalyze = async (precision: boolean = false, dataUrlOverride?: string) => {
    const mediaToAnalyze = dataUrlOverride || selectedMedia;
    const typeToAnalyze = dataUrlOverride ? 'image/jpeg' : mimeType;

    if (!mediaToAnalyze && !isLiveMode) return;

    setIsOrchestrationLoading(true);
    setResult(null);
    setPrecisionFields(null);
    setLoadingStep(0);

    try {
      const base64 = (mediaToAnalyze || '').split(',')[1] || '';
      const prompt = lang === 'bn' ?
        `Identify problem for ${cropFamily}. NO INTRO. Start immediately with [শনাক্তকরণ].` :
        `Identify problem for ${cropFamily}. NO INTRO. Start immediately with [Diagnosis].`;

      const analysisResult = await orchestration.analyzeImage(
        base64,
        {
          cropType: cropFamily,
          region: 'Dhaka',
          userId: userId,
          lang: lang,
          weather: weather,
          userQuery: userQuery
        }
      );

      setResult({
        diagnosis: analysisResult.diagnosis,
        symptoms: analysisResult.symptoms,
        confidence: analysisResult.confidence,
        confidenceLevel: analysisResult.confidenceLevel,
        model: analysisResult.model,
        reasoning: analysisResult.reasoning,
        sources: analysisResult.sources,
        management: analysisResult.management,
        timestamp: analysisResult.timestamp,
        needsSecondOpinion: analysisResult.needsSecondOpinion,
        fullText: analysisResult.diagnosis + "\n\n" + analysisResult.management.immediate.join("\n"), // Compatibility
        category: 'Other' // Default for now
      });

      setSources(analysisResult.sources);
      setConfidence(analysisResult.confidence);
      setNeedsSecondOpinion(analysisResult.needsSecondOpinion);
      setModelUsed(analysisResult.model);

      if (userId) apiService.logDiagnostic(userId, analysisResult, cropFamily);
      if (speechEnabled) playSpeech(analysisResult.management.immediate[0]);
      if (onAction) onAction();
    } catch (error: any) {
      console.error('Analysis Error:', error);
      alert(lang === 'bn' ? 'বিশ্লেষণ ব্যর্থ হয়েছে।' : 'Analysis failed.');
    } finally {
      setIsOrchestrationLoading(false);
    }
  };

  const handlePrecisionSubmit = async (dynamicData: Record<string, string>) => {
    if (!selectedMedia) return;
    setIsOrchestrationLoading(true);
    setResult(null);
    setLoadingStep(0);
    try {
      const base64 = selectedMedia.split(',')[1] || '';
      const analysis = await orchestration.analyzeImage(
        base64,
        {
          cropType: cropFamily,
          region: 'Dhaka',
          userId: userId,
          lang: lang,
          weather: weather,
          userQuery: userQuery,
          precisionData: dynamicData
        }
      );
      setResult({
        diagnosis: analysis.diagnosis,
        symptoms: analysis.symptoms,
        confidence: analysis.confidence,
        confidenceLevel: analysis.confidenceLevel,
        model: analysis.model,
        reasoning: analysis.reasoning,
        sources: analysis.sources,
        management: analysis.management,
        timestamp: analysis.timestamp,
        needsSecondOpinion: analysis.needsSecondOpinion
      });
      setPrecisionFields(null);
      if (userId) apiService.logDiagnostic(userId, analysis, cropFamily);
      if (speechEnabled) playSpeech(analysis.management.immediate[0]);
      if (onAction) onAction();
    } catch (e) {
      alert("Audit Failed.");
    } finally {
      setIsOrchestrationLoading(false);
    }
  };

  const handleSaveToHistory = async () => {
    if ((result || liveTranscription) && onSaveReport) {
      setIsSaving(true);
      try {
        onSaveReport({
          type: result ? 'Official Scientific Audit' : 'Live Vision Scan',
          title: result?.diagnosis || 'লাইভ ভিশন রিপোর্ট',
          content: result?.management.immediate[0] || liveTranscription,
          icon: '🔬',
          imageUrl: selectedMedia || undefined,
        });
        alert(lang === 'bn' ? "সংরক্ষিত হয়েছে!" : "Saved!");
      } catch (e) {
        alert("Failed to save.");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const formatResultContent = (text: string) => {
    const parts = text.split(/(\[.*?\]:?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.includes(']')) {
        return <span key={i} className="block mt-8 mb-3 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest border border-emerald-100">{part.replace(/[\[\]:]/g, '')}</span>;
      }
      return <span key={i} className="leading-relaxed opacity-90">{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      {showTour && <GuidedTour steps={ANALYZER_TOUR} tourKey="analyzer_v5" onClose={() => setShowTour(false)} />}

      {isShareOpen && (result || liveTranscription) && (
        <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title={`Audit Report`} content={result?.fullText || liveTranscription} />
      )}

      {/* Floating Status Toast - Highly Optimized */}
      {isLoading && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-bounce-in w-full max-w-xs md:max-w-sm px-4">
          <div className="bg-slate-900/95 text-white p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col space-y-4 border border-emerald-500/30 backdrop-blur-md">
            <div className="flex items-center space-x-4">
              <div className="relative shrink-0">
                <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-lg">🛰️</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Krishi AI Engine v2.5</p>
                <h4 className="text-sm font-bold truncate transition-all duration-500">{loadingMessages[loadingStep]}</h4>
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-1 px-1 py-0.5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= loadingStep ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]' : 'bg-white/5'}`}></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <ToolGuideHeader
        title={lang === 'bn' ? 'অফিসিয়াল সায়েন্টিফিক অডিট' : 'Official Scientific Audit'}
        subtitle={lang === 'bn' ? 'Qwen-VL এবং BARI/BRRI ডাটাসোর্স ভিত্তিক বৈজ্ঞানিক ডায়াগনোসিস।' : 'Scientific diagnosis powered by Qwen-VL and BARI/BRRI repositories.'}
        protocol="BARI/BRRI/DAE Grounded"
        source="Ministry of Agriculture, BD"
        lang={lang}
        onBack={onBack || (() => { })}
        icon="🔬"
        themeColor="emerald"
        guideSteps={lang === 'bn' ? ["ছবি তুলুন বা লাইভ ভিশন ব্যবহার করুন।", "এআই আপনার জন্য নির্দিষ্ট সায়েন্টিফিক প্রটোকল তৈরি করবে।", "IPM এবং সঠিক MoA গ্রুপের বিষের মাত্রা জানুন।"] : ["Capture photo or use Live Vision.", "AI generates scientific protocol.", "Learn IPM and correct MoA dosage."]}
      />

      <div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-xl border border-slate-100 mb-8 print:hidden">
        <div className="space-y-6">
          <select value={cropFamily} onChange={(e) => setCropFamily(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-lg text-slate-700 outline-none focus:border-emerald-500 appearance-none">
            {Object.values(CROPS_BY_CATEGORY).flat().map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div id="analyzer-media-selector" className="md:col-span-5 aspect-square relative">
              {isLiveStreaming ? (
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-500 shadow-2xl relative bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-scanning-line z-10"></div>
                  </div>
                  <div className="absolute top-4 left-4 z-30">
                    <span className="bg-rose-600 text-white text-[8px] font-black px-2 py-1 rounded-full animate-pulse uppercase tracking-widest">Live Scan Active</span>
                  </div>
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center px-6 z-30">
                    <button onClick={stopLiveStreaming} className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl">বন্ধ করুন</button>
                  </div>
                </div>
              ) : isLiveMode ? (
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black">
                  <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                  <div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4 px-6 z-30">
                    <button onClick={() => captureFrame(true)} className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl">অডিট করুন</button>
                    <button onClick={stopLiveMode} className="p-4 bg-red-600 text-white rounded-2xl">✕</button>
                  </div>
                </div>
              ) : selectedMedia ? (
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black group">
                  {mimeType.startsWith('video/') ? (
                    <video src={selectedMedia} className="w-full h-full object-cover" controls />
                  ) : (
                    <img src={selectedMedia} className="w-full h-full object-cover" alt="Scan" />
                  )}
                  <button onClick={() => { setSelectedMedia(null); setPrecisionFields(null); setResult(null); }} className="absolute top-4 right-4 p-2 bg-black/40 rounded-full text-white z-20">✕</button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 h-full">
                  <button onClick={startLiveStreaming} className="col-span-2 bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 flex flex-col items-center justify-center space-y-3 hover:bg-black transition-all">
                    <div className="text-4xl">🛰️</div>
                    <p className="text-[10px] font-black text-white uppercase tracking-widest">{lang === 'bn' ? 'লাইভ ভিশন এআই' : 'Live Vision AI'}</p>
                  </button>
                  <button onClick={startLiveMode} className="bg-emerald-50 rounded-[2.5rem] border-4 border-dashed border-emerald-200 flex flex-col items-center justify-center space-y-2 hover:border-emerald-500 transition-all">
                    <div className="text-3xl">📸</div>
                    <p className="text-[9px] font-black text-emerald-600 uppercase">ক্যামেরা</p>
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} className="bg-rose-50 rounded-[2.5rem] border-4 border-dashed border-rose-200 flex flex-col items-center justify-center space-y-2 hover:border-rose-500 transition-all">
                    <div className="text-3xl">🖼️</div>
                    <p className="text-[9px] font-black text-rose-600 uppercase">গ্যালারি</p>
                  </button>
                </div>
              )}

              <input type="file" ref={fileInputRef} accept="image/*,video/*" className="hidden" onChange={(e) => {
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
              <div className="flex-1 bg-slate-900 rounded-[2.5rem] p-6 flex flex-col relative overflow-hidden">
                <textarea
                  value={isLiveStreaming ? liveTranscription : userQuery}
                  readOnly={isLiveStreaming}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={isLiveStreaming ? "এআই স্ক্যান করছে..." : (lang === 'bn' ? "লক্ষণগুলো লিখুন..." : "Describe symptoms...")}
                  className="w-full flex-1 bg-transparent resize-none font-bold text-white outline-none text-lg min-h-[140px]"
                />
                <div className="flex items-center justify-between mt-4 gap-2">
                  <button onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()} className={`p-4 rounded-2xl transition-all shadow-lg ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white/10 text-emerald-400 hover:bg-white/20'}`}>🎤</button>
                  <button onClick={() => handleAnalyze(true)} disabled={isOrchestrationLoading || isLiveStreaming || (!selectedMedia && !isLiveMode)} className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.8rem] font-black text-[10px] uppercase shadow-xl disabled:opacity-50 active:scale-95 transition-all">আর্থিসিস্ট অডিট</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {precisionFields && !isLoading && !result && (
        <DynamicPrecisionForm fields={precisionFields} lang={lang} onSubmit={handlePrecisionSubmit} isLoading={isLoading} toolProtocol="SCIENTIFIC-SCAN-V5" />
      )}

      {result && !isLoading && (
        <div className="space-y-8 animate-fade-in-up">
          <div ref={reportRef} className="bg-white rounded-none border-[12px] border-slate-900 p-8 md:p-14 shadow-2xl relative overflow-hidden flex flex-col print:border-[5px]">

            {/* Model & Confidence Status */}
            <div className="flex items-center justify-between mb-6 px-4 py-2 bg-slate-50 border border-slate-200 rounded-2xl">
              <div className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${result.confidence >= 0.8 ? 'bg-emerald-500' : result.confidence >= 0.6 ? 'bg-amber-500' : 'bg-rose-500'} animate-pulse`}></div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">
                  Confidence: {(result.confidence * 100).toFixed(0)}% • Model: {result.model}
                </span>
              </div>
              {result.needsSecondOpinion && (
                <button
                  onClick={() => handleAnalyze(true)}
                  className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter hover:bg-amber-200 transition-all border border-amber-200"
                >
                  ⚠️ Get Second Opinion
                </button>
              )}
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-slate-900 pb-10 mb-10 gap-8">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em]">Agri-Diagnostic Report</p>
                  <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Verified DAE/BARI</span>
                </div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">{result.diagnosis}</h2>
              </div>
              <div className="flex space-x-2 print:hidden">
                <button onClick={() => setIsShareOpen(true)} className="p-4 rounded-2xl bg-white text-emerald-600 border border-emerald-100 shadow-sm transition-all active:scale-90">Share</button>
                <button onClick={handleSaveToHistory} disabled={isSaving} className="p-4 rounded-2xl bg-slate-900 text-white shadow-xl transition-all active:scale-90">Save</button>
                <button onClick={() => playSpeech(result.fullText || result.diagnosis)} className={`p-4 rounded-full shadow-lg ${isSpeaking ? 'bg-rose-500 animate-pulse' : 'bg-emerald-600 text-white'}`}>🔊</button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 relative z-10">
              <div className="lg:col-span-12 prose prose-slate max-w-none text-slate-800 font-medium leading-[1.8] whitespace-pre-wrap text-xl">
                <div className="mb-8">
                  <h4 className="text-xs font-black uppercase text-emerald-600 mb-4 tracking-widest border-l-4 border-emerald-600 pl-4">[Symptoms]</h4>
                  <ul className="list-disc pl-8 space-y-2 text-lg">
                    {result.symptoms.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>

                <div className="mb-8 bg-emerald-50/50 p-8 rounded-[2rem] border border-emerald-100">
                  <h4 className="text-xs font-black uppercase text-emerald-600 mb-4 tracking-widest">[Scientific Advisory]</h4>
                  <div className="space-y-4">
                    {result.management.immediate.map((action, i) => (
                      <p key={i} className="text-xl font-bold text-slate-900 leading-snug">✓ {action}</p>
                    ))}
                  </div>
                </div>

                {result.management.chemical.length > 0 && (
                  <div className="mb-8 p-8 bg-slate-50 rounded-[2rem] border border-slate-200">
                    <h4 className="text-xs font-black uppercase text-slate-500 mb-4 tracking-widest">[Chemical Control - DAE Recommended]</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {result.management.chemical.map((chem, i) => (
                        <div key={i} className="bg-white p-4 rounded-xl border border-slate-100">
                          <p className="font-bold text-blue-700">{chem.product}</p>
                          <p className="text-sm opacity-70">Dosage: {chem.concentration} | Interval: {chem.interval}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sources & Citations */}
                {result.sources.length > 0 && (
                  <div className="mt-12 pt-8 border-t-2 border-slate-100">
                    <h4 className="text-xs font-black uppercase text-slate-400 mb-6 tracking-widest">Scientific Evidence & Grounding</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {result.sources.map((source, i) => (
                        <a key={i} href={source.url} target="_blank" rel="noopener noreferrer" className="flex flex-col p-4 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors border border-slate-200 group">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-[10px] font-black text-emerald-600 uppercase transform transition-transform group-hover:scale-105">{source.source.replace('_', ' ')}</span>
                            <span className="text-[10px] font-bold text-slate-400">Relevance: {(source.relevanceScore * 100).toFixed(0)}%</span>
                          </div>
                          <h5 className="font-bold text-sm text-slate-800 line-clamp-1">{source.title}</h5>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-1 leading-relaxed italic">"{source.excerpt}"</p>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Metadata Footer */}
            <div className="mt-16 pt-8 border-t border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 opacity-50">
              <div className="flex items-center space-x-4">
                <div className="flex flex-col items-start">
                  <span className="text-[8px] font-black uppercase text-slate-400">Primary Engine</span>
                  <span className="text-[10px] font-bold text-slate-700">{result.model}</span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex flex-col items-start">
                  <span className="text-[8px] font-black uppercase text-slate-400">Version</span>
                  <span className="text-[10px] font-bold text-slate-700">v2.1.0-BD</span>
                </div>
                <div className="w-px h-6 bg-slate-200"></div>
                <div className="flex flex-col items-start">
                  <span className="text-[8px] font-black uppercase text-slate-400">Protocol</span>
                  <span className="text-[10px] font-bold text-slate-700">BARI/BRRI-2025</span>
                </div>
              </div>
              <div className="text-center md:text-right">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-[0.2em]">Scientific Audit Active • Grounded Research</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analyzer;
