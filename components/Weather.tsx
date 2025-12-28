import React, { useState, useEffect, useRef } from 'react';
import { getLiveWeather, generateGroundedWeatherReport, generateSpeech, decodeBase64, decodeAudioData } from '../services/geminiService';
import { WeatherData, ForecastDay, GroundingChunk } from '../types';
import { getStoredLocation, saveStoredLocation } from '../services/locationService';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import GuidedTour, { TourStep } from './GuidedTour';

interface WeatherProps {
  onBack?: () => void;
}

const WEATHER_TOUR: TourStep[] = [
  {
    title: "স্মার্ট কৃষি আবহাওয়া",
    content: "Google Weather ও BAMIS তথ্যের সমন্বয়ে আপনার এলাকার সঠিক আবহাওয়া এবং কৃষি ঝুঁকি জানুন।",
    position: 'center'
  },
  {
    targetId: "weather-refresh-btn",
    title: "লাইভ আপডেট",
    content: "যেকোনো সময় সর্বশেষ আবহাওয়া জানতে এই রিফ্রেশ বাটনটি ব্যবহার করুন।",
    position: 'bottom'
  }
];

const WEATHER_CACHE_KEY = 'agritech_weather_cache';
const WEATHER_TIMESTAMP_KEY = 'agritech_weather_last_update';
const ONE_HOUR_MS = 3600000;

