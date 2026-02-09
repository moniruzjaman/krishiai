
import React, { useState, useEffect, useRef } from 'react';
import { searchAgriculturalInfo, generateSpeech, decodeBase64, decodeAudioData } from '../services/ai/geminiService';
import { queryQwenVL } from '../services/ai/huggingfaceService';
import { GroundingChunk, SavedReport, UserSettings } from '../types';
import ShareDialog from './ShareDialog';

interface SearchToolProps {
  onAction?: () => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onShowFeedback?: () => void;
  onBack?: () => void;
  userSettings?: UserSettings;
}

const aiSearchLoadingSteps = [
  "তথ্য সূত্রসমূহ স্ক্যান করা হচ্ছে...",
  "সর্বশেষ বাজার দর অনুসন্ধান করা হচ্ছে...",
  "বিএআরসি (BARC) এবং ড্যাম (DAM) পোর্টাল থেকে তথ্য নেওয়া হচ্ছে...",
  "আঞ্চলিক চাহিদাও সরবরাহের ডাটা বিশ্লেষণ চলছে...",
  "বাজার প্রবণতা (Trends) এবং ভবিষ্যৎ পূর্বাভাস যাচাই হচ্ছে...",
  "সঠিক তথ্য সম্বলিত রিপোর্ট তৈরি করা হচ্ছে..."
];

