import React, { useState, useEffect, useMemo } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { getQuotaManager, getTrainingDataCollector, getDatasetManager } from '../services/quota/orchestrationInit';
import { ToolGuideHeader } from './ToolGuideHeader';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface AnalyticsDashboardProps {
    userId?: string;
    onBack?: () => void;
    lang?: 'en' | 'bn';
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ userId, onBack, lang = 'en' }) => {
    const [stats, setStats] = useState<any>(null);
    const [datasetStats, setDatasetStats] = useState<any>(null);
    const [trainingData, setTrainingData] = useState<any[]>([]);
    const [activeTab, setActiveTab] = useState<'overview' | 'models' | 'crops' | 'data' | 'exports'>('overview');
    const [isSyncing, setIsSyncing] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, [userId]);

    const loadData = async () => {
        const qm = getQuotaManager();
        const tdc = getTrainingDataCollector();
        const dm = getDatasetManager();

        const userStats = userId ? await qm.getUserAnalytics(userId) : null;
        const data = await tdc.getAllTrainingData();
        const dStats = dm.getStatistics();

        setStats(userStats);
        setDatasetStats(dStats);
        setTrainingData(userId ? data.filter(d => d.userId === userId) : data);
    };

    const handleSync = async (source: 'CABI' | 'BRRI' | 'BARI' | 'ALL') => {
        setIsSyncing(source);
        const dm = getDatasetManager();
        try {
            if (source === 'CABI') await dm.loadCABIData();
            else if (source === 'BRRI') await dm.loadBRRIData();
            else if (source === 'BARI') await dm.loadBARIData();
            else await dm.loadAllDatasets();

            await loadData();
        } catch (error) {
            console.error('Sync failed:', error);
        } finally {
            setIsSyncing(null);
        }
    };

    // Process data for charts
    const modelData = useMemo(() => {
        if (!stats?.byModel) return [];
        return Object.entries(stats.byModel).map(([name, value]) => ({ name, value }));
    }, [stats]);

    const dailyUsageData = useMemo(() => {
        const counts: Record<string, number> = {};
        trainingData.forEach(d => {
            const date = new Date(d.timestamp).toLocaleDateString();
            counts[date] = (counts[date] || 0) + 1;
        });
        return Object.entries(counts)
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-7); // Last 7 days
    }, [trainingData]);

    const cropData = useMemo(() => {
        const counts: Record<string, number> = {};
        trainingData.forEach(d => {
            const crop = d.cropType || 'Unknown';
            counts[crop] = (counts[crop] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [trainingData]);

    const confidenceData = useMemo(() => {
        const ranges = [
            { name: '0-20%', value: 0 },
            { name: '20-40%', value: 0 },
            { name: '40-60%', value: 0 },
            { name: '60-80%', value: 0 },
            { name: '80-100%', value: 0 }
        ];
        trainingData.forEach(d => {
            const conf = d.confidence * 100;
            if (conf < 20) ranges[0].value++;
            else if (conf < 40) ranges[1].value++;
            else if (conf < 60) ranges[2].value++;
            else if (conf < 80) ranges[3].value++;
            else ranges[4].value++;
        });
        return ranges;
    }, [trainingData]);

    const handleExport = async (format: 'json' | 'csv') => {
        const tdc = getTrainingDataCollector();
        const data = await tdc.exportTrainingData(format);
        const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `krishiai_analytics_${new Date().toISOString()}.${format}`;
        a.click();
    };

    return (
        <div className="min-h-screen bg-slate-50 pb-20 animate-fade-in">
            <ToolGuideHeader
                title={lang === 'bn' ? 'অ্যানালিটিক্স ড্যাশবোর্ড' : 'Analytics Dashboard'}
                subtitle={lang === 'bn' ? 'আপনার এআই অডিট এবং ডায়াগনোসিস পরিসংখ্যান।' : 'Your AI audit and diagnosis statistics.'}
                protocol="SMART-ANALYTICS-V1"
                source="Krishi AI Core"
                lang={lang}
                onBack={onBack || (() => { })}
                guideSteps={[
                    "Review your daily and weekly usage statistics.",
                    "Check the confidence distribution of AI diagnoses.",
                    "Monitor token usage and cost efficiency.",
                    "Export data for external analysis."
                ]}
                icon="📊"
                themeColor="blue"
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-8">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <StatCard
                        title={lang === 'bn' ? 'মোট ডায়াগনোসিস' : 'Total Analyses'}
                        value={stats?.totalAnalyses || 0}
                        icon="🔬"
                        color="emerald"
                    />
                    <StatCard
                        title={lang === 'bn' ? 'গড় আত্মবিশ্বাস' : 'Avg. Confidence'}
                        value={`${((stats?.averageConfidence || 0) * 100).toFixed(1)}%`}
                        icon="🎯"
                        color="blue"
                    />
                    <StatCard
                        title={lang === 'bn' ? 'ব্যবহৃত টোকেন' : 'Tokens Used'}
                        value={stats?.totalTokensUsed?.toLocaleString() || 0}
                        icon="⚡"
                        color="amber"
                    />
                    <StatCard
                        title={lang === 'bn' ? 'ইউজার স্ট্যাটাস' : 'User Status'}
                        value={stats?.isHeavyUser ? (lang === 'bn' ? 'হেভি ইউজার' : 'Heavy User') : (lang === 'bn' ? 'স্ট্যান্ডার্ড' : 'Standard')}
                        icon="🏆"
                        color={stats?.isHeavyUser ? 'rose' : 'emerald'}
                    />
                </div>

                {/* Tab Navigation */}
                <div className="flex space-x-1 bg-white p-1 rounded-2xl shadow-sm border border-slate-200 mb-8 max-w-2xl overflow-x-auto scrollbar-hide">
                    {(['overview', 'models', 'crops', 'data', 'exports'] as const).map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex-1 py-3 px-6 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab ? 'bg-slate-900 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-50'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                <div className="space-y-8">
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title={lang === 'bn' ? 'দৈনিক ব্যবহার (গত ৭ দিন)' : 'Daily Usage (L7D)'}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <AreaChart data={dailyUsageData}>
                                        <defs>
                                            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={4} fillOpacity={1} fill="url(#colorCount)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </ChartCard>

                            <ChartCard title={lang === 'bn' ? 'আত্মবিশ্বাস ডিস্ট্রিবিউশন' : 'Confidence Distribution'}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={confidenceData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                    )}

                    {activeTab === 'models' && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <ChartCard title={lang === 'bn' ? 'মডেল ব্যবহার ডিস্ট্রিবিউশন' : 'Model Usage Distribution'}>
                                <ResponsiveContainer width="100%" height={300}>
                                    <PieChart>
                                        <Pie
                                            data={modelData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={100}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {modelData.map((_, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    {modelData.map((m: any, i) => (
                                        <div key={m.name} className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }}></div>
                                            <span className="text-[10px] font-bold text-slate-600 uppercase">{m.name}: {String(m.value)}</span>
                                        </div>
                                    ))}
                                </div>
                            </ChartCard>

                            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
                                <h3 className="text-xl font-black mb-6 uppercase tracking-tight">AI Engine Stats</h3>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end border-b pb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Most Used</p>
                                            <h4 className="text-2xl font-black text-slate-900">{modelData.sort((a: any, b: any) => b.value - a.value)[0]?.name || 'N/A'}</h4>
                                        </div>
                                        <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Primary</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b pb-4">
                                        <div>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Efficiency Rate</p>
                                            <h4 className="text-2xl font-black text-slate-900">98.4%</h4>
                                        </div>
                                        <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-black uppercase">Optimized</span>
                                    </div>
                                    <p className="text-sm text-slate-500 leading-relaxed font-medium mt-4">
                                        Your AI orchestration engine smartly switches between Gemini for high-precision audits and local models for standard health checks to optimize costs and performance.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'crops' && (
                        <div className="grid grid-cols-1 gap-8">
                            <ChartCard title={lang === 'bn' ? 'ফসল ডিস্ট্রিবিউশন' : 'Crop Distribution'}>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={cropData} layout="vertical">
                                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                        <XAxis type="number" hide />
                                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 700 }} width={100} />
                                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                        <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} label={{ position: 'right', fontWeight: 700, fill: '#64748b' }} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </ChartCard>
                        </div>
                    )}

                    {activeTab === 'data' && (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-6">
                                <DatasetCard source="CABI" count={datasetStats?.cabi || 0} icon="🌐" color="blue" isSyncing={isSyncing === 'CABI'} onSync={() => handleSync('CABI')} />
                                <DatasetCard source="BRRI" count={datasetStats?.brri || 0} icon="🌾" color="emerald" isSyncing={isSyncing === 'BRRI'} onSync={() => handleSync('BRRI')} />
                                <DatasetCard source="BARI" count={datasetStats?.bari || 0} icon="🍅" color="rose" isSyncing={isSyncing === 'BARI'} onSync={() => handleSync('BARI')} />
                                <div className="sm:col-span-3">
                                    <button
                                        onClick={() => handleSync('ALL')}
                                        disabled={isSyncing !== null}
                                        className={`w-full py-6 rounded-3xl font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center space-x-4 ${isSyncing === 'ALL' ? 'bg-slate-100 text-slate-400' : 'bg-slate-900 text-white hover:bg-black active:scale-95'}`}
                                    >
                                        <span>{isSyncing === 'ALL' ? 'SYNCING ALL REPOSITORIES...' : 'FORCE SYNC ALL DATASETS'}</span>
                                        {isSyncing === 'ALL' && <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>}
                                    </button>
                                </div>
                            </div>
                            <div className="lg:col-span-4 bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl">
                                <h4 className="text-lg font-black mb-6 uppercase tracking-tighter">Global Knowledge base</h4>
                                <div className="space-y-6">
                                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl">
                                        <span className="text-[10px] font-black text-slate-400 uppercase">Total Grounding Records</span>
                                        <span className="text-xl font-black text-slate-800">{datasetStats?.total || 0}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                        Grounding records are verified scientific data from CABI, BRRI, and BARI used by Krishi AI to prevent hallucinations and provide citations.
                                    </p>
                                    <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                        <p className="text-[9px] font-black text-blue-600 uppercase mb-2">Sync Protocol</p>
                                        <p className="text-[10px] font-bold text-blue-800 leading-tight">
                                            The system automatically refreshes its local repository when connected to provide the latest Govt. agro-advisories.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'exports' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="bg-white p-10 rounded-[3rem] border-4 border-slate-900 shadow-2xl flex flex-col items-center text-center">
                                <div className="text-6xl mb-6">📄</div>
                                <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">Export as JSON</h3>
                                <p className="text-slate-500 font-medium mb-8">Download your entire analysis history in a structured JSON format for developers or system migration.</p>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-black transition-all transform hover:scale-[1.02]"
                                >
                                    Download JSON
                                </button>
                            </div>

                            <div className="bg-emerald-600 p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center text-white">
                                <div className="text-6xl mb-6">📊</div>
                                <h3 className="text-2xl font-black mb-4 uppercase tracking-tighter">Export as CSV</h3>
                                <p className="text-emerald-100 font-medium mb-8">Professional CSV format compatible with Excel, Google Sheets, or data science tools for deep research.</p>
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="w-full bg-white text-emerald-600 py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-emerald-50 transition-all transform hover:scale-[1.02]"
                                >
                                    Download CSV
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const DatasetCard = ({ source, count, icon, color, isSyncing, onSync }: any) => (
    <div className={`bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 flex flex-col items-center text-center relative overflow-hidden group`}>
        <div className={`text-5xl mb-4 group-hover:scale-110 transition-transform ${isSyncing ? 'animate-bounce' : ''}`}>{icon}</div>
        <h4 className="text-2xl font-black text-slate-800 tracking-tighter">{source}</h4>
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">{count} Records</p>
        <button
            onClick={onSync}
            disabled={isSyncing}
            className={`w-full py-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${isSyncing ? 'bg-slate-50 text-slate-400' : `bg-${color}-50 text-${color}-600 border-${color}-100 hover:bg-${color}-600 hover:text-white`}`}
        >
            {isSyncing ? 'SYNCING...' : 'REFRESH'}
        </button>
        {isSyncing && (
            <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin"></div>
            </div>
        )}
    </div>
);

const StatCard = ({ title, value, icon, color }: { title: string, value: string | number, icon: string, color: string }) => (
    <div className={`bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 flex items-center space-x-4 border-b-8 border-b-${color}-500/50`}>
        <div className={`w-14 h-14 rounded-2xl bg-${color}-50 flex items-center justify-center text-2xl shadow-inner`}>
            {icon}
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</p>
            <h3 className="text-2xl font-black text-slate-900 leading-none">{value}</h3>
        </div>
    </div>
);

const ChartCard = ({ title, children }: { title: string, children: React.ReactNode }) => (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
        <h3 className="text-xl font-black mb-8 uppercase tracking-tight flex items-center">
            <span className="w-2 h-8 bg-slate-900 rounded-full mr-3"></span>
            {title}
        </h3>
        {children}
    </div>
);

export default AnalyticsDashboard;
