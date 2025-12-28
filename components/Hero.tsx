import React, { useState, useEffect } from 'react';
import { View } from '../types';
import { generateAgriImage } from '../services/geminiService';
import { Logo } from './Logo';

interface HeroProps {
  onNavigate: (view: View) => void;
}

const GrowingPlant = ({ className = "", style = {} }: { className?: string, style?: React.CSSProperties }) => (
  <svg 
    viewBox="0 0 100 100" 
    className={`w-16 h-16 md:w-24 md:h-24 text-white pointer-events-none absolute ${className}`}
    fill="currentColor"
    style={style}
  >
    <path d="M50,100 Q45,60 50,20" stroke="currentColor" strokeWidth="3" fill="none" />
    <path d="M50,75 Q30,60 20,70 Q30,85 50,75" fillOpacity="0.8" />
    <path d="M50,55 Q70,40 80,50 Q70,65 50,55" fillOpacity="0.8" />
    <path d="M50,20 Q40,10 50,0 Q60,10 50,20" fillOpacity="0.9" />
  </svg>
);

export const Hero: React.FC<HeroProps> = ({ onNavigate }) => {
  const [bgImage, setBgImage] = useState<string>("");

  useEffect(() => {
    const fetchBg = async () => {
      const themes = [
        "Cinematic aerial shot of lush green rice terraces in Bangladesh",
        "Modern smart farming dashboard floating over a golden wheat field",
        "A group of Bengali farmers using futuristic digital tools in a greenhouse",
        "Beautiful sunset over a traditional Bangladeshi agricultural landscape high resolution"
      ];
      const randomTheme = themes[Math.floor(Math.random() * themes.length)];
      try {
        const url = await generateAgriImage(randomTheme);
        setBgImage(url);
      } catch (e) {
        console.error("Hero BG Error:", e);
      }
    };
    fetchBg();
  }, []);

  return (
    <div id="hero-section" className="relative bg-slate-900 text-white overflow-hidden rounded-b-[4rem] md:rounded-b-[6rem] shadow-2xl min-h-[750px] flex flex-col justify-center border-b-[20px] border-[#0A8A1F]/30">
      {/* Background Image Container with parallax-ready setup */}
      <div className="absolute inset-0 z-0 scale-110">
        {bgImage ? (
          <div 
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-2000 animate-fade-in"
            style={{ backgroundImage: `url(${bgImage})` }}
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[#0A8A1F] via-slate-900 to-black" />
        )}
        {/* Layered Gradients for Depth */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" />
      </div>

      {/* Dynamic Background Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
        <div className="absolute top-20 right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[150px]"></div>
        <GrowingPlant style={{ bottom: '10%', left: '5%', animationDelay: '0s' }} className="animate-grow-plant opacity-0" />
        <GrowingPlant style={{ bottom: '25%', right: '15%', animationDelay: '2s' }} className="animate-grow-plant opacity-0 scale-75 rotate-12" />
      </div>
      
      <div className="relative z-20 max-w-7xl mx-auto px-6 py-24 flex flex-col items-center text-center">
        {/* Logo and Tag */}
        <div className="mb-12 transform hover:scale-105 transition-transform duration-700 animate-fade-in flex flex-col items-center">
           <Logo size="xl" showText={true} textColor="text-white" />
           <div className="mt-4 bg-emerald-600/20 backdrop-blur-md px-6 py-1.5 rounded-full border border-emerald-500/30 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-400">Project Krishi 2.0</span>
           </div>
        </div>

        <h1 className="text-6xl md:text-9xl font-black mb-8 tracking-tighter leading-[0.85] drop-shadow-[0_20px_30px_rgba(0,0,0,0.6)] animate-fade-in">
          চাষাবাদ হবে<br/>
          <span className="bg-gradient-to-r from-emerald-400 via-green-300 to-blue-400 bg-clip-text text-transparent">স্মার্ট ও আধুনিক</span>
        </h1>
        
        <p className="max-w-2xl text-xl md:text-2xl font-medium text-slate-300 mb-16 leading-relaxed animate-fade-in [animation-delay:0.2s] drop-shadow-xl">
          বাংলাদেশের কৃষকদের জন্য তৈরি সর্বাধুনিক এআই এবং স্যাটেলাইট প্রযুক্তি। 
          নিখুঁত রোগ নির্ণয় থেকে ফলন পূর্বাভাস—সবই এখন আপনার হাতের মুঠোয়।
        </p>
        
        {/* Primary Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-2xl justify-center animate-fade-in [animation-delay:0.4s] mb-16">
          <button 
            onClick={() => onNavigate(View.ANALYZER)}
            className="flex-1 bg-white text-slate-900 px-10 py-6 rounded-[2.5rem] font-black text-xl shadow-[0_20px_60px_rgba(255,255,255,0.1)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-4 group"
          >
             <span className="text-3xl">📸</span>
             <span>এআই স্ক্যানার</span>
             <svg className="w-6 h-6 group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
          </button>
          
          <button 
            onClick={() => onNavigate(View.CHAT)}
            className="flex-1 bg-[#0A8A1F] text-white px-10 py-6 rounded-[2.5rem] font-black text-xl shadow-[0_20px_60px_rgba(10,138,31,0.3)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-4 group border border-emerald-400/30"
          >
             <span className="text-3xl">🤖</span>
             <span>এআই চ্যাটবট</span>
          </button>
        </div>

        {/* Floating Quick Stats - High Visual Impact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl animate-fade-in [animation-delay:0.6s]">
           <HeroMetric icon="🌾" label="সাশ্রয়ী" val="৩০%" />
           <HeroMetric icon="🛰️" label="স্যাটেলাইট" val="লাইভ" />
           <HeroMetric icon="🧬" label="নির্ণয়" val="১০০%" />
           <HeroMetric icon="🎓" label="শিখন" val="২০+" />
        </div>
      </div>
    </div>
  );
};

const HeroMetric = ({ icon, label, val }: any) => (
  <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-5 rounded-3xl flex flex-col items-center justify-center group hover:bg-white/10 transition-all">
     <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">{icon}</span>
     <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{label}</span>
     <span className="text-xl font-black text-white">{val}</span>
  </div>
);