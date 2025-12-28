import React, { useState, useRef, useMemo, useEffect } from 'react';
import { User, UserProgress, UserSettings, UserCrop, SavedReport } from '../types';
import { CROPS_BY_CATEGORY, CROP_CATEGORIES } from '../constants';
import { getPersonalizedAgriAdvice } from '../services/geminiService';
import { detectCurrentAEZDetails } from '../services/locationService';
import ShareDialog from './ShareDialog';
import FeedbackModal from './FeedbackModal';

interface UserProfileProps {
  user: User;
  onUpdateUser: (updates: Partial<User>) => void;
  onSaveReport?: (report: Omit<SavedReport, 'id' | 'timestamp'>) => void;
  onToggleSpeech: () => void;
  speechEnabled: boolean;
}

const DISTRICTS = [
  'Bagerhat', 'Bandarban', 'Barguna', 'Barishal', 'Bhola', 'Bogra', 'Brahmanbaria', 'Chandpur', 
  'Chapai Nawabganj', 'Chattogram', 'Chuadanga', 'Comilla', 'Cox\'s Bazar', 'Dhaka', 'Dinajpur', 
  'Faridpur', 'Feni', 'Gaibandha', 'Gazipur', 'Gopalganj', 'Habiganj', 'Jamalpur', 'Jessore', 
  'Jhalokati', 'Jhenaidah', 'Joypurhat', 'Khagrachari', 'Khulna', 'Kishoreganj', 'Kurigram', 
  'Kushtia', 'Lakshmipur', 'Lalmonirhat', 'Madaripur', 'Magura', 'Manikganj', 'Meherpur', 
  'Moulvibazar', 'Munshiganj', 'Mymensingh', 'Naogaon', 'Narail', 'Narayanganj', 'Narsingdi', 
  'Natore', 'Netrokona', 'Nilphamari', 'Noakhali', 'Pabna', 'Panchagarh', 'Patuakhali', 
  'Pirojpur', 'Rajbari', 'Rajshahi', 'Rangamati', 'Rangpur', 'Satkhira', 'Shariatpur', 
  'Sherpur', 'Sirajganj', 'Sunamganj', 'Sylhet', 'Tangail', 'Thakurgaon'
].sort();

const RANKS = [
  { level: 0, title: 'নবিশ কৃষক', xp: 0, icon: '🌱' },
  { level: 5, title: 'উন্নয়নশীল কৃষক', xp: 500, icon: '🌿' },
  { level: 10, title: 'অভিজ্ঞ কৃষক', xp: 2000, icon: '🌳' },
  { level: 20, title: 'মাস্টার এগ্রোনোমিস্ট', xp: 10000, icon: '🎓' },
];

const SKILL_ROADMAP = [
  { id: 'soil_health', title: 'মৃত্তিকা স্বাস্থ্য', icon: '🏺', category: 'soil', xpRequired: 100 },
  { id: 'pest_id', title: 'বালাই শনাক্তকরণ', icon: '🔍', category: 'protection', xpRequired: 200 },
  { id: 'nutrient_mgmt', title: 'পুষ্টি ব্যবস্থাপনা', icon: '⚖️', category: 'soil', xpRequired: 500 },
  { id: 'smart_irrigation', title: 'স্মার্ট সেচ', icon: '💧', category: 'technology', xpRequired: 800 },
  { id: 'pesticide_safety', title: 'নিরাপদ বালাইনাশক', icon: '🧪', category: 'protection', xpRequired: 1200 },
  { id: 'yield_predict', title: 'ফলন পূর্বাভাস', icon: '🔮', category: 'technology', xpRequired: 2000 },
];

