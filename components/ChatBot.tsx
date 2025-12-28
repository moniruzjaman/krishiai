
import React, { useState, useEffect, useRef } from 'react';
import { sendChatMessage, generateSpeech, decodeBase64, decodeAudioData, getLiveWeather } from '../services/geminiService';
import { getStoredLocation, saveStoredLocation } from '../services/locationService';
import { ChatMessage, UserCrop, WeatherData } from '../types';
import ShareDialog from './ShareDialog';
import GuidedTour, { TourStep } from './GuidedTour';

interface ChatBotProps {
  userRank?: string;
  userCrops?: UserCrop[];
  onAction?: () => void;
  onShowFeedback?: () => void;
}

const PERSONAS = [
  { id: 'নবিশ কৃষক', label: 'নবিশ', icon: '🌱', desc: 'সহজ ভাষায় পরামর্শ' },
  { id: 'অভিজ্ঞ কৃষক', label: 'অভিজ্ঞ', icon: '🌿', desc: 'উন্নত চাষ পদ্ধতি' },
  { id: 'মাস্টার এগ্রোনোমিস্ট', label: 'মাস্টার', icon: '🎓', desc: 'গবেষণাধর্মী তথ্য' }
];

const CHAT_TOUR: TourStep[] = [
  {
    title: "কৃষি চ্যাটবট",
    content: "এআই বিশেষজ্ঞের সাথে সরাসরি কথা বলে সমাধান পেতে পারেন এখানে।",
    position: 'center'
  },
  {
    targetId: "chat-persona-selector",
    title: "বিশেষজ্ঞের স্তর",
    content: "আপনি কতটা বিস্তারিত উত্তর চান তা এখান থেকে নির্ধারণ করুন (নবিশ থেকে মাস্টার)।",
    position: 'bottom'
  },
  {
    targetId: "chat-quick-replies",
    title: "দ্রুত জিজ্ঞাসা",
    content: "সহজ প্রশ্নের জন্য এই শর্টকাটগুলো ব্যবহার করতে পারেন।",
    position: 'top'
  }
];

const thinkingMessages = [
  "আপনার প্রশ্নের প্রেক্ষাপট বিশ্লেষণ করা হচ্ছে...",
  "বর্তমান এলাকার আবহাওয়া এবং মাটির তথ্য যাচাই চলছে...",
  "সরকারি ডাটাবেস (BARC/DAE/SRDI) থেকে সমাধান খোঁজা হচ্ছে...",
  "বাজার দরের জন্য dam.gov.bd পোর্টাল চেক করা হচ্ছে...",
  "বিশেষজ্ঞ পরামর্শ চূড়ান্ত করা হচ্ছে..."
];

