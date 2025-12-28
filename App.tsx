import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from 'react';
import { View, User, SavedReport } from './types';

// Component Imports
import { Hero } from './components/Hero';
import Analyzer from './components/Analyzer';
import ChatBot from './components/ChatBot';
import SearchTool from './components/SearchTool';
import Weather from './components/Weather';
import NutrientCalculator from './components/NutrientCalculator';
import BiocontrolGuide from './components/BiocontrolGuide';
import SoilGuide from './components/SoilGuide';
import PlantDefenseGuide from './components/PlantDefenseGuide';
import PesticideExpert from './components/PesticideExpert';
import SoilExpert from './components/SoilExpert';
import YieldCalculator from './components/YieldCalculator';
import AIYieldPredictor from './components/AIYieldPredictor';
import CropDiseaseLibrary from './components/CropDiseaseLibrary';
import QRGenerator from './components/QRGenerator';
import FieldMonitoring from './components/FieldMonitoring';
import LeafColorChart from './components/LeafColorChart';
import LearningCenter from './components/LearningCenter';
import AgriPodcast from './components/AgriPodcast';
import UserProfile from './components/UserProfile';
import About from './components/About';
import FlashcardView from './components/FlashcardView';
import TaskScheduler from './components/TaskScheduler';
import FAQ from './components/FAQ';
import CropCalendar from './components/CropCalendar';
import ToolsHub from './components/ToolsHub';
import { WeatherHorizontal } from './components/WeatherHorizontal';
import { MarketPriceHorizontal } from './components/MarketPriceHorizontal';
import { Logo } from './components/Logo';
import ShareDialog from './components/ShareDialog';
import GuidedTour, { TourStep } from './components/GuidedTour';
import FeedbackModal from './components/FeedbackModal';
import { NewsTicker, FeaturedCourses, MissionSection, ContactFooter, StatsSection } from './components/HomeSections';
import { GoogleAdBanner } from './components/GoogleAdBanner';
import { FeatureHighlights } from './components/FeatureHighlights';
import { getHomeQuickTip, generateSpeech, decodeBase64, decodeAudioData } from './services/geminiService';

// Speech Context for Seamless Read Aloud
interface SpeechContextType {
  isSpeaking: boolean;
  playSpeech: (text: string) => Promise<void>;
  stopSpeech: () => void;
  speechEnabled: boolean;
  toggleSpeechEnabled: () => void;
}

const SpeechContext = createContext<SpeechContextType | undefined>(undefined);

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) throw new Error('useSpeech must be used within a SpeechProvider');
  return context;
};

const initialUser: User = {
  uid: 'guest_user',
  email: null,
  displayName: 'কৃষক বন্ধু',
  photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AgriTech',
  progress: {
    xp: 0,
    level: 1,
    rank: 'নবিশ কৃষক',
    streak: 1,
    lastActive: Date.now(),
    badges: [],
    masteredTopics: [],
    skills: { soil: 0, protection: 0, technology: 0 }
  },
  myCrops: [],
  savedReports: [],
  settings: {
    theme: 'light',
    notifications: { weather: true, market: true, cropHealth: true }
  }
};

