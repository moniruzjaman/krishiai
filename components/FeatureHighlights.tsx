
import React from 'react';
import { View } from '../types';

interface FeatureHighlightsProps {
  onNavigate: (view: View) => void;
}

export const FeatureHighlights: React.FC<FeatureHighlightsProps> = ({ onNavigate }) => {
  const highlights = [
    {
      id: View.ANALYZER,
      title: "এআই স্ক্যানার",
      desc: "পাতার ছবি তুলেই রোগের নাম ও সরকারি সমাধান জানুন।",
      icon: "📸",
      color: "bg-emerald-600",
      tag: "AI Diagnosis",
      standard: "CABI & BARI"
    },
    {
      id: View.PEST_EXPERT,
      title: "রোগ ও বালাইনাশক বিশেষজ্ঞ",
      desc: "নিরাপদ মিক্সিং এবং MoA Groups রোটেশন গাইড।",
      icon: "🧪",
      color: "bg-rose-600",
      tag: "Pesticide Expert",
      standard: "DAE Verified"
    },
    {
      id: View.CHAT,
      title: "এআই চ্যাটবট",
      desc: "যেকোনো কৃষি জিজ্ঞাসায় ২৪/৭ বিশেষজ্ঞ সহায়তা।",
      icon: "🤖",
      color: "bg-slate-900",
      tag: "Dedicated Support",
      standard: "Multi-Source"
    },
    {
      id: View.MONITORING,
      title: "স্যাটেলাইট রিপোর্ট",
      desc: "মহাকাশ থেকে ক্ষেতের স্বাস্থ্য ও NDVI পর্যবেক্ষণ।",
      icon: "🛰️",
      color: "bg-blue-600",
      tag: "Satellite Analysis",
      standard: "BAMIS Data"
    },
    {
      id: View.LEAF_COLOR_CHART,
      title: "লিফ কালার চার্ট",
      desc: "ডিজিটাল এলসিসি দিয়ে ইউরিয়ার সঠিক মাত্রা নির্ণয়।",
      icon: "🍃",
      color: "bg-green-500",
      tag: "N-Management",
      standard: "BRRI Protocol"
    },
    {
      id: View.AI_YIELD_PREDICTION,
      title: "ফলন পূর্বাভাস",
      desc: "আবহাওয়া ও মাটির তথ্যে আগাম ফলন ধারণা।",
      icon: "🔮",
      color: "bg-amber-600",
      tag: "Yield Prediction",
      standard: "BARC Models"
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 py-16 space-y-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center space-x-2 bg-emerald-50 px-4 py-1 rounded-full border border-emerald-100">
           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
           <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest">Smart Core Technologies</span>
        </div>
        <h2 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">আমাদের বিশেষ প্রযুক্তি</h2>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto leading-relaxed">
          বাংলাদেশ সরকারের (BARC/BRRI/BARI) সর্বশেষ গবেষণা তথ্যের ওপর ভিত্তি করে তৈরি সমন্বিত এআই ইকোসিস্টেম।
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {highlights.map((item, idx) => (
          <div 
            key={idx}
            onClick={() => onNavigate(item.id)}
            className="group bg-white rounded-[3rem] p-8 shadow-xl border border-slate-50 overflow-hidden relative transition-all hover:-translate-y-2 hover:shadow-2xl cursor-pointer"
          >
            {/* Background Decorative */}
            <div className={`absolute top-0 right-0 w-32 h-32 ${item.color} opacity-5 rounded-full -mr-16 -mt-16 transition-transform duration-700 group-hover:scale-150`}></div>
            
            <div className="relative z-10 flex flex-col h-full">
              <div className="flex justify-between items-start mb-8">
                 <div className={`w-14 h-14 ${item.color} text-white rounded-2xl flex items-center justify-center text-3xl shadow-lg group-hover:scale-110 group-hover:rotate-6 transition-all duration-500`}>
                   {item.icon}
                 </div>
                 <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">
                    <p className="text-[7px] font-black text-slate-400 uppercase leading-none mb-1">Standard</p>
                    <p className="text-[9px] font-black text-slate-700 uppercase tracking-tighter">{item.standard}</p>
                 </div>
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                   <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.tag}</span>
                   <div className="w-1 h-1 rounded-full bg-slate-300"></div>
                   <span className="text-[8px] font-bold text-emerald-600 uppercase">Live Now</span>
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-4 group-hover:text-emerald-600 transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  {item.desc}
                </p>
              </div>

              <div className="mt-8 flex items-center text-slate-800 font-black text-[10px] uppercase tracking-widest group-hover:text-emerald-600">
                <span>টুলটি ব্যবহার করুন</span>
                <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-2 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
