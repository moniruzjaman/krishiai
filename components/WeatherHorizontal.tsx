
import React, { useState, useEffect } from 'react';
import { getLiveWeather } from '../services/geminiService';
import { WeatherData } from '../types';
import { getStoredLocation, saveStoredLocation } from '../services/locationService';

const WEATHER_CACHE_KEY = 'agritech_weather_cache';
const WEATHER_TIMESTAMP_KEY = 'agritech_weather_last_update';
const ONE_HOUR_MS = 3600000;

export const WeatherHorizontal: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    loadInitialWeather();
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
          console.error("Home weather error:", err);
        } finally { setIsLoading(false); }
      }, () => setIsLoading(false), { timeout: 10000 });
    } else {
      setIsLoading(false);
    }
  };

  if (isLoading && !weather) {
    return (
      <div className="max-w-7xl mx-auto px-4 -mt-10 relative z-30">
        <div className="bg-white/95 backdrop-blur-xl rounded-[2rem] p-4 shadow-2xl border border-white flex items-center justify-center space-x-3 h-20">
          <div className="w-5 h-5 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Live Weather সিঙ্ক হচ্ছে...</span>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const isSprayingSafe = weather.windSpeed <= 12 && weather.rainProbability < 25;
  const formattedDate = currentTime.toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div id="weather-horizontal-widget" className="max-w-7xl mx-auto px-4 -mt-10 relative z-30 animate-fade-in">
      <div className="bg-white rounded-[2.5rem] p-4 md:p-6 shadow-2xl border border-white flex flex-col lg:flex-row items-center justify-between gap-6 relative overflow-hidden group">
        <div className="flex items-center space-x-5 flex-shrink-0 relative z-10">
          <div className="relative">
             <div className="text-5xl drop-shadow-sm transition-transform group-hover:scale-110 duration-500">
               {weather.condition?.includes('রোদ্র') ? "☀️" : weather.condition?.includes('বৃষ্টি') ? "🌧️" : "⛅"}
             </div>
             <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
          </div>
          <div>
            <div className="flex items-baseline space-x-2">
              <span className="text-5xl font-black text-slate-800 tracking-tighter">{weather.temp}°</span>
              <div className="flex flex-col">
                 <span className="text-sm font-black text-emerald-600 uppercase leading-none">{weather.condition}</span>
                 <span className="text-[7px] font-black text-white bg-blue-600 px-1 py-0.5 rounded-sm mt-1 uppercase tracking-widest inline-block text-center">BAMIS Integrated</span>
              </div>
            </div>
            <div className="flex flex-col mt-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center">
                📍 {weather.upazila}, {weather.district}
                <button 
                  onClick={() => fetchWeather(true)} 
                  className={`ml-3 text-blue-500 hover:text-blue-700 transition-colors ${isLoading ? 'animate-spin' : ''}`}
                  title="Refresh Weather"
                >
                   <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                </button>
              </p>
              <div className="flex items-center space-x-2 mt-1">
                 <p className="text-[9px] font-bold text-blue-600 uppercase tracking-tighter">
                   {formattedDate} • <span className="font-black text-slate-900">{formattedTime}</span>
                 </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 px-6 py-4 bg-slate-50/50 rounded-3xl border border-slate-100 flex-1 w-full lg:w-auto relative z-10">
          <WeatherMetric label="আর্দ্রতা" val={weather.humidity} unit="%" />
          <WeatherMetric label="বাতাস" val={weather.windSpeed} unit="km/h" />
          <WeatherMetric label="মাটি" val={weather.soilTemperature} unit="°C" />
          <WeatherMetric label="GDD" val={weather.gdd} unit="pts" />
        </div>

        <div className={`flex items-center space-x-4 px-8 py-4 rounded-[2rem] border-2 transition-all duration-500 w-full lg:w-auto relative z-10 ${isSprayingSafe ? 'bg-emerald-50 border-emerald-100' : 'bg-rose-50 border-rose-100'}`}>
           <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-3xl shadow-inner bg-white ${isSprayingSafe ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isSprayingSafe ? "✅" : "⚠️"}
           </div>
           <div>
              <p className="text-[10px] font-black uppercase tracking-widest leading-none mb-1 text-slate-400">স্প্রে সতর্কতা (BMD)</p>
              <p className={`text-xs font-black ${isSprayingSafe ? 'text-emerald-600' : 'text-rose-600'}`}>{isSprayingSafe ? "আদর্শ সময়" : "এখন ঝুঁকি আছে"}</p>
           </div>
        </div>
      </div>
    </div>
  );
};

const WeatherMetric = ({ label, val, unit }: any) => (
  <div className="text-center md:text-left">
    <p className="text-[8px] font-black text-slate-400 uppercase mb-0.5 tracking-widest">{label}</p>
    <p className="text-base font-black text-slate-700 leading-none">{val}<span className="text-[10px] ml-0.5 opacity-30">{unit}</span></p>
  </div>
);