const MAIN_TOUR_STEPS: TourStep[] = [
  {
    title: "স্বাগতম Krishi AI-তে!",
    content: "বাংলাদেশের কৃষকদের জন্য তৈরি এই আধুনিক এআই প্ল্যাটফর্মে আপনাকে স্বাগতম। চলুন মূল ফিচারগুলো দেখে নিই।",
    position: 'center'
  },
  {
    targetId: "hero-scanner-btn",
    title: "স্মার্ট এআই স্ক্যানার",
    content: "গাছের পাতার একটি ছবি তুলেই কয়েক সেকেন্ডে রোগের নাম এবং সরকারি (BARC) অনুমোদিত সমাধান জানুন।",
    position: 'bottom'
  },
  {
    targetId: "weather-horizontal-widget",
    title: "লাইভ কৃষি-আবহাওয়া",
    content: "আপনার এলাকার জন্য সঠিক আবহাওয়া এবং বালাইনাশক স্প্রে করার আদর্শ সময় এখান থেকে দেখে নিন।",
    position: 'bottom'
  }
];

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.HOME);
  const [user, setUser] = useState<User>(initialUser);
  const [showTour, setShowTour] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [dailyTip, setDailyTip] = useState<string>("");
  const [isTipLoading, setIsTipLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(true);

  const audioContextRef = useRef<AudioContext | null>(null);
  const currentSourceRef = useRef<AudioBufferSourceNode | null>(null);

  const stopSpeech = useCallback(() => {
    if (currentSourceRef.current) {
      currentSourceRef.current.stop();
      currentSourceRef.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const playSpeech = useCallback(async (text: string) => {
    if (!text) return;
    try {
      stopSpeech();
      setIsSpeaking(true);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') await ctx.resume();
      
      const cleanText = text.replace(/[*#_~]/g, '');
      const base64Audio = await generateSpeech(cleanText);
      const audioData = decodeBase64(base64Audio);
      const audioBuffer = await decodeAudioData(audioData, ctx, 24000, 1);
      
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.onended = () => setIsSpeaking(false);
      currentSourceRef.current = source;
      source.start(0);
    } catch (error) {
      console.debug("Speech Playback Error", error);
      setIsSpeaking(false);
    }
  }, [stopSpeech]);

  const toggleSpeechEnabled = () => setSpeechEnabled(prev => !prev);

  useEffect(() => {
    const saved = localStorage.getItem('agritech_user_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        if (parsed.settings?.speechEnabled !== undefined) {
          setSpeechEnabled(parsed.settings.speechEnabled);
        }
      } catch (e) {
        console.error("Failed to load user data", e);
      }
    }

    const tourCompleted = localStorage.getItem('agritech_tour_main');
    if (!tourCompleted) setShowTour(true);

    const handleBeforeInstall = (e: any) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    const handleNavigate = (e: any) => setCurrentView(e.detail);
    window.addEventListener('agritech_navigate', handleNavigate);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('agritech_navigate', handleNavigate);
    };
  }, []);

  useEffect(() => {
    const userToSave = { ...user, settings: { ...user.settings, speechEnabled } };
    localStorage.setItem('agritech_user_data', JSON.stringify(userToSave));
    
    const fetchQuickTip = async () => {
      if (user.myCrops.length > 0 && currentView === View.HOME) {
        setIsTipLoading(true);
        try {
          const tip = await getHomeQuickTip(user.myCrops);
          setDailyTip(tip);
          // Only read aloud home tip automatically if speech is enabled
          if (speechEnabled) playSpeech(tip);
        } catch (e) {
          setDailyTip(`আপনার ${user.myCrops[0]?.name || 'শস্যের'} যত্ন নিন। নিয়মিত পর্যবেক্ষণ রোগবালাই দমনে সহায়ক।`);
        } finally {
          setIsTipLoading(false);
        }
      }
    };
    fetchQuickTip();
  }, [user.myCrops.length, currentView, speechEnabled]);

  const handleAction = (xp: number = 10) => {
    setUser(prev => {
      const newXp = prev.progress.xp + xp;
      let rank = prev.progress.rank;
      if (newXp > 10000) rank = 'মাস্টার এগ্রোনোমিস্ট';
      else if (newXp > 2000) rank = 'অভিজ্ঞ কৃষক';
      else if (newXp > 500) rank = 'উন্নয়নশীল কৃষক';
      return { ...prev, progress: { ...prev.progress, xp: newXp, level: Math.floor(newXp / 100) + 1, rank } };
    });
  };

  const handleSaveReport = (report: Omit<SavedReport, 'id' | 'timestamp'>) => {
    const newReport: SavedReport = { ...report, id: Date.now().toString(), timestamp: Date.now() };
    setUser(prev => ({ ...prev, savedReports: [newReport, ...prev.savedReports] }));
    handleAction(20);
  };

  const showFeedback = () => setTimeout(() => setIsFeedbackOpen(true), 500);
  const updateUser = (updates: Partial<User>) => setUser(prev => ({ ...prev, ...updates }));

  const handleInstallApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      if (outcome === 'accepted') { setInstallPrompt(null); setIsShareOpen(false); }
    }
  };

  const handleBack = () => {
    stopSpeech();
    const toolsViews = [
      View.CHAT, View.SEARCH, View.ANALYZER, View.WEATHER, View.NUTRIENT_CALC,
      View.BIOCONTROL, View.SOIL_GUIDE, View.DEFENSE_GUIDE, View.PEST_EXPERT,
      View.SOIL_EXPERT, View.YIELD_CALCULATOR, View.AI_YIELD_PREDICTION,
      View.CROP_DISEASE_LIBRARY, View.QR_GENERATOR, View.MONITORING,
      View.LEAF_COLOR_CHART, View.LEARNING_CENTER, View.PODCAST, View.FAQ,
      View.CROP_CALENDAR, View.TASK_SCHEDULER
    ];
    if (currentView === View.TOOLS) setCurrentView(View.HOME);
    else if (toolsViews.includes(currentView)) setCurrentView(View.TOOLS);
    else setCurrentView(View.HOME);
  };

  const renderView = () => {
    switch (currentView) {
      case View.HOME:
        return (
          <div className="space-y-0 overflow-x-hidden bg-slate-50 min-h-screen">
            <Hero onNavigate={setCurrentView} />
            <NewsTicker />
            <div className="max-w-7xl mx-auto px-4 -mt-16 relative z-40">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard label="আপনার XP" val={user.progress.xp} icon="🏆" color="text-yellow-600" />
                <StatCard label="লেভেল" val={user.progress.level} icon="⭐" color="text-blue-600" />
                <StatCard label="শস্য" val={user.myCrops.length} icon="🌾" color="text-emerald-600" />
                <StatCard label="রিপোর্ট" val={user.savedReports.length} icon="📜" color="text-indigo-600" />
              </div>
            </div>
            <WeatherHorizontal />
            <div className="max-w-7xl mx-auto px-4 py-12">
               <MarketPriceHorizontal onNavigate={setCurrentView} />
            </div>
            {user.myCrops.length > 0 && (
              <div className="max-w-7xl mx-auto px-4 mb-12 animate-fade-in">
                <div id="personal-advisory" className="bg-white rounded-[3rem] p-8 md:p-12 shadow-2xl border-l-[16px] border-[#0A8A1F] relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 transition-transform duration-700 group-hover:scale-110"></div>
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-8">
                      <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center text-4xl shadow-inner border border-emerald-50">💡</div>
                        <div>
                          <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none">আপনার জন্য বিশেষ পরামর্শ</h3>
                          <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mt-2">অ্যাগ্রোনোমিস্ট গাইডেন্স সক্রিয়</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => playSpeech(dailyTip)}
                        className={`p-5 rounded-full shadow-2xl transition-all active:scale-90 ${isSpeaking ? 'bg-rose-500 animate-pulse' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                      >
                        {isSpeaking ? (
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" /></svg>
                        ) : (
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
                        )}
                      </button>
                    </div>
                    {isTipLoading ? (
                      <div className="flex items-center space-x-3 py-10">
                         <div className="w-6 h-6 border-4 border-[#0A8A1F] border-t-transparent rounded-full animate-spin"></div>
                         <p className="text-slate-400 font-black uppercase tracking-widest text-xs">এআই পরামর্শ বিশ্লেষণ করছে...</p>
                      </div>
                    ) : (
                      <div className="relative mb-10">
                        <p className="text-xl md:text-2xl font-medium leading-relaxed text-slate-700 italic border-l-4 border-emerald-500 pl-6 animate-fade-in">
                          {dailyTip || `আপনার শস্যের বর্তমান অবস্থা পর্যবেক্ষণ করুন। নিয়মিত যত্ন ফলন বাড়াতে সাহায্য করবে।`}
                        </p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <button onClick={() => { stopSpeech(); setCurrentView(View.PROFILE); }} className="bg-[#0A8A1F] text-white px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">বিস্তারিত প্রোফাইল</button>
                      <button onClick={() => { stopSpeech(); setCurrentView(View.CROP_CALENDAR); }} className="bg-slate-100 text-slate-600 px-8 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all">শস্য ক্যালেন্ডার</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="max-w-7xl mx-auto px-4 py-12"><FeatureHighlights onNavigate={(v) => { stopSpeech(); setCurrentView(v); }} /></div>
            <div className="max-w-7xl mx-auto px-4 mb-20"><ToolsHub onNavigate={(v) => { stopSpeech(); setCurrentView(v); }} /></div>
            <FeaturedCourses onNavigate={(v) => { stopSpeech(); setCurrentView(v); }} />
            <div className="max-w-7xl mx-auto px-4 py-16"><GoogleAdBanner /></div>
            <MissionSection /><ContactFooter />
          </div>
        );
      case View.TOOLS: return <ToolsHub onNavigate={(v) => { stopSpeech(); setCurrentView(v); }} />;
      case View.CHAT: return <ChatBot onBack={handleBack} userRank={user.progress.rank} userCrops={user.myCrops} onAction={() => handleAction(15)} onShowFeedback={showFeedback} />;
      case View.SEARCH: return <SearchTool onBack={handleBack} onAction={() => handleAction(10)} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      case View.ANALYZER: return <Analyzer onBack={handleBack} userRank={user.progress.rank} userCrops={user.myCrops} onAction={() => handleAction(50)} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      case View.WEATHER: return <Weather onBack={handleBack} />;
      case View.NUTRIENT_CALC: return <NutrientCalculator onBack={handleBack} user={user} onAction={() => handleAction(25)} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      case View.BIOCONTROL: return <BiocontrolGuide onBack={handleBack} onAction={() => handleAction(20)} onShowFeedback={showFeedback} />;
      case View.SOIL_GUIDE: return <SoilGuide onBack={handleBack} onAction={() => handleAction(20)} onShowFeedback={showFeedback} />;
      case View.DEFENSE_GUIDE: return <PlantDefenseGuide onBack={handleBack} />;
      case View.PEST_EXPERT: return <PesticideExpert onBack={handleBack} onNavigate={setCurrentView} onAction={() => handleAction(30)} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      case View.SOIL_EXPERT: return <SoilExpert onBack={handleBack} onAction={() => handleAction(30)} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      case View.YIELD_CALCULATOR: return <YieldCalculator onBack={handleBack} onAction={() => handleAction(20)} />;
      case View.AI_YIELD_PREDICTION: return <AIYieldPredictor onBack={handleBack} user={user} onAction={handleAction} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      case View.CROP_DISEASE_LIBRARY: return <CropDiseaseLibrary onBack={handleBack} onAction={() => handleAction(15)} onShowFeedback={showFeedback} />;
      case View.QR_GENERATOR: return <QRGenerator onBack={handleBack} onAction={() => handleAction(10)} />;
      case View.MONITORING: return <FieldMonitoring onBack={handleBack} onAction={() => handleAction(40)} onShowFeedback={showFeedback} />;
      case View.LEAF_COLOR_CHART: return <LeafColorChart onBack={handleBack} onAction={() => handleAction(40)} onShowFeedback={showFeedback} />;
      case View.LEARNING_CENTER: return <LearningCenter onBack={handleBack} onAction={handleAction} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      case View.PODCAST: return <AgriPodcast onBack={handleBack} onAction={handleAction} onShowFeedback={showFeedback} />;
      case View.PROFILE: return <UserProfile onBack={handleBack} user={user} onUpdateUser={updateUser} onSaveReport={handleSaveReport} onToggleSpeech={toggleSpeechEnabled} speechEnabled={speechEnabled} />;
      case View.ABOUT: return <About onBack={handleBack} onNavigate={setCurrentView} />;
      case View.FLASHCARDS: return <FlashcardView onAction={handleAction} onBack={handleBack} />;
      case View.TASK_SCHEDULER: return <TaskScheduler onBack={handleBack} user={user} onAction={() => handleAction(15)} />;
      case View.FAQ: return <FAQ onBack={handleBack} onShowFeedback={showFeedback} />;
      case View.CROP_CALENDAR: return <CropCalendar onBack={handleBack} user={user} onAction={() => handleAction(20)} onSaveReport={handleSaveReport} onShowFeedback={showFeedback} />;
      default: return <Hero onNavigate={setCurrentView} />;
    }
  };

  const BottomNavItem = ({ view, icon, label }: { view: View, icon: React.ReactNode, label: string }) => (
    <button onClick={() => { stopSpeech(); setCurrentView(view); }} className={`flex flex-col items-center justify-center w-full py-2 transition-all ${currentView === view ? 'text-[#0A8A1F] scale-110' : 'text-gray-400 opacity-70'}`}>
      <div className={currentView === view ? 'bg-green-50 p-2 rounded-xl' : ''}>{icon}</div>
      <span className="text-[9px] mt-1 font-black uppercase tracking-tighter">{label}</span>
    </button>
  );

  return (
    <SpeechContext.Provider value={{ isSpeaking, playSpeech, stopSpeech, speechEnabled, toggleSpeechEnabled }}>
      <div className={`min-h-screen flex flex-col font-sans pb-16 transition-colors duration-500 ${user.settings?.theme === 'dark' ? 'bg-slate-900 text-white' : 'bg-slate-50 text-gray-900'}`}>
        {showTour && <GuidedTour steps={MAIN_TOUR_STEPS} tourKey="main" onClose={() => setShowTour(false)} />}
        <FeedbackModal isOpen={isFeedbackOpen} onClose={() => setIsFeedbackOpen(false)} userRank={user.progress.rank} />
        <ShareDialog isOpen={isShareOpen} onClose={() => setIsShareOpen(false)} title="Krishi AI: স্মার্ট কৃষি ইকোসিস্টেম" content="বাংলাদেশের কৃষকদের জন্য আধুনিক এআই ভিত্তিক সমাধান।" installPrompt={installPrompt} onInstall={handleInstallApp} />

        <header className={`sticky top-0 z-[70] border-b backdrop-blur-md px-4 h-16 flex items-center justify-between transition-colors ${user.settings?.theme === 'dark' ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-100 shadow-sm'}`}>
           <div className="cursor-pointer" onClick={() => { stopSpeech(); setCurrentView(View.HOME); }}>
             <Logo showText size="sm" textColor={user.settings?.theme === 'dark' ? 'text-white' : 'text-slate-800'} />
           </div>
           <div className="flex items-center space-x-3">
              {isSpeaking && (
                <div className="flex items-center space-x-2 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-full border border-rose-100 dark:border-rose-800 animate-pulse">
                  <div className="flex space-x-0.5 items-end h-3">
                    {[1, 2, 3, 4].map(i => <div key={i} className="w-0.5 bg-rose-500 rounded-full animate-[bounce_0.6s_infinite]" style={{ animationDelay: `${i * 0.1}s`, height: `${40 + Math.random() * 60}%` }} />)}
                  </div>
                  <span className="text-[9px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest">Speaking</span>
                </div>
              )}
              <button onClick={() => setIsShareOpen(true)} className="p-2.5 bg-slate-50 dark:bg-slate-800 rounded-xl text-slate-500 hover:text-emerald-600 transition-all active:scale-90 shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              <button onClick={() => { stopSpeech(); setCurrentView(View.PROFILE); }} className="w-9 h-9 rounded-full border-2 border-[#0A8A1F] overflow-hidden shadow-sm active:scale-90 transition-transform">
                 <img src={user.photoURL || ''} alt="User" className="w-full h-full object-cover" />
              </button>
           </div>
        </header>

        <main className="flex-1 overflow-x-hidden">{renderView()}</main>
        
        <div id="bottom-nav" className={`md:hidden fixed bottom-0 left-0 right-0 border-t flex justify-around items-center z-50 h-20 px-2 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] transition-colors duration-500 ${user.settings?.theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-gray-100'}`}>
          <BottomNavItem view={View.HOME} label="হোম" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 v4a1 1 0 001 1m-6 0h6" /></svg>} />
          <BottomNavItem view={View.TOOLS} label="টুলস" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>} />
          <div className="relative -top-5">
            <button id="hero-scanner-btn" onClick={() => { stopSpeech(); setCurrentView(View.ANALYZER); }} className={`w-16 h-16 rounded-full shadow-[0_20px_50px_rgba(10,138,31,0.3)] flex items-center justify-center text-white transition-transform active:scale-90 ${currentView === View.ANALYZER ? 'bg-[#0A8A1F] scale-110' : 'bg-slate-900'}`}>
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812-1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><circle cx="12" cy="13" r="3" /></svg>
            </button>
          </div>
          <BottomNavItem view={View.LEARNING_CENTER} label="শিখন" icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.168 0.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332 0.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332 0.477-4.5 1.253" /></svg>} />
          <BottomNavItem view={View.FAQ} label="সহায়তা" icon={<Logo size="sm" variant="info" className={currentView === View.FAQ ? '' : 'grayscale opacity-50'} />} />
        </div>
      </div>
    </SpeechContext.Provider>
  );
};

const StatCard = ({ label, val, icon, color }: any) => (
  <div className="bg-white rounded-[2rem] p-5 shadow-xl border border-slate-100 flex flex-col items-center text-center group hover:shadow-2xl transition-all">
     <div className="text-3xl mb-2 group-hover:scale-110 transition-transform">{icon}</div>
     <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
     <p className={`text-xl font-black ${color}`}>{val}</p>
  </div>
);

export default App;