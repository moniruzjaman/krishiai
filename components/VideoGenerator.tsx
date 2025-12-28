
import React, { useState, useEffect } from 'react';
import { generateAgriVideo } from '../services/geminiService';

interface VideoGeneratorProps {
  prompt: string;
  onClose: () => void;
  title: string;
}

const loadingMessages = [
  "গবেষণা তথ্য বিশ্লেষণ করা হচ্ছে...",
  "AI ভিডিও ফ্রেম তৈরি করছে...",
  "মাঠের চিত্র এবং লক্ষণগুলো সমন্বয় হচ্ছে...",
  "চাষাবাদ পদ্ধতির কাল্পনিক চিত্রায়ন চলছে...",
  "ভিডিও রেন্ডারিং শেষ পর্যায়ে..."
];

export const VideoGenerator: React.FC<VideoGeneratorProps> = ({ prompt, onClose, title }) => {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % loadingMessages.length);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleStartGeneration = async () => {
    // 1. Mandatory Key Selection Flow for Veo Models
    // @ts-ignore
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      try {
        // @ts-ignore
        await window.aistudio.openSelectKey();
        // Proceeding directly after trigger as per guidelines to mitigate race conditions
      } catch (err) {
        setError("API Key সিলেকশন সফল হয়নি।");
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    try {
      const url = await generateAgriVideo(prompt);
      setVideoUrl(url);
    } catch (err: any) {
      console.error(err);
      if (err?.message?.includes("Requested entity was not found")) {
        setError("পেইড API Key প্রয়োজন। অনুগ্রহ করে আবার কানেক্ট করুন।");
        // @ts-ignore
        await window.aistudio.openSelectKey();
      } else {
        setError("ভিডিও তৈরিতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-xl animate-fade-in font-sans">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-[0_0_100px_rgba(10,138,31,0.2)] overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-slate-900 p-8 text-white flex justify-between items-start">
          <div>
            <div className="inline-flex items-center space-x-2 bg-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-2 border border-white/20">
               <span className="flex h-2 w-2 rounded-full bg-white animate-pulse"></span>
               <span>AI Video Tutorial</span>
            </div>
            <h2 className="text-2xl font-black tracking-tight">{title}</h2>
            <p className="text-xs text-slate-400 font-bold uppercase mt-1">Powered by Google Veo 3.1</p>
          </div>
          <button onClick={onClose} className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all">
             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center justify-center text-center">
          {videoUrl ? (
            <div className="w-full space-y-8 animate-fade-in">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl border-4 border-slate-900 bg-black aspect-video flex items-center justify-center">
                 <video src={videoUrl} controls autoPlay className="w-full h-full" />
              </div>
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                 <a href={videoUrl} download="Tutorial.mp4" className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex items-center justify-center space-x-3">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    <span>ডাউনলোড করুন</span>
                 </a>
                 <button onClick={handleStartGeneration} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all">পুনরায় তৈরি করুন</button>
              </div>
            </div>
          ) : isLoading ? (
            <div className="py-12 space-y-10 w-full max-w-sm">
               <div className="relative">
                  <div className="w-32 h-32 border-8 border-emerald-50 border-t-emerald-600 rounded-full animate-spin mx-auto"></div>
                  <div className="absolute inset-0 flex items-center justify-center text-4xl">🎬</div>
               </div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-2">{loadingMessages[loadingStep]}</h3>
                  <p className="text-sm text-slate-400 font-bold leading-relaxed">এই প্রক্রিয়াটি ১-২ মিনিট সময় নিতে পারে। অনুগ্রহ করে এই উইন্ডোটি বন্ধ করবেন না।</p>
               </div>
               <div className="space-y-2">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                     <div className="h-full bg-emerald-600 animate-[grow_120s_linear_forwards]" style={{width: '0%'}}></div>
                  </div>
                  <style dangerouslySetInnerHTML={{ __html: `@keyframes grow { from { width: 0%; } to { width: 95%; } }` }} />
               </div>
            </div>
          ) : (
            <div className="max-w-md space-y-10 py-10">
               <div className="w-24 h-24 bg-emerald-50 rounded-[2rem] flex items-center justify-center mx-auto text-5xl shadow-inner">📽️</div>
               <div>
                  <h3 className="text-2xl font-black text-slate-800 mb-4">ভিডিও টিউটোরিয়াল জেনারেটর</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                     আপনার পছন্দের সমস্যার উপর ভিত্তি করে AI একটি ৪-সেকেন্ডের শিক্ষামূলক ভিডিও তৈরি করবে। এটি রোগের সঠিক লক্ষণ এবং দমনের বাস্তবমুখী দৃশ্য দেখাবে।
                  </p>
               </div>
               {error && (
                 <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-100 text-xs font-bold leading-relaxed">
                   ⚠️ {error}
                 </div>
               )}
               <div className="space-y-4">
                  <button 
                    onClick={handleStartGeneration} 
                    className="w-full bg-[#0A8A1F] text-white px-10 py-5 rounded-[2rem] font-black text-xl shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-4"
                  >
                    <span>ভিডিও তৈরি শুরু করুন</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                  </button>
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">নোট: পেইড গুগল ক্লাউড API Key প্রয়োজন</p>
               </div>
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 100-2 1 1 0 000 2zm6 0a1 1 0 100-2 1 1 0 000 2zM8 13a1 1 0 112 0 1 1 0 01-2 0z"/></svg>
              AI জেনারেটেড ভিডিও • শুধুমাত্র শিক্ষামূলক উদ্দেশ্যে
           </p>
        </div>
      </div>
    </div>
  );
};
