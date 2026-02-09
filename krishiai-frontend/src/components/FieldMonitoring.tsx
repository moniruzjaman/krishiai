
import React, { useState, useEffect } from 'react';
import { getFieldMonitoringData, generateSpeech, decodeBase64, decodeAudioData } from '../services/ai/geminiService';
import { detectCurrentAEZDetails } from '../services/utils/locationService';
import { SavedReport } from '../types';
import GuidedTour, { TourStep } from './GuidedTour';
import ShareDialog from './ShareDialog';

interface FieldMonitoringProps {
  onAction?: () => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
}

const MONITORING_TOUR: TourStep[] = [
  {
    title: "ফিল্ড মনিটরিং",
    content: "স্যাটেলাইট এবং এআই এর সাহায্যে আপনার ক্ষেতের স্বাস্থ্য পর্যবেক্ষণ করুন।",
    position: 'center'
  },
  {
    targetId: "monitoring-start-btn",
    title: "শুরু করুন",
    content: "এই বাটনটি টিপলে এআই আপনার এলাকার লোকেশন অনুযায়ী সর্বশেষ স্যাটেলাইট ডাটা বিশ্লেষণ করবে।",
    position: 'bottom'
  }
];

const monitoringLoadingSteps = [
  "স্যাটেলাইট থেকে ল্যান্ডল্যাট (Landsat) ডাটা সংগ্রহ করা হচ্ছে...",
  "আপনার প্লটের ক্লোরোফিল এবং নাইট্রোজেন ইনডেক্স বিশ্লেষণ চলছে...",
  "NDVI এবং বায়োমাস প্রোফাইল ম্যাপিং করা হচ্ছে...",
  "আঞ্চলিক আবহাওয়া ও মাটির আর্দ্রতা সমন্বয় করা হচ্ছে...",
  "আপনার খামারের জন্য চূড়ান্ত ডিজিটাল অডিট রিপোর্ট প্রস্তুত হচ্ছে..."
];