const ChatBot: React.FC<ChatBotProps> = ({ userRank, userCrops = [], onAction, onShowFeedback }) => {
  const initialMessage: ChatMessage = { 
    id: '1', 
    role: 'model', 
    text: 'আসসালামু আলাইকুম! আমি আপনার কৃষি সহকারী। আমি BARC, BRRI, BARI, DAE এবং SRDI এর নির্দেশিকা মেনে আপনাকে সহায়তা করি। কৃষি পদ্ধতি, বাজার দর বা আবহাওয়া সম্পর্কে যেকোনো প্রশ্ন করতে পারেন।' 
  };

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [isPlayingId, setIsPlayingId] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [shareData, setShareData] = useState<{ isOpen: boolean, content: string } | null>(null);
  const [activePersona, setActivePersona] = useState<string>(userRank || 'নবিশ কৃষক');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);
  const [showTour, setShowTour] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recognitionRef = useRef<any>(null);

  const fetchWeatherWithLocation = async () => {
    setIsWeatherLoading(true);
    const stored = getStoredLocation();
    
    if (stored) {
      try {
        const data = await getLiveWeather(stored.lat, stored.lng);
        setWeather(data);
        setIsWeatherLoading(false);
        return;
      } catch (e) {
        console.error("Failed to fetch weather with stored location", e);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          saveStoredLocation(latitude, longitude);
          try {
            const data = await getLiveWeather(latitude, longitude);
            setWeather(data);
          } catch (e) {}
          setIsWeatherLoading(false);
        },
        () => setIsWeatherLoading(false),
        { timeout: 10000 }
      );
    } else {
      setIsWeatherLoading(false);
    }
  };

  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_chatbot');
    if (!tourDone) setShowTour(true);

    fetchWeatherWithLocation();

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => setIsListening(true);
      recognitionRef.current.onresult = (event: any) => {
        setInputText(prev => prev + ' ' + event.results[0][0].transcript);
      };
      recognitionRef.current.onerror = () => setIsListening(false);
      recognitionRef.current.onend = () => setIsListening(false);
    }
  }, []);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % thinkingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const saved = localStorage.getItem('agritech_chat_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.length > 0 ? parsed : [initialMessage]);
      } catch (e) {
        setMessages([initialMessage]);
      }
    } else {
      setMessages([initialMessage]);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('agritech_chat_history', JSON.stringify(messages));
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট আপনার ব্রাউজারে সমর্থিত নয়।");
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const playTTS = async (text: string, id: string) => {
    if (isPlayingId === id) { stopTTS(); return; }
    try {
      stopTTS();
      setIsPlayingId(id);
      if (!audioContextRef.current) { 
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 }); 
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const base64Audio = await generateSpeech(text);
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => { setIsPlayingId(null); currentSourceRef.current = null; };
      currentSourceRef.current = source;
      source.start(0);
    } catch (error) { setIsPlayingId(null); }
  };

  const stopTTS = () => {
    if (currentSourceRef.current) { currentSourceRef.current.stop(); currentSourceRef.current = null; }
    setIsPlayingId(null);
  };

  const handleSend = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    if (!customText) setInputText('');
    setIsLoading(true);

    try {
      const history = messages.filter(m => !m.isError).map(m => ({ role: m.role, parts: [{ text: m.text }] }));
      const response = await sendChatMessage(history, userMsg.text, activePersona, weather || undefined, userCrops);
      const botMsg: ChatMessage = { 
        id: (Date.now() + 1).toString(), 
        role: 'model', 
        text: response.text || "উত্তর দিতে পারিনি।",
        groundingChunks: response.groundingChunks
      };
      setMessages(prev => [...prev, botMsg]);
      if (response.text) {
        playTTS(response.text, botMsg.id);
      }
      if (onAction) onAction();
      if (onShowFeedback) onShowFeedback();
    } catch (error) {
      const errorMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: "দুঃখিত, একটি সমস্যা হয়েছে।", isError: true };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const QuickReply = ({ text, label }: { text: string, label: string }) => (
    <button 
      onClick={() => handleSend(text)}
      className="bg-white border border-emerald-100 text-emerald-700 px-4 py-2 rounded-xl text-[11px] font-black shadow-sm hover:bg-emerald-50 transition-all active:scale-95 whitespace-nowrap"
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-xl overflow-hidden mt-4 font-sans">
      {showTour && <GuidedTour steps={CHAT_TOUR} tourKey="chatbot" onClose={() => setShowTour(false)} />}
      {shareData && <ShareDialog isOpen={shareData.isOpen} onClose={() => setShareData(null)} title="কৃষি বিশেষজ্ঞের পরামর্শ" content={shareData.content} />}
      
      <div className="bg-[#0A8A1F] p-4 text-white flex justify-between items-center shadow-md relative z-10">
        <div className="flex items-center">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center mr-3 shadow-inner relative">
             🤖
             <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white flex items-center justify-center">
                <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293l-4 4a1 1 0 01-1.414 0l-2-2a1 1 0 111.414-1.414L9 10.586l3.293-3.293a1 1 0 111.414 1.414z" /></svg>
             </div>
          </div>
          <div>
            <h2 className="text-lg font-black leading-none">কৃষি জিজ্ঞাসা ও সহায়তা</h2>
            <div className="flex items-center space-x-2 mt-1">
               <p className="text-[9px] font-bold text-green-100 uppercase tracking-widest opacity-70">Official Govt AI Delegate</p>
               <span className="bg-white/20 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase">BARC | BRRI | BARI | DAE | SRDI</span>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {isWeatherLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : weather ? (
            <div className="flex items-center bg-white/10 px-3 py-1 rounded-full border border-white/20" title={`লোকেশন: ${weather.city}`}>
               <span className="text-xs mr-1.5 font-black">{weather.temp}°C</span>
               <span className="text-[10px] font-black uppercase tracking-tighter opacity-80">{weather.condition?.includes('রোদ্র') ? "☀️" : weather.condition?.includes('বৃষ্টি') ? "🌧️" : "⛅"}</span>
            </div>
          ) : (
            <button onClick={fetchWeatherWithLocation} className="text-[9px] font-black bg-white/10 px-3 py-1 rounded-full border border-white/20 hover:bg-white/20 transition-all">আবহাওয়া সংযুক্ত করুন</button>
          )}
          <button onClick={() => { stopTTS(); setMessages([initialMessage]); }} className="p-2 bg-white/10 text-white hover:bg-red-500 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          </button>
        </div>
      </div>

      <div className="bg-slate-50 p-2 border-b border-slate-100 flex flex-col items-center gap-2">
        <div id="chat-persona-selector" className="bg-white p-1 rounded-2xl shadow-sm border border-slate-200 flex space-x-1 w-full max-w-sm">
          {PERSONAS.map(persona => (
            <button key={persona.id} onClick={() => setActivePersona(persona.id)} className={`flex-1 flex flex-col items-center py-1.5 rounded-xl transition-all ${activePersona === persona.id ? 'bg-emerald-600 text-white shadow-lg scale-105' : 'text-slate-400 hover:bg-slate-50'}`}>
              <span className="text-sm leading-none mb-0.5">{persona.icon}</span>
              <span className="text-[8px] font-black uppercase tracking-tighter">{persona.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50 scrollbar-hide">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
            <div className="flex flex-col space-y-1 max-w-[85%] relative group">
              <div className={`px-5 py-3 rounded-[1.5rem] shadow-sm ${msg.role === 'user' ? 'bg-[#0A8A1F] text-white rounded-br-none' : 'bg-white text-gray-800 border border-gray-100 rounded-bl-none'} ${msg.isError ? 'bg-red-100 text-red-600' : ''}`}>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed font-medium">{msg.text}</div>
                
                {msg.groundingChunks && msg.groundingChunks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-100">
                     <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Official Verified Sources:</p>
                     <div className="flex flex-wrap gap-1.5">
                        {msg.groundingChunks.map((chunk, idx) => chunk.web ? (
                          <a key={idx} href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="bg-blue-50 text-blue-600 px-2 py-1 rounded-lg text-[8px] font-bold border border-blue-100 hover:bg-blue-100 transition-all flex items-center space-x-1">
                             <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                             <span>{chunk.web.title?.split('|')[0].trim()}</span>
                          </a>
                        ) : null)}
                     </div>
                  </div>
                )}

                {msg.role === 'model' && (
                  <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-slate-50 group-hover:opacity-100 transition-all">
                    <button 
                      onClick={() => playTTS(msg.text, msg.id)} 
                      className={`p-3 rounded-full shadow-lg transition-all active:scale-90 ${isPlayingId === msg.id ? 'bg-rose-500 text-white animate-pulse' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                      title="Listen"
                    >
                      {isPlayingId === msg.id ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                      )}
                    </button>
                    <button onClick={() => setShareData({ isOpen: true, content: msg.text })} className="p-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-full shadow-md transition-all">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start animate-pulse">
            <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-[2rem] rounded-bl-none max-w-[80%] shadow-sm">
               <div className="flex items-center space-x-3 mb-3">
                  <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">এআই চিন্তা করছে...</span>
               </div>
               <p className="text-sm font-bold text-slate-700 leading-tight">
                 {thinkingMessages[loadingStep]}
               </p>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t border-gray-100 space-y-4">
        {isListening && (
          <div className="flex justify-center items-center space-x-3 bg-rose-50 p-2 rounded-xl border border-rose-100 animate-fade-in">
             <div className="flex space-x-1">
                {[1,2,3].map(i => <div key={i} className="w-1 h-3 bg-rose-500 rounded-full animate-bounce" style={{animationDelay: `${i*0.2}s`}}></div>)}
             </div>
             <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">আমি আপনার কথা শুনছি...</span>
          </div>
        )}

        <div id="chat-quick-replies" className="flex overflow-x-auto space-x-2 pb-1 scrollbar-hide">
          <QuickReply label="চালের আজকের বাজার দর কত?" text="ঢাকার খুচরা বাজারে আজ বিভিন্ন ধরণের চালের দাম কত? dam.gov.bd এর তথ্যসূত্র দিন।" />
          <QuickReply label="চাষের জন্য আজকের আবহাওয়া?" text={`আজকের আবহাওয়া কি শস্য সুরক্ষার জন্য উপযুক্ত? BMD এবং BAMIS এর তথ্য দিন। আমার ফসল: ${userCrops.map(c => c.name).join(', ') || 'সবজি'}।`} />
          <QuickReply label="সারের সঠিক মাত্রা ও SRDI গাইড?" text="মাটি পরীক্ষার মান অনুযায়ী সারের সঠিক প্রয়োগ বিধি সম্পর্কে SRDI এবং BARC নির্দেশিকা কী বলে?" />
          <QuickReply label="মাজরা পোকা দমনে DAE এর পরামর্শ?" text="ধানের মাজরা পোকা দমনে DAE এবং BRRI এর আধুনিক এবং জৈবিক পদ্ধতিগুলো কী কী?" />
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex-1 relative">
            <input 
              type="text" 
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
              placeholder="জিজ্ঞাসা করুন..." 
              className="w-full border border-gray-200 rounded-2xl px-5 py-4 pr-12 focus:outline-none focus:ring-2 focus:ring-[#0A8A1F] transition text-sm font-medium" 
              disabled={isLoading} 
            />
            <button 
              onClick={toggleListening}
              className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white shadow-lg scale-110' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}
              title="ভয়েস ইনপুট"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
            </button>
          </div>
          <button onClick={() => handleSend()} disabled={isLoading || !inputText.trim()} className={`p-4 rounded-2xl text-white shadow-xl transition-all active:scale-90 ${isLoading || !inputText.trim() ? 'bg-gray-300' : 'bg-[#0A8A1F]'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