const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdateUser, onSaveReport, onToggleSpeech, speechEnabled }) => {
  const { progress, myCrops = [], savedReports = [], preferredCategories = [] } = user;
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'skills' | 'saved' | 'settings'>('overview');
  const [selectedCategory, setSelectedCategory] = useState('cereals');
  
  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [newCropName, setNewCropName] = useState('');
  const [newCropVariety, setNewCropVariety] = useState('');
  const [newCropDate, setNewCropDate] = useState(new Date().toISOString().split('T')[0]);
  const [newCropLocation, setNewCropLocation] = useState(user.farmLocation ? `${user.farmLocation.upazila}, ${user.farmLocation.district}` : '');
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);

  const [advice, setAdvice] = useState<string | null>(null);
  const [isAdviceLoading, setIsAdviceLoading] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [isListeningField, setIsListeningField] = useState<string | null>(null);
  
  const [nameInput, setNameInput] = useState(user.displayName || '');
  const [mobileInput, setMobileInput] = useState(user.mobile || '');
  const [districtInput, setDistrictInput] = useState(user.farmLocation?.district || '');
  const [upazilaInput, setUpazilaInput] = useState(user.farmLocation?.upazila || '');
  const [hasChanges, setHasChanges] = useState(false);

  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'bn-BD';
      recognitionRef.current.onstart = () => {};
      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (isListeningField === 'name') setNameInput(prev => prev + ' ' + transcript);
        if (isListeningField === 'upazila') setUpazilaInput(prev => prev + ' ' + transcript);
        if (isListeningField === 'cropVariety') setNewCropVariety(prev => prev + ' ' + transcript);
        if (isListeningField === 'cropLocation') setNewCropLocation(prev => prev + ' ' + transcript);
        setHasChanges(true);
      };
      recognitionRef.current.onerror = () => setIsListeningField(null);
      recognitionRef.current.onend = () => setIsListeningField(null);
    }
  }, [isListeningField]);

  const toggleListening = (field: string) => {
    if (!recognitionRef.current) return alert("ভয়েস ইনপুট সমর্থিত নয়।");
    if (isListeningField === field) recognitionRef.current.stop();
    else { setIsListeningField(field); recognitionRef.current.start(); }
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => onUpdateUser({ photoURL: reader.result as string });
      reader.readAsDataURL(file);
    }
  };

  const handleGetAdvice = async () => {
    if (myCrops.length === 0) return;
    setIsAdviceLoading(true);
    try {
      const res = await getPersonalizedAgriAdvice(myCrops, progress.rank || 'নবিশ কৃষক', preferredCategories);
      setAdvice(res);
    } catch (e) {
      setAdvice("পরামর্শ তৈরি করা সম্ভব হয়নি।");
    } finally {
      setIsAdviceLoading(false);
    }
  };

  const handleSaveAdvice = () => {
    if (advice && onSaveReport) {
      onSaveReport({
        type: 'Personalized Advisory',
        title: 'আমার ব্যক্তিগত পরামর্শ',
        content: advice,
        icon: '💡'
      });
    }
  };

  const togglePreferredCategory = (catId: string) => {
    const newPrefs = preferredCategories.includes(catId)
      ? preferredCategories.filter(id => id !== catId)
      : [...preferredCategories, catId];
    onUpdateUser({ preferredCategories: newPrefs });
    setHasChanges(true);
  };

  const handleAddCrop = () => {
    if (!newCropName) return alert('অনুগ্রহ করে ফসল নির্বাচন করুন।');
    const newCrop: UserCrop = {
      id: Math.random().toString(36).substr(2, 9),
      name: newCropName,
      variety: newCropVariety || 'অজানা (Unknown)',
      sowingDate: newCropDate,
      location: newCropLocation || 'অজানা (Unknown)'
    };
    onUpdateUser({ myCrops: [...myCrops, newCrop] });
    setShowAddCropModal(false);
    setNewCropName('');
    setNewCropVariety('');
    setNewCropDate(new Date().toISOString().split('T')[0]);
  };

  const detectCropLocation = async () => {
    setIsDetectingLocation(true);
    try {
      const aez = await detectCurrentAEZDetails(true);
      setNewCropLocation(`${aez.name} (AEZ ${aez.id})`);
    } catch (err) { alert('লোকেশন পাওয়া যায়নি।'); } finally { setIsDetectingLocation(false); }
  };

  const rankProgress = useMemo(() => {
    const currentRank = RANKS.find(r => r.title === progress.rank) || RANKS[0];
    const currentIndex = RANKS.indexOf(currentRank);
    const nextRank = RANKS[currentIndex + 1];
    if (!nextRank) return { percent: 100, remaining: 0, nextTitle: 'সর্বোচ্চ স্তর' };
    const range = nextRank.xp - currentRank.xp;
    const currentXPInRange = progress.xp - currentRank.xp;
    const percent = Math.min(100, Math.max(0, (currentXPInRange / range) * 100));
    return { percent, remaining: nextRank.xp - progress.xp, nextTitle: nextRank.title };
  }, [progress.xp, progress.rank]);

  const handleSaveAccount = () => {
    onUpdateUser({
      displayName: nameInput,
      mobile: mobileInput,
      farmLocation: { district: districtInput, upazila: upazilaInput },
      settings: { ...user.settings, theme: userSettings.theme } as UserSettings
    });
    setHasChanges(false);
    alert('সেটিংস সফলভাবে সংরক্ষিত হয়েছে!');
  };

  const toggleTheme = () => {
    const currentSettings = user.settings || { theme: 'light', notifications: { weather: true, market: true, cropHealth: true } };
    onUpdateUser({ settings: { ...currentSettings, theme: currentSettings.theme === 'light' ? 'dark' : 'light' } as UserSettings });
  };

  const userSettings = user.settings || { theme: 'light', notifications: { weather: true, market: true, cropHealth: true } };

  return (
    <div className={`max-w-7xl mx-auto p-4 pb-32 animate-fade-in font-sans transition-colors duration-500 ${userSettings.theme === 'dark' ? 'dark' : ''}`}>
      {isShareOpen && <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="ব্যক্তিগত কৃষি প্রোফাইল" content={advice || ""} />}
      <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} userRank={progress.rank} />
      
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
        <div className="flex items-center space-x-4">
          <button onClick={() => window.history.back()} className="p-3 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-90 text-slate-400">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          </button>
          <div>
            <h1 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter">অ্যাগ্রোনোমিস্ট ড্যাশবোর্ড</h1>
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">Smart Farming Career Track</p>
          </div>
        </div>
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="bg-emerald-50 dark:bg-emerald-900/30 px-4 py-2 rounded-2xl border border-emerald-100 dark:border-emerald-800 flex items-center space-x-2">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">{progress.streak} দিন স্ট্রিক</span>
          </div>
          <button onClick={() => setIsFeedbackOpen(true)} className="flex-1 md:flex-none bg-slate-900 dark:bg-emerald-600 text-white px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">ফিডব্যাক</button>
        </div>
      </div>

      <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] mb-8 max-w-lg overflow-x-auto scrollbar-hide">
        <button onClick={() => setActiveSubTab('overview')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeSubTab === 'overview' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-400'}`}>প্রোফাইল</button>
        <button onClick={() => setActiveSubTab('skills')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeSubTab === 'skills' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-400'}`}>দক্ষতা</button>
        <button onClick={() => setActiveSubTab('saved')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeSubTab === 'saved' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-400'}`}>রিপোর্টসমূহ</button>
        <button onClick={() => setActiveSubTab('settings')} className={`flex-1 min-w-[100px] py-3 text-[10px] font-black uppercase tracking-widest rounded-[1.5rem] transition-all ${activeSubTab === 'settings' ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-md' : 'text-slate-400'}`}>সেটিংস</button>
      </div>

      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-fade-in">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-[3.5rem] p-10 shadow-2xl border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-[#0A8A1F] to-emerald-400 opacity-10"></div>
              <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
              <div className="relative mt-8 mb-6 group">
                <div className="w-40 h-40 rounded-[3.5rem] border-[10px] border-white dark:border-slate-800 shadow-2xl overflow-hidden relative transition-transform duration-500 group-hover:scale-105">
                  <img src={user.photoURL || ''} className="w-full h-full object-cover bg-slate-50 dark:bg-slate-900" alt="Profile" />
                  <button onClick={handleAvatarClick} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                    <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
                    <span className="font-black text-[9px] uppercase tracking-widest">ছবি পরিবর্তন</span>
                  </button>
                </div>
                <div className="absolute -bottom-2 -right-2 bg-yellow-400 text-slate-900 w-14 h-14 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-2xl border-4 border-white dark:border-slate-800 animate-pulse">
                  {RANKS.find(r => r.title === progress.rank)?.icon || '🌱'}
                </div>
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter">{user.displayName || 'কৃষক বন্ধু'}</h2>
                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mt-2">{progress.rank || 'নবিশ কৃষক'} • লেভেল {progress.level}</p>
              </div>
              <div className="w-full mt-10 space-y-3">
                <div className="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                  <span className="text-emerald-600 dark:text-emerald-400">বর্তমান প্রগতি</span>
                  <span className="text-slate-400 dark:text-slate-500">পরবর্তী: {rankProgress.nextTitle}</span>
                </div>
                <div className="h-4 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden p-1 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 shadow-sm relative" style={{ width: `${rankProgress.percent}%` }}></div>
                </div>
              </div>
            </div>
            <div className="bg-slate-900 dark:bg-slate-950 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden">
               <h3 className="text-lg font-black mb-6 flex items-center tracking-tight"><span className="mr-3">🏅</span> অর্জন ও ব্যাজসমূহ</h3>
               <div className="grid grid-cols-2 gap-4">
                  {[
                    { id: 'soil_1', title: 'মৃত্তিকা মিত্র', icon: '🏺', unlocked: progress.skills.soil > 100, desc: '১০০+ XP ইন সয়েল সায়েন্স' },
                    { id: 'pest_1', title: 'বালাই নাশক', icon: '🛡️', unlocked: progress.skills.protection > 100, desc: '১০০+ XP ইন শস্য সুরক্ষা' },
                    { id: 'tech_1', title: 'স্মার্ট অ্যাগ্রো', icon: '🛰️', unlocked: progress.skills.technology > 100, desc: '১০০+ XP ইন এগ্রি-টেক' },
                    { id: 'streak_1', title: 'অদম্য কৃষক', icon: '🔥', unlocked: progress.streak >= 7, desc: '৭ দিনের ধারাবাহিকতা' },
                  ].map(ach => (
                    <div key={ach.id} className={`p-4 rounded-2xl border-2 transition-all group ${ach.unlocked ? 'bg-white/10 border-emerald-500/50' : 'bg-white/5 border-white/5 opacity-40 grayscale'}`}>
                      <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{ach.icon}</div>
                      <p className="text-[10px] font-black uppercase tracking-tight leading-tight">{ach.title}</p>
                      <p className="text-[7px] text-slate-500 font-medium mt-1">{ach.desc}</p>
                    </div>
                  ))}
               </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-8 md:p-10 shadow-xl border border-slate-100 dark:border-slate-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
                 <div>
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">আমার চাষকৃত শস্য</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Currently Growing Crops</p>
                 </div>
                 <button onClick={() => setShowAddCropModal(true)} className="bg-[#0A8A1F] text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    <span>নতুন শস্য যোগ করুন</span>
                 </button>
              </div>
              {myCrops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
                  {myCrops.map(c => {
                    const age = Math.floor((Date.now() - new Date(c.sowingDate).getTime()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={c.id} className="group relative bg-emerald-50 dark:bg-emerald-900/20 text-[#0A8A1F] dark:text-emerald-400 p-6 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-800 flex items-start gap-4 shadow-sm hover:shadow-xl hover:bg-white dark:hover:bg-slate-700 transition-all">
                        <div className="w-14 h-14 bg-white dark:bg-slate-800 rounded-2xl flex items-center justify-center text-3xl shadow-sm transform group-hover:rotate-6 transition-transform">🌾</div>
                        <div className="flex-1">
                           <h4 className="font-black text-lg text-slate-800 dark:text-white leading-none mb-1">{c.name}</h4>
                           <p className="text-[10px] font-black uppercase text-emerald-600 mb-3">{c.variety}</p>
                           <p className="text-[9px] font-bold text-slate-400 uppercase">বয়স: {age} দিন</p>
                        </div>
                        <button onClick={() => onUpdateUser({ myCrops: myCrops.filter(item => item.id !== c.id) })} className="absolute -top-2 -right-2 w-8 h-8 bg-white dark:bg-slate-800 text-rose-500 rounded-full shadow-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-50 border border-rose-100">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800 mb-10 flex flex-col items-center opacity-60">
                  <div className="text-6xl mb-6 grayscale">🚜</div>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-widest">এখনো কোনো চাষকৃত শস্য যোগ করা হয়নি</p>
                </div>
              )}
              <div className={`rounded-[3.5rem] p-10 relative overflow-hidden transition-all duration-1000 ${advice ? 'bg-slate-900 text-white shadow-2xl border-t-[16px] border-emerald-500' : 'bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-700'}`}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 relative z-10 gap-6">
                   <div>
                     <h4 className={`text-2xl font-black ${advice ? 'text-emerald-400' : 'text-slate-800 dark:text-white'}`}>ব্যক্তিগত কৃষি পরামর্শ কেন্দ্র</h4>
                     <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">AI-Powered Farmer Intelligence</p>
                   </div>
                   <div className="flex items-center space-x-3 w-full md:w-auto">
                     <button onClick={handleGetAdvice} disabled={isAdviceLoading || myCrops.length === 0} className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-xl disabled:opacity-30 ${advice ? 'bg-white text-slate-900 hover:bg-emerald-50' : 'bg-[#0A8A1F] text-white'}`}>
                       {isAdviceLoading ? (<div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>) : advice ? 'নতুন পরামর্শ নিন' : 'পরামর্শ জেনারেট করুন'}
                     </button>
                     {advice && (
                       <button onClick={handleSaveAdvice} className="p-4 rounded-full bg-emerald-600 text-white shadow-xl hover:bg-emerald-700 transition-all active:scale-90" title="সেভ করুন">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 5h14m-14 0v14l7-7 7 7V5m-14 0h14" /></svg>
                       </button>
                     )}
                   </div>
                </div>
                <div className="relative z-10">
                  {advice && <div className="text-xl font-medium leading-relaxed whitespace-pre-wrap text-slate-200 prose prose-invert max-w-none">{advice}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-700">
             <div className="mb-8"><h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none">অ্যাকাউন্ট সেটিংস</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Manage your identification and location</p></div>
             <div className="flex flex-col md:flex-row gap-10 items-start mb-10">
                <div className="relative group shrink-0"><div className="w-32 h-32 rounded-[2.5rem] border-4 border-emerald-500 overflow-hidden relative shadow-xl"><img src={user.photoURL || ''} className="w-full h-full object-cover" alt="Avatar" /><button onClick={handleAvatarClick} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-black uppercase tracking-widest">বদলান</button></div><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" /></div>
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">আপনার নাম</label><div className="relative"><input type="text" value={nameInput} onChange={(e) => { setNameInput(e.target.value); setHasChanges(true); }} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl py-4 px-6 pr-12 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-all shadow-inner" /><button onClick={() => toggleListening('name')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListeningField === 'name' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-300 hover:text-emerald-500'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">মোবাইল</label><input type="tel" value={mobileInput} onChange={(e) => { setMobileInput(e.target.value); setHasChanges(true); }} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl py-4 px-6 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-all shadow-inner" /></div>
                </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">জেলা</label><select value={districtInput} onChange={(e) => { setDistrictInput(e.target.value); setHasChanges(true); }} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl py-4 px-6 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-all shadow-inner">{DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                <div className="space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">উপজেলা</label><div className="relative"><input type="text" value={upazilaInput} onChange={(e) => { setUpazilaInput(e.target.value); setHasChanges(true); }} className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-700 rounded-3xl py-4 px-6 pr-12 font-bold text-slate-700 dark:text-white outline-none focus:border-emerald-500 transition-all shadow-inner" /><button onClick={() => toggleListening('upazila')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListeningField === 'upazila' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-300 hover:text-emerald-500'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div></div>
             </div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-700">
             <div className="mb-8"><h3 className="text-xl font-black text-slate-800 dark:text-white tracking-tight leading-none">শস্য পছন্দ (Crop Interests)</h3><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">এআই সুপারিশ কাস্টমাইজ করতে আপনার প্রিয় শস্যসমূহ বেছে নিন</p></div>
             <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">{CROP_CATEGORIES.map(cat => <button key={cat.id} onClick={() => togglePreferredCategory(cat.id)} className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center text-center space-y-2 ${preferredCategories.includes(cat.id) ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 shadow-md scale-105' : 'border-slate-50 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-400'}`}><span className="text-2xl">{cat.icon}</span><span className="text-[9px] font-black uppercase leading-tight">{cat.label}</span></button>)}</div>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-10 shadow-xl border border-slate-100 dark:border-slate-700 space-y-6">
             <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                <div className="flex items-center space-x-4"><div className="text-2xl">{userSettings.theme === 'light' ? '☀️' : '🌙'}</div><div><h4 className="font-black text-slate-800 dark:text-white leading-none mb-1">ডার্ক মোড</h4></div></div>
                <button onClick={toggleTheme} className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${userSettings.theme === 'dark' ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${userSettings.theme === 'dark' ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
             </div>
             <div className="flex items-center justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border border-slate-100 dark:border-slate-700">
                <div className="flex items-center space-x-4"><div className="text-2xl">🔊</div><div><h4 className="font-black text-slate-800 dark:text-white leading-none mb-1">স্বয়ংক্রিয়ভাবে পড়ে শোনানো (Read Aloud)</h4></div></div>
                <button onClick={onToggleSpeech} className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${speechEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}><div className={`w-6 h-6 bg-white rounded-full shadow-md transform transition-transform duration-300 ${speechEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div></button>
             </div>
             {hasChanges && <button onClick={handleSaveAccount} className="mt-8 bg-slate-900 dark:bg-emerald-600 text-white px-10 py-5 rounded-[2rem] font-black text-sm shadow-2xl transition-all w-full md:w-auto">সকল পরিবর্তন সংরক্ষণ করুন</button>}
          </div>
        </div>
      )}

      {activeSubTab === 'saved' && (
        <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
          <div className="flex items-center space-x-3 px-4 mb-4"><div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-xl shadow-inner">💾</div><h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">সেভ করা রিপোর্টসমূহ</h3></div>
          {savedReports.length > 0 ? (
            <div className="space-y-4">{savedReports.map((report) => (
                <div key={report.id} className="bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl overflow-hidden group"><div className="p-8 cursor-pointer flex items-center justify-between" onClick={() => setExpandedReportId(expandedReportId === report.id ? null : report.id)}><div className="flex items-center space-x-5"><div className="w-14 h-14 bg-slate-50 dark:bg-slate-700 rounded-2xl flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">{report.icon || '📜'}</div><div><p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">{report.type}</p><h4 className="text-xl font-black text-slate-800 dark:text-white leading-tight">{report.title}</h4><p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{new Date(report.timestamp).toLocaleDateString('bn-BD')} • {new Date(report.timestamp).toLocaleTimeString('bn-BD')}</p></div></div><div className={`p-3 bg-slate-50 dark:bg-slate-700 rounded-full transition-all ${expandedReportId === report.id ? 'rotate-180 bg-emerald-50 text-emerald-600' : 'text-slate-300'}`}><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg></div></div>{expandedReportId === report.id && (<div className="p-8 pt-0 animate-fade-in"><div className="border-t border-slate-50 dark:border-slate-700 pt-8 mt-4"><div className="prose dark:prose-invert prose-slate max-w-none font-medium leading-relaxed text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{report.content}</div><div className="flex justify-end mt-8 pt-6 border-t border-slate-50 dark:border-slate-700 space-x-3"><button onClick={() => onUpdateUser({ savedReports: savedReports.filter(r => r.id !== report.id) })} className="px-6 py-3 bg-rose-50 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all">মুছে ফেলুন</button><button onClick={() => { setIsShareOpen(true); }} className="px-6 py-3 bg-[#0A8A1F] text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:bg-green-700 transition-all">শেয়ার করুন</button></div></div></div>)}</div>
              ))}</div>
          ) : (
            <div className="text-center py-32 bg-white dark:bg-slate-800 rounded-[3.5rem] border-4 border-dashed border-slate-100 dark:border-slate-700 flex flex-col items-center opacity-60"><div className="text-7xl mb-6 grayscale">📓</div><h3 className="text-xl font-black text-slate-400">এখনো কোনো রিপোর্ট সেভ করা হয়নি</h3><p className="text-sm font-medium text-slate-500 mt-2">বিশ্লেষণ শেষে 'সেভ করুন' বাটন টিপুন</p></div>
          )}
        </div>
      )}

      {showAddCropModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in font-sans"><div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col relative border border-slate-100"><div className="bg-emerald-600 p-8 text-white flex justify-between items-center"><h3 className="text-2xl font-black tracking-tight">নতুন শস্য প্রোফাইল</h3><button onClick={() => setShowAddCropModal(false)} className="p-2 bg-white/10 rounded-xl hover:bg-white/20">✕</button></div><div className="p-8 space-y-6"><select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner">{CROP_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.label}</option>)}</select><select value={newCropName} onChange={(e) => setNewCropName(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner"><option value="">শস্য নির্বাচন করুন</option>{(CROPS_BY_CATEGORY[selectedCategory] || []).map(c => <option key={c} value={c}>{c}</option>)}</select><div className="relative"><input type="text" value={newCropVariety} onChange={(e) => setNewCropVariety(e.target.value)} placeholder="জাত" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-12 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner" /><button onClick={() => toggleListening('cropVariety')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListeningField === 'cropVariety' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-300 hover:text-emerald-500'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div><div className="flex flex-col space-y-2"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">রোপণ/বপনের তারিখ</label><input type="date" value={newCropDate} onChange={(e) => setNewCropDate(e.target.value)} className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner" /></div><div className="flex gap-2"><div className="flex-1 relative"><input type="text" value={newCropLocation} onChange={(e) => setNewCropLocation(e.target.value)} placeholder="অবস্থান (যেমন: সাভার)" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 pr-12 font-bold text-slate-700 outline-none focus:border-emerald-500 transition-all shadow-inner" /><button onClick={() => toggleListening('cropLocation')} className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-xl transition-all ${isListeningField === 'cropLocation' ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-slate-300 hover:text-emerald-500'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg></button></div><button onClick={detectCropLocation} disabled={isDetectingLocation} className="bg-emerald-100 text-emerald-600 p-4 rounded-2xl border-2 border-emerald-200 transition-all active:scale-95">{isDetectingLocation ? '...' : '📍'}</button></div><button onClick={handleAddCrop} className="w-full bg-emerald-600 text-white font-black py-5 rounded-3xl shadow-xl active:scale-95 transition-all text-lg">শস্য প্রোফাইলে যোগ করুন</button></div></div></div>
      )}
    </div>
  );
};

export default UserProfile;