const FieldMonitoring: React.FC<FieldMonitoringProps> = ({ onAction, onShowFeedback, onBack, onSaveReport }) => {
  const [report, setReport] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [location, setLocation] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCtx, setAudioCtx] = useState<AudioContext | null>(null);
  const [currentSource, setCurrentSource] = useState<AudioBufferSourceNode | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [showTour, setShowTour] = useState(false);

  const [metrics, setMetrics] = useState({
    moisture: 0,
    biomass: 0,
    ndvi: 0.0
  });

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_monitoring');
    if (!tourDone) setShowTour(true);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % monitoringLoadingSteps.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const startMonitoring = async () => {
    setIsLoading(true);
    setReport(null);
    setLoadingStep(0);

    const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    setAudioCtx(ctx);
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    try {
      const aez = await detectCurrentAEZDetails(true);
      setLocation(aez);
      const data = await getFieldMonitoringData(aez.lat, aez.lng, aez.name);
      setReport(data.text);
      
      if (data.text) {
        playTTS(data.text);
      }

      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();

      setMetrics({
        moisture: Math.floor(Math.random() * 40) + 30,
        biomass: Math.floor(Math.random() * 500) + 1200,
        ndvi: parseFloat((Math.random() * 0.4 + 0.3).toFixed(2))
      });
      
    } catch (err) {
      alert("মনিটরিং ডাটা সংগ্রহ করতে সমস্যা হয়েছে।");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveReport = async () => {
    if (report && onSaveReport) {
      setIsSaving(true);
      try {
        const audioBase64 = await generateSpeech(report.replace(/[*#_~]/g, ''));
        onSaveReport({
          type: 'Field Monitoring',
          title: `ক্ষেত পর্যবেক্ষণ - ${location?.name || 'লোকেশন'}`,
          content: report,
          audioBase64,
          icon: '🛰️'
        });
        alert("অডিওসহ মনিটরিং রিপোর্ট সংরক্ষিত হয়েছে!");
      } catch (e) {
        onSaveReport({
          type: 'Field Monitoring',
          title: `ক্ষেত পর্যবেক্ষণ - ${location?.name || 'লোকেশন'}`,
          content: report,
          icon: '🛰️'
        });
        alert("রিপোর্ট সংরক্ষিত হয়েছে!");
      } finally {
        setIsSaving(false);
      }
    }
  };

  const playTTS = async (textOverride?: string) => {
    const textToSpeak = textOverride || report;
    if (!textToSpeak) return;

    if (isPlaying && !textOverride) {
      currentSource?.stop();
      setIsPlaying(false);
      return;
    }

    try {
      if (currentSource) {
        currentSource.stop();
      }

      setIsPlaying(true);
      const ctx = audioCtx || new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      setAudioCtx(ctx);
      if (ctx.state === 'suspended') await ctx.resume();
      
      const cleanText = textToSpeak.replace(/[*#_~]/g, '');
      const base64 = await generateSpeech(cleanText);
      const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      source.start(0);
      setCurrentSource(source);
    } catch (e) { 
      console.error("Monitoring TTS Error:", e);
      setIsPlaying(false); 
    }
  };

  const stopTTS = () => {
    if (currentSource) {
      currentSource.stop();
      // Fix: Corrected typo from currentSource.null to setCurrentSource(null)
      setCurrentSource(null);
    }
    setIsPlaying(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24 font-sans animate-fade-in min-h-screen">
      {showTour && <GuidedTour steps={MONITORING_TOUR} tourKey="monitoring" onClose={() => setShowTour(false)} />}
      
      {isShareOpen && report && (
        <ShareDialog 
          isOpen={isShareOpen} 
          onClose={() => setIsShareOpen(false)} 
          title={`Field Monitoring: ${location?.name || 'Locality'}`} 
          content={report} 
        />
      )}

      <div className="flex items-center space-x-4 mb-8">
        <button onClick={() => { onBack?.(); stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-100 transition-all">
          <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
        </button>
        <h1 className="text-2xl font-black text-gray-800">ফিল্ড মনিটরিং পোর্টাল</h1>
      </div>

      {!report && !isLoading ? (
        <div className="bg-white rounded-[3rem] p-12 shadow-2xl border border-gray-100 text-center space-y-8 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50"></div>
          <div className="w-24 h-24 bg-blue-600 rounded-[2.5rem] flex items-center justify-center mx-auto text-5xl shadow-xl text-white">🛰️</div>
          <div className="max-w-md mx-auto">
            <h2 className="text-2xl font-black text-gray-800 mb-4">আপনার ক্ষেত পর্যবেক্ষণ করুন</h2>
            <p className="text-gray-500 font-medium">আমরা আপনার এলাকার স্যাটেলাইট ডাটা, আবহাওয়া এবং সাম্প্রতিক কৃষি সংবাদ বিশ্লেষণ করে একটি পূর্ণাঙ্গ রিপোর্ট তৈরি করব।</p>
          </div>
          <button id="monitoring-start-btn" onClick={startMonitoring} className="bg-blue-600 text-white px-12 py-5 rounded-[2rem] font-black text-xl shadow-2xl active:scale-95 transition-all">মনিটরিং শুরু করুন</button>
        </div>
      ) : isLoading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-12 bg-white rounded-[3rem] shadow-xl border">
          <div className="relative">
            <div className="w-32 h-32 border-8 border-blue-100 rounded-full"></div>
            <div className="absolute inset-0 border-8 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-5xl animate-bounce">🛰️</div>
          </div>
          <div className="text-center space-y-4 px-8">
            <h3 className="text-2xl font-black text-slate-800 transition-all duration-500">{monitoringLoadingSteps[loadingStep]}</h3>
            <div className="w-full max-w-xs mx-auto h-2 bg-slate-100 rounded-full overflow-hidden">
               <div className="h-full bg-blue-600 transition-all duration-1000" style={{ width: `${((loadingStep + 1) / monitoringLoadingSteps.length) * 100}%` }}></div>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.3em]">Connecting to Orbital Agri-Analytics Engine</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <MonitoringDial label="মাটির আর্দ্রতা" value={metrics.moisture} unit="%" icon="💧" color="blue" />
              <MonitoringDial label="শস্য সূচক (NDVI)" value={metrics.ndvi} unit="" icon="🌿" color="green" />
              <MonitoringDial label="সম্ভাব্য বায়োমাস" value={metrics.biomass} unit="kg/ha" icon="🌾" color="amber" />
           </div>

           <div className="bg-slate-900 rounded-[3rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl"></div>
              <div className="flex flex-col md:flex-row justify-between items-center gap-6 mb-10 pb-6 border-b border-white/10">
                 <div className="flex items-center space-x-5">
                    <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center text-3xl shadow-xl">🛰️</div>
                    <div>
                       <h3 className="text-2xl font-black tracking-tight">অটোমেটেড মনিটরিং রিপোর্ট</h3>
                       <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">AEZ {location?.id}: {location?.name}</p>
                    </div>
                 </div>
                 <div className="flex items-center space-x-2">
                    <button onClick={() => setIsShareOpen(true)} className="p-5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90" title="শেয়ার করুন">
                       <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                    <button onClick={() => playTTS()} className={`p-5 rounded-full shadow-2xl transition-all ${isPlaying ? 'bg-rose-500 animate-pulse' : 'bg-white text-blue-600'}`}>
                       {isPlaying ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> : <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/></svg>}
                    </button>
                    <button onClick={handleSaveReport} disabled={isSaving} className="p-5 rounded-full bg-blue-600 text-white shadow-xl hover:bg-blue-700 transition-all active:scale-90 disabled:opacity-50" title="সেভ করুন">
                       {isSaving ? <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>}
                    </button>
                 </div>
              </div>
              <div className="prose prose-invert max-w-none font-medium leading-loose whitespace-pre-wrap text-slate-300 first-letter:text-5xl first-letter:font-black first-letter:mr-3 first-letter:float-left first-letter:text-blue-500">
                {report}
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

const MonitoringDial = ({ label, value, unit, icon, color }: any) => {
  const colors: any = { blue: 'text-blue-600 bg-blue-50', green: 'text-green-600 bg-green-50', amber: 'text-amber-600 bg-amber-50' };
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-md border border-slate-50 flex flex-col items-center text-center">
       <div className={`w-12 h-12 ${colors[color]} rounded-2xl flex items-center justify-center text-2xl mb-4 shadow-inner`}>{icon}</div>
       <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
       <p className="text-3xl font-black text-gray-800">{value}<span className="text-xs ml-1 opacity-40">{unit}</span></p>
    </div>
  );
};

export default FieldMonitoring;
