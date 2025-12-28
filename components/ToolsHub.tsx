
import React, { useState, useRef, useEffect } from 'react';
import { View } from '../types';

interface Tool {
  id: View;
  title: string;
  desc: string;
  icon: string;
  category: 'diagnosis' | 'planning' | 'advisory' | 'monitoring' | 'academic' | 'p-suite' | 's-suite';
  isAI?: boolean;
  isGovt?: boolean;
  isPriority?: boolean;
}

const ToolsHub: React.FC<{ onNavigate: (view: View) => void }> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'diagnosis' | 'planning' | 'advisory' | 'monitoring' | 'academic'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
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
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    isListening ? recognitionRef.current.stop() : recognitionRef.current.start();
  };

  const tools: Tool[] = [
    { id: View.ANALYZER, category: 'p-suite', title: 'রোগ শনাক্তকরণ', desc: 'ধাপে ধাপে ছবির মাধ্যমে রোগ নির্ণয়', icon: '📸', isAI: true, isPriority: true },
    { id: View.CROP_DISEASE_LIBRARY, category: 'p-suite', title: 'বালাই লাইব্রেরি', desc: 'ফসল অনুযায়ী রোগের তথ্য ও প্রতিকার', icon: '📖', isAI: true },
    { id: View.PEST_EXPERT, category: 'p-suite', title: 'রোগ ও বালাইনাশক বিশেষজ্ঞ', desc: 'সঠিক ডোজ ও মিক্সিং গাইড', icon: '🧪', isAI: true },
    { id: View.SOIL_EXPERT, category: 's-suite', title: 'মাটি বিশ্লেষণ', desc: 'অঞ্চলভেদে মাটির গুণাগুণ বিশ্লেষণ', icon: '🏺', isAI: true, isPriority: true },
    { id: View.SOIL_GUIDE, category: 's-suite', title: 'মাটি পরীক্ষা গাইড', desc: 'নমুনা সংগ্রহ ও রিপোর্ট বিশ্লেষণ', icon: '🚜', isGovt: true },
    { id: View.NUTRIENT_CALC, category: 's-suite', title: 'সার ক্যালকুলেটর', desc: 'জমির মাপ অনুযায়ী সারের মাত্রা', icon: '⚖️', isGovt: true },
    { id: View.AI_YIELD_PREDICTION, category: 'planning', title: 'এআই ফলন পূর্বাভাস', desc: 'ধাপে ধাপে ফলন ধারণা ও পরিকল্পনা', icon: '🔮', isAI: true, isPriority: true },
    { id: View.CROP_CALENDAR, category: 'planning', title: 'শস্য ক্যালেন্ডার', desc: 'ঋতুভিত্তিক চাষাবাদ পরিকল্পনা', icon: '🗓️', isAI: true },
    { id: View.TASK_SCHEDULER, category: 'planning', title: 'শস্য কর্মপরিকল্পনা', desc: 'চাষের সব কাজের শিডিউল ও রিমাইন্ডার', icon: '📅', isAI: true },
    { id: View.LEARNING_CENTER, category: 'academic', title: 'কৃষি শিখন কেন্দ্র', desc: 'কুইজ, উদ্ভিদ শনাক্তকরণ ও শিক্ষা', icon: '🎓', isAI: true },
    { id: View.PODCAST, category: 'academic', title: 'এআই পডকাস্ট', desc: 'কৃষি সংবাদের অডিও সারসংক্ষেপ', icon: '🎙️', isAI: true },
    { id: View.FLASHCARDS, category: 'academic', title: 'কৃষি ফ্ল্যাশকার্ড', desc: 'শস্য পুষ্টির মজার ফ্ল্যাশকার্ড', icon: '🎴', isAI: true },
    { id: View.MONITORING, category: 'monitoring', title: 'ফিল্ড মনিটরিং', desc: 'স্যাটেলাইট ভিত্তিক ক্ষেত পর্যবেক্ষণ', icon: '🛰️', isAI: true },
    { id: View.LEAF_COLOR_CHART, category: 'planning', title: 'লিফ কালার চার্ট', desc: 'ইউরিয়া নির্ধারণের ডিজিটাল টুল', icon: '🍃', isAI: true },
    { id: View.QR_GENERATOR, category: 'planning', title: 'QR কোড জেনারেটর', desc: 'ফসলের লেবেলিং ও ট্রেসেবিলিটি', icon: '📲' },
    { id: View.YIELD_CALCULATOR, category: 'planning', title: 'ফলন ক্যালকুলেটর', desc: 'শস্য কর্তন ও বৈজ্ঞানিক হিসাব', icon: '🌾', isGovt: true },
    { id: View.WEATHER, category: 'monitoring', title: 'আবহাওয়া ও স্প্রে', desc: 'পূর্বাভাস ও নিরাপদ স্প্রে সময়', icon: '☁️' },
    { id: View.CHAT, category: 'advisory', title: 'কৃষি চ্যাটবট', desc: 'AI বিশেষজ্ঞের সাথে সরাসরি কথা বলুন', icon: '🤖', isAI: true },
    { id: View.DEFENSE_GUIDE, category: 'advisory', title: 'প্রতিরক্ষা দুর্গ', desc: 'উদ্ভিদের সুরক্ষা স্তর ও বিজ্ঞান', icon: '🏯', isGovt: true },
    { id: View.BIOCONTROL, category: 'advisory', title: 'জৈবিক দমন', desc: 'প্রাকৃতিক উপায়ে পোকা নিয়ন্ত্রণ', icon: '🐞' },
    { id: View.SEARCH, category: 'advisory', title: 'বাজার দর', desc: 'লাইভ বাজার দর ও তথ্য খোঁজ', icon: '🔍' },
  ];

  const categories = [
    { id: 'all', label: 'সব', icon: '✨' },
    { id: 'academic', label: 'শিখন কেন্দ্র', icon: '🎓' },
    { id: 'monitoring', label: 'পর্যবেক্ষণ', icon: '🛰️' },
    { id: 'diagnosis', label: 'শনাক্তকরণ', icon: '🔍' },
    { id: 'planning', label: 'পরিকল্পনা', icon: '📋' },
    { id: 'advisory', label: 'পরামর্শ', icon: '💡' },
  ];

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'all' || tool.category === activeTab || (activeTab === 'diagnosis' && tool.category === 'p-suite');
    return matchesSearch && matchesTab;
  });

  const protectionSuite = tools.filter(t => t.category === 'p-suite' && !searchQuery);
  const soilSuite = tools.filter(t => t.category === 's-suite' && !searchQuery);

  return (
    <div className="max-w-4xl mx-auto p-4 animate-fade-in pb-20 font-sans">
      <div className="mb-10 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-gray-800 mb-2 tracking-tighter">এগ্রি-টুলস হাব</h1>
          <p className="text-gray-500 font-medium">আপনার কাজের জন্য সঠিক টুলটি বেছে নিন</p>
        </div>
        
        {/* Search Bar with Voice */}
        <div className="relative w-full md:w-80 group">
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="টুল খুঁজুন..."
            className="w-full bg-white border border-slate-200 rounded-2xl px-12 py-3.5 focus:ring-2 focus:ring-[#0A8A1F] focus:outline-none font-bold text-sm shadow-sm transition-all"
          />
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <button 
            onClick={toggleListening}
            className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-slate-50 text-slate-400 hover:text-emerald-600'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
          </button>
        </div>
      </div>

      {activeTab === 'all' && !searchQuery && (
        <div className="space-y-12 mb-12">
          <section>
            <div className="flex items-center justify-between mb-6 px-1">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 bg-rose-500 rounded-full mr-3 animate-pulse"></span>
                  সুরক্ষা ও সমাধান স্যুট
               </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {protectionSuite.map(tool => (
                 <ToolCard key={tool.id} tool={tool} onNavigate={onNavigate} isPrimary colorClass="border-emerald-100 bg-green-50/20" />
               ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between mb-6 px-1">
               <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full mr-3 animate-pulse"></span>
                  মাটি ও পুষ্টি স্যুট
               </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {soilSuite.map(tool => (
                 <ToolCard key={tool.id} tool={tool} onNavigate={onNavigate} isPrimary colorClass="border-amber-100 bg-amber-50/20" />
               ))}
            </div>
          </section>
        </div>
      )}

      <div className="flex overflow-x-auto space-x-2 mb-8 pb-2 scrollbar-hide border-b border-slate-100">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveTab(cat.id as any)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-2xl whitespace-nowrap text-sm font-black transition-all ${
              activeTab === cat.id 
              ? 'text-[#0A8A1F] border-b-4 border-[#0A8A1F] scale-105' 
              : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-16">
        {filteredTools.length > 0 ? filteredTools.map((tool) => (
          <ToolCard key={tool.id} tool={tool} onNavigate={onNavigate} />
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-4 border-dashed border-slate-100 opacity-60">
             <div className="text-6xl mb-6">🔍</div>
             <p className="font-black text-slate-400 uppercase tracking-widest">আপনার খোঁজা টুলটি পাওয়া যায়নি</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ToolCard: React.FC<{ tool: Tool, onNavigate: (view: View) => void, isPrimary?: boolean, colorClass?: string }> = ({ tool, onNavigate, isPrimary, colorClass }) => (
  <div 
    onClick={() => onNavigate(tool.id)}
    className={`group bg-white p-6 rounded-[2.5rem] border transition-all cursor-pointer flex items-center space-x-5 relative overflow-hidden ${
      isPrimary 
      ? `${colorClass} shadow-xl hover:shadow-2xl` 
      : 'border-slate-100 shadow-sm hover:shadow-xl'
    }`}
  >
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 opacity-30 group-hover:scale-150 transition-transform duration-500 ${isPrimary ? 'bg-white/40' : 'bg-slate-50'}`}></div>
    <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl shadow-inner group-hover:scale-110 transition-transform shrink-0 ${isPrimary ? 'bg-white border-2 border-slate-50' : 'bg-slate-50'}`}>
      {tool.icon}
    </div>
    <div className="flex-1 relative z-10">
      <div className="flex items-center space-x-2 mb-1">
        <h3 className="font-black text-gray-800 text-base md:text-lg group-hover:text-[#0A8A1F] transition-colors leading-tight">{tool.title}</h3>
        {tool.isAI && <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter">AI</span>}
      </div>
      <p className="text-xs text-gray-400 font-medium leading-tight line-clamp-2 mb-2">{tool.desc}</p>
      {tool.isPriority && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-tighter animate-pulse">
          Guided Start Available
        </span>
      )}
    </div>
    <div className="text-slate-200 group-hover:text-[#0A8A1F] transition-colors shrink-0">
      <svg className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
    </div>
  </div>
);

export default ToolsHub;
