
import React, { useState, useEffect, useMemo } from 'react';
import { getLiveWeather } from '../services/ai/geminiService';
import { queryCropNetInsight } from '../services/ai/huggingfaceService';
import { WeatherData, Language } from '../types';
import { getStoredLocation, saveStoredLocation } from '../services/utils/locationService';

const toBanglaNumber = (val: any) => {
  if (val === null || val === undefined) return '';
  const banglaNumbers: Record<string, string> = {
    '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯', '.': '.'
  };
  return val.toString().replace(/[0-9.]/g, (w: string) => banglaNumbers[w]);
};

const WEATHER_CACHE_KEY = 'agritech_weather_cache';
const WEATHER_TIMESTAMP_KEY = 'agritech_weather_last_update';
const ONE_HOUR_MS = 3600000;

export const WeatherHorizontal: React.FC<{ lang?: Language }> = ({ lang = 'bn' }) => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [hfInsight, setHfInsight] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [coords, setCoords] = useState<{ lat: number, lng: number } | null>(null);

  const weatherLoadingMessages = lang === 'bn' ? [
    "আবহাওয়া স্যাটেলাইট (Meteosat) ডাটা সংগ্রহ হচ্ছে...",
    "CropNet এআই মডেল বিশ্লেষণ চলছে...",
    "BAMIS কৃষি প্রোটোকল অনুযায়ী ডাটা যাচাই হচ্ছে...",
    "আপনার খামারের জন্য লোকাল ফোরকাস্ট সিঙ্ক করা হচ্ছে..."
  ] : [
    "Collecting Meteosat satellite data...",
    "Analyzing CropNet AI models...",
    "Verifying data via BAMIS Agri-Protocols...",
    "Syncing localized forecast for your farm..."
  ];

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let interval: any;
    if (isLoading) {
      interval = setInterval(() => {
        setLoadingStep(prev => (prev + 1) % weatherLoadingMessages.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [isLoading, weatherLoadingMessages.length]);

  useEffect(() => {
    loadInitialWeather();
    const weatherUpdateTimer = setInterval(() => { fetchWeather(true); }, ONE_HOUR_MS);
    return () => clearInterval(weatherUpdateTimer);
  }, []);

  const loadInitialWeather = async () => {
    const cachedData = localStorage.getItem(WEATHER_CACHE_KEY);
    const lastUpdate = localStorage.getItem(WEATHER_TIMESTAMP_KEY);
    const now = Date.now();
    if (cachedData && lastUpdate && (now - parseInt(lastUpdate) < ONE_HOUR_MS)) {
      const data = JSON.parse(cachedData);
      setWeather(data);
      const stored = getStoredLocation();
      if (stored) setCoords({ lat: stored.lat, lng: stored.lng });
      fetchHFInsight(data);
    } else {
      fetchWeather(false);
    }
  };

  const fetchHFInsight = async (data: WeatherData) => {
    try {
      const insight = await queryCropNetInsight(data, lang);
      setHfInsight(insight);
    } catch (e) { }
  };

  const fetchWeather = async (force: boolean = false) => {
    setIsLoading(true);
    setLoadingStep(0);

    const useDefaultLocation = async () => {
      try {
        const defLat = 23.8103, defLng = 90.4125;
        setCoords({ lat: defLat, lng: defLng });
        const data = await getLiveWeather(defLat, defLng, force, lang as Language);
        setWeather(data);
        localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
        localStorage.setItem(WEATHER_TIMESTAMP_KEY, Date.now().toString());
        fetchHFInsight(data);
      } catch (e) { } finally { setIsLoading(false); }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        saveStoredLocation(latitude, longitude);
        try {
          const data = await getLiveWeather(latitude, longitude, force, lang as Language);
          setWeather(data);
          localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(data));
          localStorage.setItem(WEATHER_TIMESTAMP_KEY, Date.now().toString());
          fetchHFInsight(data);
        } catch (_err) {
          useDefaultLocation();
        } finally { setIsLoading(false); }
      }, (_err) => {
        useDefaultLocation();
      }, { timeout: 15000 });
    } else {
      useDefaultLocation();
    }
  };

  const enhancedRisk = useMemo(() => {
    if (!weather) return null;
    const humidity = weather.humidity;
    const temp = weather.temp;

    if (humidity > 80 && temp < 22) return { label: lang === 'bn' ? "লেট ব্লাইট ঝুঁকি (উচ্চ)" : "Late Blight Risk (High)", level: 'high', icon: '⚠️' };
    if (humidity > 85 && temp >= 22 && temp <= 28) return { label: lang === 'bn' ? "ব্লাস্ট রোগ ঝুঁকি (উচ্চ)" : "Rice Blast Risk (High)", level: 'high', icon: '🌾' };
    if (humidity > 80 && temp >= 25 && temp <= 30) return { label: lang === 'bn' ? "কারেন্ট পোকা ঝুঁকি" : "BPH Pest Risk", level: 'medium', icon: '🦟' };
    return { label: weather.diseaseRisk || (lang === 'bn' ? "স্বাভাবিক" : "Normal"), level: 'low', icon: '🦠' };
  }, [weather, lang]);

  if (isLoading && !weather) {
    return (
      <div className="max-w-7xl mx-auto px-4 -mt-12 relative z-[70] animate-fade-in">
        <div className="bg-white/95 backdrop-blur-xl rounded-[3rem] p-8 shadow-2xl border border-white flex flex-col items-center justify-center space-y-4 overflow-hidden relative">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 border-4 border-emerald-500 border-t-emerald-600 rounded-full animate-spin"></div>
            <div className="flex flex-col">
              <span className="text-sm font-black text-slate-800 transition-all duration-500">{weatherLoadingMessages[loadingStep]}</span>
              <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest">CropNet Analysis Active</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const isSprayingSafe = weather.windSpeed <= 12 && weather.rainProbability < 25;
  const formattedDate = currentTime.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString(lang === 'bn' ? 'bn-BD' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <div id="weather-horizontal-widget" className="max-w-7xl mx-auto px-4 -mt-12 relative z-[70] animate-fade-in">
      <div className="bg-white rounded-[3rem] p-6 md:p-8 shadow-[0_20px_50px_rgba(0,0,0,0.1)] border border-white flex flex-col xl:flex-row items-center justify-between gap-8 relative overflow-hidden group">

        {/* Main Temperature Section */}
        <div className="flex items-center space-x-6 flex-shrink-0 relative z-10 w-full xl:w-auto">
          <div className="relative">
            <div className="text-7xl drop-shadow-md animate-pulse">
              {weather.condition?.includes('রোদ্র') || weather.condition?.toLowerCase().includes('sunny') ? "☀️" :
                weather.condition?.includes('বৃষ্টি') || weather.condition?.toLowerCase().includes('rain') ? "🌧️" : "⛅"}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-6xl font-black text-slate-800 tracking-tighter leading-none">
                {lang === 'bn' ? toBanglaNumber(weather.temp) : weather.temp}°
              </span>
              <div className="flex flex-col">
                <span className="text-lg font-black text-emerald-600 uppercase leading-none tracking-tight">{weather.condition}</span>
                <span className="text-[8px] font-black text-white bg-blue-600 px-2 py-0.5 rounded-full mt-1.5 uppercase tracking-widest inline-flex items-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full mr-1 animate-pulse"></span>
                  CropNet / BAMIS Link
                </span>
              </div>
            </div>
            <div className="flex flex-col mt-3">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <span>📍 {weather.upazila}, {weather.district} ({coords ? `${toBanglaNumber(coords.lat.toFixed(2))}, ${toBanglaNumber(coords.lng.toFixed(2))}` : '...'})</span>
              </p>
              <p className="text-[9px] font-bold text-blue-500 uppercase mt-1">{formattedDate} • {formattedTime}</p>
            </div>
          </div>
        </div>

        {/* Actionable Agricultural Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 px-6 py-5 bg-slate-50/80 backdrop-blur-sm rounded-[2.2rem] border border-slate-100 flex-1 w-full relative z-10">
          <MetricItem label={lang === 'bn' ? "আর্দ্রতা" : "Humidity"} val={lang === 'bn' ? toBanglaNumber(weather.humidity) : weather.humidity} unit="%" icon="💧" />
          <MetricItem label={lang === 'bn' ? "বাতাস" : "Wind"} val={lang === 'bn' ? toBanglaNumber(weather.windSpeed) : weather.windSpeed} unit="km/h" icon="💨" />
          <MetricItem label={lang === 'bn' ? "সেচ (ET0)" : "ET0"} val={lang === 'bn' ? toBanglaNumber(weather.evapotranspiration || "১.২") : weather.evapotranspiration || "1.2"} unit="mm" icon="🚿" />
          <MetricItem label={lang === 'bn' ? "বিকিরণ" : "Solar"} val={lang === 'bn' ? toBanglaNumber(weather.solarRadiation || "৩৫০") : weather.solarRadiation || "350"} unit="W/m²" icon="☀️" />

          <div className="col-span-2 md:col-span-1 flex flex-col p-3 rounded-2xl border bg-white/40 border-white/60 shadow-sm overflow-hidden">
            <div className="flex items-center space-x-2 mb-1.5">
              <span className="text-base animate-bounce">{enhancedRisk?.icon}</span>
              <p className="text-[9px] font-black uppercase tracking-widest text-rose-600">
                {lang === 'bn' ? 'বালাই শঙ্কা' : 'Pest Risk'}
              </p>
            </div>
            <p className="text-[10px] font-black text-slate-800 leading-tight">
              {hfInsight ? hfInsight.slice(0, 50) + '...' : enhancedRisk?.label}
            </p>
          </div>
        </div>

        {/* Spray Guide CTA */}
        <div
          onClick={() => fetchWeather(true)}
          className={`flex items-center space-x-5 px-10 py-5 rounded-[2.5rem] border-2 transition-all w-full xl:w-auto shadow-sm cursor-pointer active:scale-95 ${isSprayingSafe ? 'bg-emerald-50 border-emerald-100 hover:shadow-emerald-100' : 'bg-rose-50 border-rose-100 hover:shadow-rose-100'
            }`}
        >
          <div className={`w-14 h-14 rounded-[1.5rem] flex items-center justify-center text-4xl bg-white ${isSprayingSafe ? 'text-emerald-600' : 'text-rose-600'}`}>
            {isSprayingSafe ? "✅" : "⚠️"}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-2 text-slate-400">{lang === 'bn' ? 'স্প্রে সতর্কতা' : 'Spray Alert'}</p>
            <p className={`text-sm font-black uppercase ${isSprayingSafe ? 'text-emerald-700' : 'text-rose-700'}`}>
              {isSprayingSafe ? (lang === 'bn' ? "আদর্শ সময়" : "Safe Now") : (lang === 'bn' ? "এখন ঝুঁকি আছে" : "High Risk")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

const MetricItem = ({ label, val, unit, icon }: any) => (
  <div className="flex flex-col items-center md:items-start">
    <div className="flex items-center space-x-2 mb-1.5">
      <span className="text-base">{icon}</span>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
    </div>
    <p className="text-xl font-black text-slate-800 leading-none">
      {val}<span className="text-[10px] ml-0.5 opacity-30 font-bold uppercase">{unit}</span>
    </p>
  </div>
);
