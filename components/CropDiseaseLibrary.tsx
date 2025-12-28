
import React, { useState, useRef, useEffect } from 'react';
import { getCropDiseaseInfo, generateAgriImage, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { shareContent } from '../services/shareService';
import { CROP_CATEGORIES, CROPS_BY_CATEGORY } from '../constants';
// Updated import to get CropDiseaseReport from types.ts
import { CropDiseaseReport } from '../types';

interface CropDiseaseLibraryProps {
  onAction?: () => void;
  onShowFeedback?: () => void;
}

const OFFLINE_LIBRARY_DATA: Record<string, CropDiseaseReport> = {
  'ধান': {
    cropName: 'ধান',
    summary: 'বাংলাদেশের প্রধান খাদ্যশস্য। এটি রবি ও খরিফ উভয় মৌসুমে চাষ হয়।',
    diseases: [
      { name: 'ব্লাস্ট', symptoms: 'পাতায় হীরাকৃতি দাগ।', bioControl: 'সুস্থ বীজ ব্যবহার।', chemControl: 'ট্রাইসাইক্লাজোল ব্যবহার করুন।', severity: 'High' }
    ],
    pests: [
      { name: 'মাজরা পোকা', damageSymptoms: 'ডেড হার্ট লক্ষণ।', bioControl: 'পার্চিং বা পাখি বসার ব্যবস্থা।', chemControl: 'অনুমোদিত কার্বোফুরান।', severity: 'Medium' }
    ]
  },
  'আলুর': {
    cropName: 'আলু',
    summary: 'শীতকালীন প্রধান কন্দাল ফসল।',
    diseases: [
      { name: 'লেট ব্লাইট', symptoms: 'পাতায় দ্রুত পচনশীল দাগ।', bioControl: 'আক্রান্ত গাছ অপসারণ।', chemControl: 'ম্যানকোজেব স্প্রে।', severity: 'High' }
    ],
    pests: [
      { name: 'কাটুই পোকা', damageSymptoms: 'গাছের গোড়া কেটে দেয়।', bioControl: 'আলোর ফাঁদ।', chemControl: 'সেভিন ডাস্ট।', severity: 'Medium' }
    ]
  }
};

const CropDiseaseLibrary: React.FC<CropDiseaseLibraryProps> = ({ onAction, onShowFeedback }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedCategory, setSelectedCategory] = useState<string>(CROP_CATEGORIES[0].id);
  const [selectedCrop, setSelectedCrop] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [report, setReport] = useState<CropDiseaseReport | null>(null);
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [shareToast, setShareToast] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', handleStatus);
    window.addEventListener('offline', handleStatus);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        setSearchQuery(event.results[0][0].transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }

    return () => {
      window.removeEventListener('online', handleStatus);
      window.removeEventListener('offline', handleStatus);
    };
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const handleShare = async () => {
    if (!report) return;
    const shareText = `${report.cropName}: ${report.summary}\n\nDiseases: ${report.diseases.map(d => d.name).join(', ')}`;
    const res = await shareContent("ফসল সুরক্ষা নির্দেশিকা", shareText);
    if (res.method === 'clipboard') {
      setShareToast(true);
      setTimeout(() => setShareToast(false), 2000);
    }
  };

  const fetchDiseaseInfo = async (crop: string) => {
    setSelectedCrop(crop);

    if (!isOnline) {
      if (OFFLINE_LIBRARY_DATA[crop]) {
        setReport(OFFLINE_LIBRARY_DATA[crop]);
        setCropImage(null);
      } else {
        alert("অফলাইন মোডে এই শস্যের বিস্তারিত তথ্য নেই।");
      }
      return;
    }

    setIsLoading(true);
    setReport(null);
    setCropImage(null);
    try {
      const [diseaseData, generatedImg] = await Promise.all([
        getCropDiseaseInfo(crop),
        generateAgriImage(`${crop} crop pests and diseases comparison high quality agricultural photography`)
      ]);
      setReport(diseaseData.data);
      setCropImage(generatedImg);
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (error) {
      alert("তথ্য সংগ্রহ করতে সমস্যা হয়েছে।");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (report && !isLoading && isOnline) {
      playTTS();
    }
  }, [report]);

  const playTTS = async () => {
    if (!isOnline) return;
    if (isPlaying) { stopTTS(); return; }
    if (!report) return;
    try {
      setIsPlaying(true);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const base64Audio = await generateSpeech(`${report.cropName} এর বালাই ও সুরক্ষা নির্দেশিকা। ${report.summary}`);
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
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

  const filteredCrops = (CROPS_BY_CATEGORY[selectedCategory] || []).filter(c => 
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto p-4 pb-32 animate-fade-in font-sans">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => { window.history.back(); stopTTS(); }} className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-slate-50 transition-all active:scale-90">
            <svg className="h-6 w-6 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">ডিজিটাল শস্য লাইব্রেরি</h1>
            <p className="text-[10px] font-black text-green-600 uppercase tracking-widest bg-green-50 px-2 py-0.5 rounded-full inline-block border border-green-100">{isOnline ? 'Official DAE & BARC Database' : 'Offline Mode Active'}</p>
          </div>
        </div>

        {/* Library Search with Voice */}
        <div className="relative w-full md:w-64 group">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="শস্য খুঁজুন..."
            className="w-full bg-white border border-slate-100 rounded-xl px-10 py-3 focus:ring-2 focus:ring-green-600 focus:outline-none font-bold text-xs shadow-sm"
          />
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button 
            onClick={toggleListening}
            className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-300 hover:text-green-600'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
        </div>
      </div>

      <div className="flex overflow-x-auto space-x-2 mb-6 pb-2 scrollbar-hide border-b border-slate-100">
        {CROP_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => { setSelectedCategory(cat.id); setSearchQuery(''); }}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-black transition-all ${
              selectedCategory === cat.id 
              ? 'bg-[#0A8A1F] text-white shadow-lg scale-105' 
              : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-100'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3 mb-12">
        {filteredCrops.map(crop => (
          <button 
            key={crop} 
            onClick={() => fetchDiseaseInfo(crop)} 
            disabled={isLoading}
            className={`p-4 rounded-2xl font-bold shadow-sm transition-all border text-sm ${
              selectedCrop === crop 
              ? 'bg-[#0A8A1F] text-white border-[#0A8A1F] scale-105 shadow-xl z-10' 
              : 'bg-white text-slate-700 border-slate-100 hover:border-green-200'
            } ${isLoading && selectedCrop !== crop ? 'opacity-50 grayscale' : ''}`}
          >
            {crop}
          </button>
        ))}
        {filteredCrops.length === 0 && (
          <p className="col-span-full text-center py-10 text-slate-400 font-bold italic">এই ক্যাটাগরিতে কোনো শস্য পাওয়া যায়নি</p>
        )}
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 space-y-6">
           <div className="relative">
              <div className="w-16 h-16 border-4 border-green-100 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-[#0A8A1F] border-t-transparent rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center text-2xl">📖</div>
           </div>
           <div className="text-center">
             <p className="font-black text-slate-800 text-lg">{selectedCrop} এর তথ্য সংগ্রহ হচ্ছে...</p>
             <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Grounding with BARC 2024 Guidelines</p>
           </div>
        </div>
      )}

      {report && !isLoading && (
        <div className="space-y-8 animate-fade-in pb-12">
          {!isOnline && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 text-center font-bold text-amber-700 text-xs">
              ⚠️ অফলাইন ডেটাবেস থেকে তথ্য দেখানো হচ্ছে
            </div>
          )}
          <div className="bg-slate-900 rounded-[3rem] overflow-hidden shadow-2xl relative min-h-[400px] flex flex-col justify-end border-b-[12px] border-[#0A8A1F]">
             {cropImage ? (
               <img src={cropImage} className="absolute inset-0 w-full h-full object-cover opacity-50 transition-opacity duration-1000" alt={report.cropName} />
             ) : (
               <div className="absolute inset-0 bg-gradient-to-br from-green-900 to-slate-900"></div>
             )}
             <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
             
             <div className="relative p-8 md:p-12 text-white">
                <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                   <div className="flex-1">
                      <div className="inline-flex items-center space-x-2 bg-emerald-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest mb-4 border border-white/20">
                         <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
                         <span>লাইব্রেরি আর্কাইভ</span>
                      </div>
                      <h2 className="text-6xl md:text-7xl font-black mb-6 tracking-tighter">{report.cropName}</h2>
                      <p className="text-xl font-medium text-slate-200 leading-relaxed max-w-3xl border-l-4 border-emerald-500 pl-6">
                        {report.summary}
                      </p>
                   </div>
                   <div className="flex items-center space-x-3 shrink-0">
                     <button onClick={handleShare} className="p-5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-90 border border-white/10" title="শেয়ার করুন">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                     </button>
                     {isOnline && (
                       <button onClick={playTTS} className={`p-8 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-all active:scale-90 ${isPlaying ? 'bg-rose-500 animate-pulse' : 'bg-white text-[#0A8A1F] hover:bg-green-50'}`}>
                          {isPlaying ? (
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg>
                          ) : (
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                          )}
                       </button>
                     )}
                   </div>
                </div>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
             <div className="space-y-6">
                <div className="flex items-center space-x-3 px-2">
                   <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse"></span>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">প্রধান রোগসমূহ (Major Diseases)</h3>
                </div>
                <div className="space-y-4">
                   {report.diseases.map((d, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-150 transition-transform"></div>
                        <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="text-2xl font-black text-slate-800 tracking-tight">{d.name}</h4>
                              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${d.severity === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                 {d.severity}
                              </span>
                           </div>
                           <div className="space-y-6">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">লক্ষণসমূহ (Symptoms)</p>
                                 <p className="text-sm text-slate-600 font-medium leading-relaxed italic">{d.symptoms}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">জৈবিক দমন</p>
                                    <p className="text-xs text-emerald-800 font-bold leading-relaxed">{d.bioControl}</p>
                                 </div>
                                 <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-[9px] font-black text-blue-600 uppercase mb-2">রাসায়নিক দমন</p>
                                    <p className="text-xs text-blue-800 font-bold leading-relaxed">{d.chemControl}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>

             <div className="space-y-6">
                <div className="flex items-center space-x-3 px-2">
                   <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                   <h3 className="text-xl font-black text-slate-800 uppercase tracking-widest">প্রধান ক্ষতিকর পোকা (Major Pests)</h3>
                </div>
                <div className="space-y-4">
                   {report.pests.map((p, i) => (
                     <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-full -mr-12 -mt-12 opacity-50 group-hover:scale-150 transition-transform"></div>
                        <div className="relative z-10">
                           <div className="flex justify-between items-start mb-4">
                              <h4 className="text-2xl font-black text-slate-800 tracking-tight">{p.name}</h4>
                              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.severity === 'High' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
                                 {p.severity}
                              </span>
                           </div>
                           <div className="space-y-6">
                              <div>
                                 <p className="text-[10px] font-black text-slate-400 uppercase mb-2">ক্ষতির ধরণ (Symptoms)</p>
                                 <p className="text-sm text-slate-600 font-medium leading-relaxed italic">{p.damageSymptoms}</p>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                                    <p className="text-[9px] font-black text-emerald-600 uppercase mb-2">জৈবিক দমন</p>
                                    <p className="text-xs text-emerald-800 font-bold leading-relaxed">{p.bioControl}</p>
                                 </div>
                                 <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                    <p className="text-[9px] font-black text-blue-600 uppercase mb-2">রাসায়নিক দমন</p>
                                    <p className="text-xs text-blue-800 font-bold leading-relaxed">{p.chemControl}</p>
                                 </div>
                              </div>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}

      {!selectedCrop && !isLoading && (
        <div className="bg-white rounded-[3.5rem] p-16 md:p-24 shadow-xl border border-slate-100 text-center space-y-8 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-green-50 rounded-full -mr-32 -mt-32 opacity-40 blur-3xl"></div>
           <div className="w-32 h-32 bg-green-100 rounded-[2.5rem] flex items-center justify-center mx-auto text-6xl shadow-inner border-2 border-green-50 animate-bounce duration-[3000ms]">🌾</div>
           <div className="max-w-md mx-auto space-y-4">
              <h3 className="text-3xl font-black text-slate-800 tracking-tighter"> একটি ফসল নির্বাচন করুন</h3>
              <p className="text-slate-500 font-medium leading-relaxed">
                 উপরে ক্যাটাগরি এবং নিচের তালিকা থেকে ফসল নির্বাচন করলে আমরা সেই ফসলের জন্য সরকারি ডাটাবেস অনুযায়ী একটি পূর্ণাঙ্গ সুরক্ষা নির্দেশিকা তৈরি করব।
              </p>
           </div>
        </div>
      )}

      {shareToast && <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl font-black text-[10px] animate-fade-in z-[200]">📋 কপি করা হয়েছে!</div>}
    </div>
  );
};

export default CropDiseaseLibrary;