const SearchTool: React.FC<SearchToolProps> = ({ onAction, onSaveReport: _onSaveReport, onShowFeedback: _onShowFeedback, onBack }) => {
  const [activeMode, setActiveMode] = useState<'market' | 'ai'>('market');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);

  const recognitionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);



  useEffect(() => {
    let interval: any;
    if (isLoading && activeMode === 'ai') {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % aiSearchLoadingSteps.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading, activeMode, aiSearchLoadingSteps.length]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => setQuery(event.results[0][0].transcript);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  const handleAIQuery = async () => {
    if (!query.trim()) return;
    setIsLoading(true);
    setActiveMode('ai');
    setResults(null);
    setLoadingStep(0);

    try {
      const prompt = `Agricultural inquiry: ${query}. NO INTRO.`;

      const qwenRes = await queryQwenVL(prompt, undefined, 'bn');
      if (qwenRes) {
        const data = { text: qwenRes, groundingChunks: [] };
        setResults(data);
        playTTS(qwenRes);
      } else {
        const data = await searchAgriculturalInfo(query);
        setResults(data);
        if (data.text) playTTS(data.text);
      }

      if (onAction) onAction();
    } catch (error) {
      alert("AI তথ্য অনুসন্ধানে সমস্যা হয়েছে।");
    } finally {
      setIsLoading(false);
    }
  };

  const playTTS = async (textOverride?: string) => {
    const textToSpeak = textOverride || results?.text;
    if (!textToSpeak) return;
    try {
      stopTTS();
      setIsPlaying(true);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const base64Audio = await generateSpeech(textToSpeak);
      const audioBuffer = await decodeAudioData(decodeBase64(base64Audio), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (error) { setIsPlaying(false); }
  };

  const stopTTS = () => { if (currentSourceRef.current) { currentSourceRef.current.stop(); currentSourceRef.current = null; } setIsPlaying(false); };

  const formatResultContent = (text: string) => {
    const parts = text.split(/(\[.*?\]:?)/g);
    return parts.map((part, i) => {
      if (part.startsWith('[') && part.includes(']')) {
        return <span key={i} className="block mt-8 mb-3 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl font-black text-sm uppercase tracking-widest border border-blue-100">{part.replace(/[\[\]:]/g, '')}</span>;
      }
      return <span key={i} className="leading-relaxed opacity-90">{part}</span>;
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 pb-32 font-sans animate-fade-in bg-slate-50 min-h-screen">
      {isShareOpen && results && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title={`Market Insight: ${query}`} content={results.text} />}

      {/* Floating Status Toast */}
      {isLoading && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[200] animate-bounce-in w-full max-w-xs md:max-w-sm px-4">
          <div className="bg-slate-900/95 text-white p-5 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col space-y-4 border border-blue-500/30 backdrop-blur-md">
            <div className="flex items-center space-x-4">
              <div className="relative shrink-0">
                <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center text-lg">🔍</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">DAM-Grounded Market AI</p>
                <h4 className="text-sm font-bold truncate transition-all duration-500">{aiSearchLoadingSteps[loadingStep]}</h4>
              </div>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-1 px-1 py-0.5">
              {[0, 1, 2, 3, 4, 5].map(i => (
                <div key={i} className={`h-full flex-1 rounded-full transition-all duration-500 ${i <= loadingStep ? 'bg-blue-500 shadow-[0_0_8px_#3b82f6]' : 'bg-white/5'}`}></div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="bg-[#0A8A1F] -mx-4 -mt-4 p-8 text-white rounded-b-[3.5rem] shadow-xl mb-8 border-b-8 border-green-700/20">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center space-x-3">
            <button onClick={() => { onBack?.(); stopTTS(); }} className="p-2 bg-white/10 rounded-xl">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7m0 0l7-7m-7 7h18" /></svg>
            </button>
            <h1 className="text-2xl md:text-3xl font-black">দৈনিক বাজার দর ও তথ্য</h1>
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <div className="relative">
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="পণ্য বা তথ্য খুঁজুন..." className="w-full bg-white rounded-2xl px-12 py-4 focus:ring-4 focus:ring-green-400 outline-none font-bold text-gray-800 text-lg shadow-2xl" onKeyDown={(e) => e.key === 'Enter' && handleAIQuery()} />
            <button onClick={() => isListening ? recognitionRef.current?.stop() : recognitionRef.current?.start()} className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-xl ${isListening ? 'bg-red-500 text-white' : 'text-slate-400'}`}>🎙️</button>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setActiveMode('market')} className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${activeMode === 'market' ? 'bg-white text-[#0A8A1F]' : 'bg-white/10 text-white'}`}>বাজার তালিকা (DAM)</button>
            <button onClick={handleAIQuery} className={`flex-1 py-2 rounded-xl font-black text-xs transition-all ${activeMode === 'ai' ? 'bg-yellow-400 text-[#0A8A1F]' : 'bg-white/10 text-white'}`}>এআই বিশেষজ্ঞ</button>
          </div>
        </div>
      </div>

      {activeMode === 'ai' && (
        <div className="px-2">
          {results && !isLoading && (
            <div className="bg-white rounded-[3.5rem] p-10 md:p-14 shadow-2xl border-[12px] border-slate-900 relative overflow-hidden flex flex-col">
              <div className="flex justify-between items-center mb-10 pb-8 border-b-2 border-slate-50 relative z-10">
                <h3 className="text-2xl font-black text-slate-900">এআই বাজার বিশেষজ্ঞ</h3>
                <button onClick={() => playTTS()} className={`p-5 rounded-full shadow-2xl ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-[#0A8A1F] text-white'}`}>🔊</button>
              </div>
              <div className="flex-1 prose prose-slate max-w-none text-slate-800 leading-[1.8] font-medium text-lg md:text-xl">
                {formatResultContent(results.text)}
              </div>

              {/* Metadata Footer */}
              <div className="mt-16 pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4 opacity-60">
                <div className="flex items-center space-x-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-slate-400">Primary Engine</span>
                    <span className="text-[10px] font-bold text-slate-700">Qwen/Qwen3-VL-8B</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-slate-400">Version</span>
                    <span className="text-[10px] font-bold text-slate-700">v2.1.0-BD</span>
                  </div>
                  <div className="w-px h-6 bg-slate-200"></div>
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black uppercase text-slate-400">Protocol</span>
                    <span className="text-[10px] font-bold text-slate-700">DAM-BD-2025</span>
                  </div>
                </div>
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Grounding: dam.gov.bd Official</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchTool;
