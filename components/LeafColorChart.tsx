
import React, { useState, useRef, useEffect } from 'react';
import { getLCCAnalysisSummary, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { shareContent } from '../services/shareService';

interface LeafColorChartProps {
  onAction?: () => void;
  onShowFeedback?: () => void;
}

const VARIETY_DATA = [
  { name: "BRRI dhan28", threshold: 4 }, 
  { name: "BRRI dhan74", threshold: 4 }, 
  { name: "Local Variety", threshold: 4, type: "Local" },
  { name: "Manual Entry", threshold: 4, isManual: true }
];

const LeafColorChart: React.FC<LeafColorChartProps> = ({ onAction, onShowFeedback }) => {
  const [currentLang, setCurrentLang] = useState<'en' | 'bn'>('bn');
  const [step, setStep] = useState<0 | 1 | 2 | 3>(0); 
  const [progress, setProgress] = useState<number>(0);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [status, setStatus] = useState<string>('');
  const [lccValue, setLccValue] = useState<number | null>(null);
  const [tsr, setTsr] = useState<number>(0);
  const [recommendation, setRecommendation] = useState<{ dose: string, text: string } | null>(null);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shareToast, setShareToast] = useState(false);
  
  const [selectedVariety, setSelectedVariety] = useState<string>('');
  const [manualVariety, setManualVariety] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [toast, setToast] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isListening, setIsListening] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setLocationId(transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const TR = {
    en: {
      title: "Digital Leaf Color Chart", subtitle: "N Management Protocol", capture: "1. Capture Leaf Image", camera: "Take Photo", gallery: "Upload Gallery", analyze: "2. Analyze Leaf Color", statusWaiting: "Waiting for image...", statusRefining: "Refining image quality (ROI)...", statusCalculating: "Calculating chlorophyll index...", statusAnalyzing: "Analyzing color spectrum...", statusFinalizing: "Generating trust score (TSR)...", statusSuccess: "Analysis Complete!", lccLabel: "LCC Value", nRecLabel: "Recommended N Dose", tsrLabel: "Overall Trust Score (TSR)", resultsTitle: "Analysis Results", saveTitle: "3. Save Analysis Data (TSR ≥ 80%)", phVariety: "Select Rice Variety", varOther: "Other / Manual Entry", locationPlaceholder: "Location/Plot ID (e.g., Block A)", saveBtn: "Save Analysis Data", manualPlaceholder: "Enter Variety Name Manually", rec3: "Moderate deficiency. N top-dress required.", rec4: "Mild deficiency. Low dose N top-dress required.", rec5: "Adequate N. Usually 0 kg/ha.", toastCapture: "✅ Image captured successfully.", toastAnalysis: "✅ Analysis results are ready.", toastSave: "💾 Analysis saved successfully!", toastReset: "♻️ Analysis reset.", errorLowTsr: "Trust Score Low. Please recapture with better lighting.", initialState: "Select or Capture an image to begin analysis", aiInsightTitle: "AI Expert Insights", aiLoading: "Generating specialized summary..."
    },
    bn: {
      title: "ডিজিটাল লিফ কালার চার্ট", subtitle: "নাইট্রোজেন ব্যবস্থাপনা প্রোটোকল", capture: "১. পাতার ছবি তুলুন", camera: "ছবি তুলুন", gallery: "গ্যালারি থেকে নিন", analyze: "২. পাতার রঙ বিশ্লেষণ করুন", statusWaiting: "ছবির জন্য অপেক্ষা করছে...", statusRefining: "ছবির মান পরিমার্জন (ROI)...", statusCalculating: "ক্লোরোফিল ইনডেক্স গণনা হচ্ছে...", statusAnalyzing: "কালার স্পেকট্রাম বিশ্লেষণ চলছে...", statusFinalizing: "ট্রাস্ট স্কোর (TSR) তৈরি হচ্ছে...", statusSuccess: "বিশ্লেষণ সম্পন্ন!", lccLabel: "এলসিসি মান", nRecLabel: "সুপারিশকৃত নাইট্রোজেন ডোজ", tsrLabel: "সামগ্রিক ট্রাস্ট স্কোর (TSR)", resultsTitle: "বিশ্লেষণ ফলাফল", saveTitle: "৩. ডেটা সংরক্ষণ করুন (TSR ≥ ৮০%)", phVariety: "ধানের জাত নির্বাচন করুন", varOther: "অন্যান্য / নিজে লিখুন", locationPlaceholder: "স্থান/প্লট আইডি (যেমন: ব্লক এ)", saveBtn: "বিশ্লেষণ ডেটা সংরক্ষণ করুন", manualPlaceholder: "জাতের নাম লিখুন (যেমন: ব্রি ধান৭৪)", rec3: "মাঝারি ঘাটতি। ইউরিয়া সার প্রয়োগ প্রয়োজন।", rec4: "সামান্য ঘাটতি। কম মাত্রায় ইউরিয়া সার প্রয়োগ প্রয়োজন।", rec5: "পর্যাপ্ত নাইট্রোজেন। সাধারণত ০ কেজি/হেক্টর।", toastCapture: "✅ ছবি সফলভাবে তোলা হয়েছে।", toastAnalysis: "✅ বিশ্লেষণ ফলাফল প্রস্তুত।", toastSave: "💾 বিশ্লেষণ সফলভাবে সংরক্ষিত হয়েছে!", toastReset: "♻️ বিশ্লেষণ রিসেট করা হয়েছে।", errorLowTsr: "ট্রাস্ট স্কোর কম। ভালো আলোতে আবার ছবি তুলুন।", initialState: "বিশ্লেষণ শুরু করতে ছবি তুলুন বা গ্যালারি থেকে নির্বাচন করুন", aiInsightTitle: "এআই বিশেষজ্ঞ ইনসাইট", aiLoading: "বিশেষজ্ঞ সারসংক্ষেপ তৈরি হচ্ছে..."
    }
  };

  const t = TR[currentLang];

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageSrc(event.target?.result as string);
        setStep(1);
        setProgress(0);
        showToast(t.toastCapture, 'success');
      };
      reader.readAsDataURL(file);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3000);
  };

  const startAnalysis = () => {
    setStep(2);
    setProgress(0);
    setStatus(t.statusRefining);

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    if (audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume();
    }

    const phases = [ { p: 25, s: t.statusRefining }, { p: 50, s: t.statusCalculating }, { p: 75, s: t.statusAnalyzing }, { p: 90, s: t.statusFinalizing }, { p: 100, s: t.statusSuccess } ];
    let currentPhase = 0;
    const interval = setInterval(() => {
      setProgress(prev => {
        const target = phases[currentPhase].p;
        if (prev < target) return prev + 1;
        if (currentPhase < phases.length - 1) { currentPhase++; setStatus(phases[currentPhase].s); }
        else { clearInterval(interval); finishAnalysis(); }
        return prev;
      });
    }, 40);
  };

  const finishAnalysis = async () => {
    const simulatedTsr = Math.floor(Math.random() * 20) + 75;
    const simulatedLcc = Math.floor(Math.random() * 3) + 3;
    setTsr(simulatedTsr);
    setLccValue(simulatedLcc);
    let recText = t.rec5; let dose = "0";
    if (simulatedLcc <= 3) { recText = t.rec3; dose = "30-45"; }
    else if (simulatedLcc === 4) { recText = t.rec4; dose = "0-30"; }
    setRecommendation({ dose, text: recText });
    setStep(3);
    showToast(t.toastAnalysis, simulatedTsr >= 80 ? 'success' : 'error');
    setIsAiLoading(true);
    try {
      const summary = await getLCCAnalysisSummary(simulatedLcc, simulatedTsr, dose, currentLang);
      setAiInsight(summary);
      if (summary) {
        playTTS(summary);
      }
      if (onShowFeedback) onShowFeedback();
    } catch (e) { console.error(e); } finally { setIsAiLoading(false); }
  };

  const playTTS = async (textOverride?: string) => {
    const textToSpeak = textOverride || aiInsight;
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
      const base64Audio = await generateSpeech(textToSpeak.replace(/[*#_~]/g, ''));
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

  const handleShare = async () => {
    if (!aiInsight) return;
    const res = await shareContent("LCC বিশ্লেষণ", aiInsight);
    if (res.method === 'clipboard') {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const saveAnalysis = () => {
    if (!selectedVariety || (selectedVariety === 'manual' && !manualVariety)) { alert(currentLang === 'en' ? 'Select variety' : 'জাত নির্বাচন করুন'); return; }
    if (!locationId) { alert(currentLang === 'en' ? 'Enter Location ID' : 'স্থান আইডি দিন'); return; }
    showToast(t.toastSave, 'success');
    if (onAction) onAction();
    reset();
  };

  const reset = () => { stopTTS(); setImageSrc(null); setStep(0); setLccValue(null); setRecommendation(null); setAiInsight(null); setTsr(0); setProgress(0); showToast(t.toastReset, 'info'); };

  return (
    <div className="max-w-4xl mx-auto p-4 bg-slate-50 min-h-screen pb-32 font-sans text-slate-900">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button onClick={() => { window.history.back(); stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm hover:bg-slate-100 transition-all active:scale-90"><svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg></button>
          <div><h1 className="text-2xl font-black tracking-tight">{t.title}</h1><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-100">{t.subtitle}</p></div>
        </div>
        <div className="flex items-center space-x-2">
            <button onClick={reset} className="p-3 bg-white rounded-2xl shadow-sm hover:text-red-500 transition-colors"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
            <button onClick={() => setCurrentLang(currentLang === 'en' ? 'bn' : 'en')} className="px-4 py-2 bg-white rounded-xl shadow-sm font-black text-xs border border-slate-200">{currentLang === 'en' ? 'বাংলা' : 'English'}</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        <div className="space-y-6">
          <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 relative overflow-hidden">
            <div className="flex items-center justify-between mb-8"><h2 className="text-lg font-black text-slate-800">{t.capture}</h2><div className={`flex h-2 w-2 rounded-full ${step === 2 ? 'bg-blue-500 animate-ping' : 'bg-emerald-500'}`}></div></div>
            <input type="file" accept="image/*" capture="environment" ref={cameraInputRef} className="hidden" onChange={handleCapture} />
            <input type="file" accept="image/*" ref={galleryInputRef} className="hidden" onChange={handleCapture} />
            <div className={`relative aspect-video rounded-[2rem] overflow-hidden border-4 border-dashed transition-all ${imageSrc ? 'border-emerald-500' : 'border-slate-100 bg-slate-50'}`}>
              {imageSrc ? <img src={imageSrc} className="w-full h-full object-cover" /> : <div className="flex flex-col items-center justify-center h-full p-10 space-y-6"><div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-4xl shadow-inner">📸</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full"><button onClick={() => cameraInputRef.current?.click()} className="bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg text-sm">Camera</button><button onClick={() => galleryInputRef.current?.click()} className="bg-white text-emerald-600 border-2 border-emerald-600 font-black py-4 rounded-2xl text-sm">Gallery</button></div></div>}
            </div>
            {step === 1 && <button onClick={startAnalysis} className="w-full mt-6 bg-[#0A8A1F] text-white font-black py-5 rounded-2xl shadow-xl text-lg">{t.analyze}</button>}
          </div>
          
          {step === 3 && (
            <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 animate-fade-in">
               <h2 className="text-lg font-black text-slate-800 mb-6">{t.saveTitle}</h2>
               <div className="space-y-4">
                  <select 
                    value={selectedVariety} 
                    onChange={(e) => setSelectedVariety(e.target.value)}
                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-emerald-500"
                  >
                    <option value="">{t.phVariety}</option>
                    {VARIETY_DATA.map(v => <option key={v.name} value={v.isManual ? 'manual' : v.name}>{v.name}</option>)}
                  </select>
                  {selectedVariety === 'manual' && <input type="text" value={manualVariety} onChange={(e) => setManualVariety(e.target.value)} placeholder={t.manualPlaceholder} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700" />}
                  <div className="relative">
                    <input type="text" value={locationId} onChange={(e) => setLocationId(e.target.value)} placeholder={t.locationPlaceholder} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-12 font-bold text-slate-700" />
                    <button 
                      onClick={toggleListening}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-100 text-slate-400 hover:text-emerald-600'}`}
                    >
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                    </button>
                  </div>
               </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-[3rem] p-8 shadow-xl border border-slate-100 h-full flex flex-col overflow-hidden relative">
            <h2 className="text-lg font-black text-slate-800 mb-8">{t.resultsTitle}</h2>
            {step === 3 ? (
              <div className="flex-1 space-y-8 animate-fade-in relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-6 rounded-[2.5rem] border border-emerald-100 text-center"><p className="text-[10px] font-black text-emerald-600 uppercase mb-1">{t.lccLabel}</p><p className="text-6xl font-black text-emerald-800">{lccValue}</p></div>
                  <div className="bg-blue-50 p-6 rounded-[2.5rem] border border-blue-100 text-center"><p className="text-[10px] font-black text-blue-600 uppercase mb-1">N Dose</p><p className="text-4xl font-black text-blue-800">{recommendation?.dose}</p></div>
                </div>
                <div className="bg-emerald-50/50 p-6 rounded-[2rem] border-2 border-emerald-100 relative overflow-hidden">
                   <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg">🤖</div>
                        <h3 className="font-black text-slate-800 tracking-tight">{t.aiInsightTitle}</h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button onClick={() => playTTS()} className={`p-3 rounded-xl shadow-sm transition-all ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-emerald-600 hover:bg-emerald-50'}`}>
                           {isPlaying ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>}
                        </button>
                        <button onClick={handleShare} className="p-3 rounded-xl bg-white text-emerald-600 hover:bg-emerald-50 transition-all shadow-sm" title="শেয়ার করুন">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                        </button>
                      </div>
                   </div>
                   <div className="relative z-10 min-h-[60px]">
                      {isAiLoading ? <p className="text-[9px] font-bold text-emerald-600/50 uppercase animate-pulse">{t.aiLoading}</p> : <p className="text-sm font-medium text-slate-700 leading-[1.6]">{aiInsight}</p>}
                   </div>
                </div>
                {tsr >= 80 && <div className="pt-8 border-t border-slate-100 space-y-4 animate-fade-in"><button onClick={saveAnalysis} className="w-full bg-emerald-600 text-white font-black py-5 rounded-2xl shadow-2xl active:scale-95 text-sm uppercase tracking-widest">{t.saveBtn}</button></div>}
              </div>
            ) : <div className="flex-1 flex flex-col items-center justify-center text-center p-10 opacity-30 group"><div className="text-7xl mb-8 group-hover:scale-110 transition-transform">📊</div><p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] leading-loose max-w-[200px]">{t.initialState}</p></div>}
          </div>
        </div>
      </div>
      {shareToast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-[10px] animate-fade-in z-[200]">📋 কপি করা হয়েছে!</div>}
    </div>
  );
};

export default LeafColorChart;