const Weather: React.FC<WeatherProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'forecast' | 'risks' | 'spraying' | 'report'>('forecast');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [report, setReport] = useState<{ text: string, groundingChunks: GroundingChunk[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isReportLoading, setIsReportLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTour, setShowTour] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  // Accurate Real-time clock effect (updates every second for accuracy)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Weather data update logic: Check cache on mount, and set interval for hourly refresh
  useEffect(() => {
    const tourDone = localStorage.getItem('agritech_tour_weather_v2');
    if (!tourDone) setShowTour(true);
    
    // Initial load from cache or fetch
    loadInitialWeather();

    // Set hourly interval for weather data refresh
    const weatherUpdateTimer = setInterval(() => {
      fetchWeather(true);
    }, ONE_HOUR_MS);

    return () => clearInterval(weatherUpdateTimer);
  }, []);

  const loadInitialWeather = async () => {
    const cachedData = localStorage.getItem(WEATHER_CACHE_KEY);
    const lastUpdate = localStorage.getItem(WEATHER_TIMESTAMP_KEY);
    const now = Date.now();

    if (cachedData && lastUpdate && (now - parseInt(lastUpdate) < ONE_HOUR_MS)) {
      setWeather(JSON.parse(cachedData));
    } else {
      fetchWeather(false);
    }
  };

  const fetchWeather = async (force: boolean = false) => {
    setIsLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        saveStoredLocation(latitude, longitude);
        try {
          const data = await getLiveWeather(latitude, longitude, force);
          setWeather(data);
          localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(WEATHER_TIMESTAMP_KEY, Date.now().toString());
        } catch (err) {
          console.error("Weather error:", err);
        } finally { setIsLoading(false); }
      }, () => setIsLoading(false), { timeout: 10000 });
    } else {
      setIsLoading(false);
    }
  };

  const fetchOfficialReport = async () => {
    if (!weather) return;
    setIsReportLoading(true);
    try {
      const data = await generateGroundedWeatherReport(`${weather.upazila}, ${weather.district}`);
      setReport(data);
      if (data.text) {
        playTTS(data.text);
      }
    } catch (e) {
      alert("রিপোর্ট সংগ্রহে সমস্যা হয়েছে।");
    } finally { setIsReportLoading(false); }
  };

  const playTTS = async (text: string) => {
    if (isPlaying) { stopTTS(); return; }
    try {
      setIsPlaying(true);
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      const base64 = await generateSpeech(text.replace(/[*#_~]/g, ''));
      const buffer = await decodeAudioData(decodeBase64(base64), ctx, 24000, 1);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.onended = () => setIsPlaying(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (e) { setIsPlaying(false); }
  };

  const stopTTS = () => {
    if (currentSourceRef.current) { currentSourceRef.current.stop(); currentSourceRef.current = null; }
    setIsPlaying(false);
  };

  const getSpraySafety = () => {
    if (!weather) return { status: 'Unknown', color: 'slate', desc: '' };
    const { windSpeed, rainProbability, humidity, temp } = weather;
    
    let dangerLevel = 0;
    if (windSpeed > 12) dangerLevel += 2;
    if (rainProbability > 25) dangerLevel += 2;
    if (humidity > 80) dangerLevel += 1;
    if (temp > 32) dangerLevel += 1;

    if (dangerLevel >= 3) return { status: 'ঝুঁকিপূর্ণ', color: 'rose', desc: 'এখন স্প্রে করা থেকে বিরত থাকুন।' };
    if (dangerLevel >= 1.5) return { status: 'সতর্কাবস্থা', color: 'amber', desc: 'আবহাওয়া নিবিড়ভাবে পর্যবেক্ষণ করুন।' };
    return { status: 'আদর্শ সময়', color: 'emerald', desc: 'বালাইনাশক প্রয়োগের জন্য উপযুক্ত আবহাওয়া।' };
  };

  const spray = getSpraySafety();

  const formattedDate = currentTime.toLocaleDateString('bn-BD', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('bn-BD');

  return (
    <div className="max-w-4xl mx-auto bg-slate-50 min-h-screen pb-32 font-sans overflow-x-hidden">
      {showTour && <GuidedTour steps={WEATHER_TOUR} tourKey="weather_v2" onClose={() => setShowTour(false)} />}
      
      <div className="bg-white px-6 py-6 border-b border-slate-100 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <div className="flex items-center space-x-4">
           <button onClick={onBack} className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 hover:bg-[#0A8A1F] hover:text-white transition-all active:scale-90 text-slate-400">
             <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
           </button>
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-xl text-xl shrink-0">🌍</div>
           <div>
             <h1 className="text-xl font-black text-slate-800 leading-none">লাইভ কৃষি-আবহাওয়া</h1>
             <div className="mt-1.5 flex flex-col">
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
                  {weather?.upazila || 'শনাক্ত হচ্ছে...'}, {weather?.district || ''}
                </p>
             </div>
           </div>
        </div>
        <button id="weather-refresh-btn" onClick={() => fetchWeather(true)} className={`p-3 bg-blue-50 text-blue-600 rounded-2xl active:scale-90 transition-all ${isLoading ? 'animate-spin' : ''}`} title="আবহাওয়া রিফ্রেশ করুন">
           <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
        </button>
      </div>

      {isLoading && !weather ? (
        <div className="flex flex-col items-center justify-center py-40 animate-fade-in">
           <div className="w-24 h-24 border-8 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
           <h2 className="text-2xl font-black text-slate-800 mt-8">ডাটা সংগ্রহ হচ্ছে...</h2>
           <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-2">Google Weather Grounding Active</p>
        </div>
      ) : weather && (
        <div className="p-4 md:p-8 space-y-10 animate-fade-in">
           <section className="bg-gradient-to-br from-blue-600 via-indigo-700 to-slate-900 rounded-[4rem] p-10 text-white shadow-2xl relative overflow-hidden text-center">
              <div className="text-9xl mb-6 drop-shadow-2xl">{weather.condition?.includes('রোদ্র') ? "☀️" : weather.condition?.includes('বৃষ্টি') ? "🌧️" : "⛅"}</div>
              <div className="flex items-baseline justify-center space-x-2">
                 <span className="text-9xl font-black tracking-tighter">{weather.temp}</span>
                 <span className="text-4xl font-bold opacity-60">°C</span>
              </div>
              <p className="text-xl font-black uppercase tracking-[0.3em] mt-6 bg-white/20 px-10 py-2 rounded-full border border-white/30 backdrop-blur-xl">{weather.condition}</p>
              <div className="mt-6">
                 <p className="text-[10px] font-black uppercase tracking-widest text-blue-200">Source: Google Weather Data</p>
                 <p className="text-[9px] font-bold text-white/50 uppercase tracking-tighter mt-1">
                   {formattedDate} • <span className="text-emerald-400 font-black">{formattedTime}</span>
                 </p>
              </div>
              <p className="text-sm font-medium text-blue-100/70 mt-8 max-w-sm mx-auto leading-relaxed">{weather.description}</p>
           </section>

           <div className="flex bg-white p-1.5 rounded-[2.5rem] shadow-lg border border-slate-100 overflow-x-auto scrollbar-hide">
              <button onClick={() => setActiveTab('forecast')} className={`flex-1 min-w-[120px] py-4 text-[10px] font-black uppercase rounded-[2rem] transition-all ${activeTab === 'forecast' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>৭ দিনের পূর্বাভাস</button>
              <button onClick={() => setActiveTab('risks')} className={`flex-1 min-w-[120px] py-4 text-[10px] font-black uppercase rounded-[2rem] transition-all ${activeTab === 'risks' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>রোগবালাই ঝুঁকি</button>
              <button onClick={() => setActiveTab('spraying')} className={`flex-1 min-w-[120px] py-4 text-[10px] font-black uppercase rounded-[2rem] transition-all ${activeTab === 'spraying' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>স্প্রে গাইড</button>
              <button onClick={() => { setActiveTab('report'); if (!report) fetchOfficialReport(); }} className={`flex-1 min-w-[120px] py-4 text-[10px] font-black uppercase rounded-[2rem] transition-all ${activeTab === 'report' ? 'bg-blue-600 text-white shadow-xl' : 'text-slate-400'}`}>অফিসিয়াল রিপোর্ট</button>
           </div>

           {activeTab === 'risks' && (
             <div className="space-y-6 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                   <MetricBox label="আর্দ্রতা" val={weather.humidity} unit="%" color="blue" />
                   <MetricBox label="বৃষ্টির শঙ্কা" val={weather.rainProbability} unit="%" color="indigo" />
                   <MetricBox label="মাটি" val={weather.soilTemperature} unit="°C" color="amber" />
                   <MetricBox label="GDD" val={weather.gdd} unit="pts" color="emerald" />
                </div>
                <div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100">
                   <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-black text-slate-800 flex items-center"><span className="mr-3">🌡️</span> পরিবেশগত রোগ ঝুঁকি</h3>
                      <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Source: Google Metrix</span>
                   </div>
                   <ul className="space-y-4">
                      {weather.humidity > 85 && weather.temp < 22 && (
                         <RiskAlert title="আলুর লেট ব্লাইট সতর্কতা" desc="আর্দ্রতা ও কুয়াশা বেশি থাকায় লেট ব্লাইটের উচ্চ ঝুঁকি। আগাম ছত্রাকনাশক স্প্রে দিন।" icon="🥔" color="rose" />
                      )}
                      {weather.humidity > 90 && (
                         <RiskAlert title="ধানের ব্লাস্ট ঝুঁকি" desc="উচ্চ আর্দ্রতায় ব্লাস্ট রোগ দ্রুত ছড়াতে পারে। জমি পর্যবেক্ষণ করুন।" icon="🌾" color="amber" />
                      )}
                      {weather.windSpeed > 15 && (
                         <RiskAlert title="বাতাসজনিত সতর্কতা" desc="বাতাসের গতি বেশি থাকায় দানাদার সার ও পাউডার স্প্রে করা এড়িয়ে চলুন।" icon="💨" color="indigo" />
                      )}
                   </ul>
                </div>
             </div>
           )}

           {activeTab === 'report' && (
             <div className="space-y-8 animate-fade-in">
                {isReportLoading ? (
                   <div className="bg-white p-16 rounded-[4rem] text-center shadow-xl border flex flex-col items-center space-y-8">
                      <div className="w-20 h-20 border-8 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                      <h3 className="text-xl font-black text-slate-800">BAMIS পোর্টাল রিপোর্ট জেনারেট হচ্ছে...</h3>
                   </div>
                ) : report ? (
                   <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border-t-[16px] border-blue-600 relative overflow-hidden flex flex-col">
                      <div className="flex justify-between items-center mb-10 pb-8 border-b-2 border-slate-50 relative z-10">
                        <div>
                          <h3 className="text-3xl font-black text-slate-900 tracking-tighter leading-none">অফিসিয়াল এগ্রো-রিপোর্ট</h3>
                          <p className="text-[10px] font-black uppercase text-blue-500 mt-2">Grounded: BAMIS Portal + Google Weather</p>
                        </div>
                        <button onClick={() => playTTS(report.text)} className={`p-6 rounded-full shadow-2xl transition-all active:scale-90 ${isPlaying ? 'bg-rose-500 text-white animate-pulse' : 'bg-blue-600 text-white'}`}>
                           {isPlaying ? '🔇' : '🔊'}
                        </button>
                      </div>
                      <div className="prose prose-slate max-w-none font-medium leading-relaxed whitespace-pre-wrap text-slate-700 text-lg">
                        {report.text}
                      </div>
                   </div>
                ) : null}
             </div>
           )}

           {activeTab === 'forecast' && (
             <div className="space-y-8 animate-fade-in">
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
                   {weather.forecast?.map((day, i) => (
                     <div key={i} className="min-w-[140px] bg-white p-6 rounded-[2.5rem] border border-slate-100 flex flex-col items-center text-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase mb-4">{day.date}</span>
                        <span className="text-4xl mb-4">{day.condition?.includes('বৃষ্টি') ? '🌧️' : '☀️'}</span>
                        <div className="font-black text-xl text-slate-800">{day.maxTemp}°</div>
                        <div className="text-[9px] font-bold text-slate-300 uppercase mt-2">{day.condition}</div>
                     </div>
                   ))}
                </div>
                <div className="bg-white p-8 rounded-[3.5rem] border border-slate-100 shadow-xl h-80 relative overflow-hidden">
                   <div className="absolute top-4 right-8 text-[8px] font-black text-slate-300 uppercase tracking-widest">Google Forecast Engine</div>
                   <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={weather.forecast || []}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="date" hide />
                         <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', fontWeight: 'bold' }} />
                         <Area type="monotone" dataKey="maxTemp" fill="#3b82f6" fillOpacity={0.1} stroke="#3b82f6" strokeWidth={4} />
                         <Line type="monotone" dataKey="minTemp" stroke="#94a3b8" strokeWidth={2} strokeDasharray="5 5" />
                      </ComposedChart>
                   </ResponsiveContainer>
                </div>
             </div>
           )}

           {activeTab === 'spraying' && (
             <div className="space-y-8 animate-fade-in">
                <div className={`bg-white rounded-[4rem] p-10 md:p-14 shadow-2xl border-t-[20px] border-${spray.color}-600 flex flex-col items-center text-center space-y-8`}>
                   <div className={`w-32 h-32 rounded-[2.5rem] bg-${spray.color}-50 flex items-center justify-center text-6xl text-${spray.color}-600`}>
                      {spray.color === 'emerald' ? '✅' : spray.color === 'amber' ? '⚠️' : '❌'}
                   </div>
                   <div>
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Based on Real-time Google Weather Data</p>
                      <h3 className="text-4xl font-black text-slate-900 leading-none mb-3">{spray.status}</h3>
                      <p className="text-lg font-bold text-slate-500 leading-relaxed">{spray.desc}</p>
                   </div>
                </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
};

const MetricBox = ({ label, val, unit, color }: any) => (
  <div className="bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center text-center">
     <p className="text-[9px] font-black text-slate-400 uppercase mb-1">{label}</p>
     <p className="text-lg font-black text-slate-800">{val}<span className="text-[10px] ml-0.5 opacity-40">{unit}</span></p>
  </div>
);

const RiskAlert = ({ title, desc, icon, color }: any) => (
  <li className={`p-6 rounded-3xl border-l-[12px] border-${color}-600 bg-${color}-50/50 flex items-start space-x-4`}>
     <div className="text-3xl shrink-0">{icon}</div>
     <div>
        <h4 className="font-black text-slate-800 text-sm">{title}</h4>
        <p className="text-xs text-slate-500 leading-relaxed mt-1">{desc}</p>
     </div>
  </li>
);

export default Weather;
