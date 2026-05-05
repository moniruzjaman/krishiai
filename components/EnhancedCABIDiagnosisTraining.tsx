// components/EnhancedCABIDiagnosisTraining.tsx
import React, { useState, useEffect } from "react";
import { useSpeech } from "../App";
import { getEnhancedRuleBasedAnalysis } from "../services/enhancedRuleBasedAnalyzer";
import { csvLoader } from "../services/csvLoader";

interface EnhancedCABIDiagnosisTrainingProps {
	onBack: () => void;
	onAction: () => void;
}

const ENHANCED_MODULES = [
	{
		id: 1,
		title: "ধাপ ১: পর্যবেক্ষণ (Observation)",
		icon: "👁️",
		desc: "একটি গাছের স্বাস্থ্য বুঝতে হলে প্রথমে তার স্বাভাবিক অবস্থা জানতে হবে।",
		content:
			"গবেষণা নির্দেশিকা অনুযায়ী, আক্রান্ত গাছটির সাথে পাশের একটি সুস্থ গাছের তুলনা করুন। নিচের কোন অংশগুলো আক্রান্ত হতে পারে বলে আপনি মনে করেন?",
		checkpoints: ["পাতা", "কান্ড", "শিকড়", "ফল/ফুল"],
		tip: "টিপস: একজন দক্ষ বিজ্ঞানীর মতো সব সময় গাছের উপরে থেকে নিচে এবং চারপাশ পর্যবেক্ষণ করুন।",
	},
	{
		id: 2,
		title: "ধাপ ২: লক্ষণের ধরণ (Damage Type)",
		icon: "🔬",
		desc: "ক্ষতির ধরণ দেখে 'অপরাধী' শনাক্ত করা সম্ভব। এটি ভার্চুয়াল ডায়াগনোসিস।",
		content:
			"যদি পাতায় ফুটো বা খাওয়া অংশ থাকে, তবে এটি পোকা (Pests)। যদি রঙ পরিবর্তন বা পচন থাকে, তবে এটি রোগ (Disease) হতে পারে।",
		simulator: {
			question: "এই ডিজিটাল স্যাম্পলটি স্ক্যান করুন এবং লক্ষণটি শনাক্ত করুন:",
			options: [
				{
					label: "চিবানো বা ফুটো করা (Chewing)",
					value: "pest",
					isCorrect: true,
					feedback: "সঠিক ডায়াগনোসিস! এটি সাধারণত মাজরা বা লেদা পোকার কাজ।",
				},
				{
					label: "রঙ পরিবর্তন বা ছোপ (Spots)",
					value: "disease",
					isCorrect: false,
					feedback:
						"লক্ষণটি আবার দেখুন। এখানে পাতার টিস্যু সরাসরি খাওয়া হয়েছে, শুধু রঙ পরিবর্তন হয়নি।",
				},
				{
					label: "গাছ শুকিয়ে যাওয়া (Wilting)",
					value: "abiotic",
					isCorrect: false,
					feedback:
						"এটি পানি বা তাপের অভাবে হতে পারে, কিন্তু এখানে যান্ত্রিক ক্ষতির চিহ্ন স্পষ্ট।",
				},
			],
		},
	},
	{
		id: 3,
		title: "ধাপ ৩: মাঠের বিন্যাস (Field Patterns)",
		icon: "🗺️",
		desc: "সমস্যাটি কি পুরো মাঠে নাকি নির্দিষ্ট জায়গায়? বৈজ্ঞানিক ম্যাপিং।",
		content:
			"যদি সমস্যাটি একটি লাইনে থাকে, তবে এটি যান্ত্রিক (যেমন লাঙল বা স্প্রে)। যদি এটি ছড়িয়ে ছিটিয়ে গোল আকারে থাকে, তবে এটি জৈবিক (পোকা বা রোগ)।",
		logic: [
			{
				label: "এলোমেলো ছোপ (Random Patches)",
				target: "Biotic",
				desc: "পোকা বা রোগ।",
			},
			{
				label: "সোজা লাইন (Straight Lines)",
				target: "Abiotic",
				desc: "সার বা বিষ প্রয়োগের ত্রুটি।",
			},
		],
	},
	{
		id: 4,
		title: "ধাপ ৪: চূড়ান্ত চ্যালেঞ্জ (The Plant Doctor Challenge)",
		icon: "👨‍⚕️",
		desc: "আপনার ডায়াগনোসিস সঠিক কি না তা যাচাই করুন!",
		content:
			"নিচের লক্ষণগুলো দেখুন এবং সঠিক ডায়াগনোসিস নির্বাচন করুন। প্রতিটি উত্তরের সাথে আমরা আপনাকে অফিসিয়াল উৎস দেখাবো।",
		quiz: {
			question:
				"ধানের পাতায় হলুদ রঙের ছোপ এবং সাদা কালো ছোপ দেখা যাচ্ছে। কি হতে পারে?",
			options: [
				{
					label: "মাজরা পোকা (Brown Plant Hopper)",
					value: "bph",
					isCorrect: true,
					feedback:
						"সঠিক! এটি মাজরা পোকার লক্ষণ। উৎস: DAE Krishi Janala Guide 2024",
				},
				{
					label: "ব্যাকটেরিয়াল ব্লাইট",
					value: "bacterial_blight",
					isCorrect: false,
					feedback:
						"এটি সাধারণত পাতার কিনারা থেকে শুরু হয়। উৎস: BRRI Rice Disease Manual",
				},
				{
					label: "নাইট্রোজেন অভাব",
					value: "nitrogen_deficiency",
					isCorrect: false,
					feedback:
						"এটি পাতার সম্পূর্ণ অংশ হলুদ হয়ে যায়। উৎস: BARC Fertilizer Guide 2024",
				},
			],
		},
	},
];

const EnhancedCABIDiagnosisTraining: React.FC<
	EnhancedCABIDiagnosisTrainingProps
> = ({ onBack, onAction }) => {
	const [activeModule, setActiveModule] = useState(1);
	const [isQuiz, setIsQuiz] = useState(false);
	const [selectedOption, setSelectedOption] = useState<string | null>(null);
	const [showFeedback, setShowFeedback] = useState(false);
	const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
	const [trainingImages, setTrainingImages] = useState<any[]>([]);

	// Load training images from CSV data
	useEffect(() => {
		const loadTrainingData = async () => {
			try {
				const images = await csvLoader.getTrainingImages();
				setTrainingImages(images);
			} catch (error) {
				console.error("Failed to load training images:", error);
			}
		};

		loadTrainingData();
	}, []);

	const handleNext = () => {
		if (activeModule < ENHANCED_MODULES.length) {
			setActiveModule(activeModule + 1);
			setIsQuiz(false);
			setSelectedOption(null);
			setShowFeedback(false);
		}
	};

	const handlePrev = () => {
		if (activeModule > 1) {
			setActiveModule(activeModule - 1);
			setIsQuiz(false);
			setSelectedOption(null);
			setShowFeedback(false);
		}
	};

	const handleOptionSelect = (optionValue: string) => {
		setSelectedOption(optionValue);
		const currentModule = ENHANCED_MODULES.find((m) => m.id === activeModule);
		if (
			currentModule?.quiz &&
			currentModule.quiz.options.find((opt) => opt.value === optionValue)
		) {
			setShowFeedback(true);
			setUserAnswers((prev) => ({ ...prev, [activeModule]: optionValue }));
		}
	};

	const getCurrentModule = () =>
		ENHANCED_MODULES.find((m) => m.id === activeModule) || ENHANCED_MODULES[0];

	return (
		<div className="max-w-4xl mx-auto p-4 pb-32 font-sans min-h-screen">
			<div className="flex items-center space-x-4 mb-8">
				<button
					onClick={handlePrev}
					disabled={activeModule === 1}
					className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-slate-50 transition-all active:scale-90 text-slate-400 disabled:opacity-30"
				>
					<svg
						className="h-6 w-6 text-slate-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2.5}
							d="M15 19l-7-7m0 0l7-7"
						/>
					</svg>
				</button>
				<div>
					<h1 className="text-2xl font-black text-gray-800 tracking-tight">
						CABI ডায়াগনোসিস একাডেমি
					</h1>
					<p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-100">
						Official CABI & BARI Protocol
					</p>
				</div>
				<button
					onClick={onBack}
					className="ml-auto p-3 bg-white rounded-2xl shadow-sm border hover:bg-slate-50 transition-all active:scale-90 text-slate-400"
				>
					<svg
						className="h-6 w-6 text-slate-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2.5}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</button>
			</div>

			<div className="bg-white rounded-[3rem] p-10 shadow-xl border border-slate-100 animate-fade-in">
				<div className="flex items-center justify-between mb-8">
					<div className="flex items-center space-x-4">
						<div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center text-2xl">
							{getCurrentModule()?.icon ?? "❓"}
						</div>
						<div>
							<h2 className="text-2xl font-black text-slate-800">
								{getCurrentModule()?.title ?? "Unknown Module"}
							</h2>
							<p className="text-sm text-slate-500">
								{getCurrentModule()?.desc ?? "Description not available"}
							</p>
						</div>
					</div>
					<div className="flex items-center space-x-2">
						<span className="text-xs font-black text-slate-400 uppercase tracking-widest">
							Step {activeModule}/{ENHANCED_MODULES.length}
						</span>
						<div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
							<div
								className="h-full bg-emerald-500 transition-all duration-500"
								style={{
									width: `${(activeModule / ENHANCED_MODULES.length) * 100}%`,
								}}
							></div>
						</div>
					</div>
				</div>

				<div className="space-y-8">
					<div className="prose prose-slate max-w-none text-slate-700 font-medium leading-relaxed">
						{getCurrentModule()?.content ?? "Content not available"}
					</div>

					{/* Checkpoints */}
					{getCurrentModule()?.checkpoints && (
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
							{getCurrentModule()!.checkpoints.map((checkpoint, idx) => (
								<div
									key={idx}
									className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center"
								>
									<div className="text-2xl mb-2">✓</div>
									<p className="text-sm font-bold text-slate-700">
										{checkpoint}
									</p>
								</div>
							))}
						</div>
					)}

					{/* Simulator */}
					{getCurrentModule()?.simulator && (
						<div className="mt-8">
							<h3 className="text-lg font-black text-slate-800 mb-4">
								ডিজিটাল সিমুলেশন
							</h3>
							<div className="bg-slate-50 rounded-2xl p-6">
								<p className="text-slate-700 mb-4">
									{getCurrentModule()?.simulator?.question ??
										"Question not available"}
								</p>
								<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
									{getCurrentModule()?.simulator?.options?.map(
										(option, idx) => (
											<button
												key={idx}
												onClick={() => handleOptionSelect(option.value)}
												className={`p-4 rounded-xl border-2 transition-all ${
													selectedOption === option.value
														? "border-emerald-500 bg-emerald-50 text-emerald-700"
														: "border-slate-200 hover:border-emerald-300 hover:bg-slate-100"
												}`}
											>
												<div className="font-bold mb-2">{option.label}</div>
												{showFeedback && selectedOption === option.value && (
													<div
														className={`text-sm mt-2 ${option.isCorrect ? "text-emerald-600" : "text-rose-600"}`}
													>
														{option.feedback}
													</div>
												)}
											</button>
										),
									)}
								</div>
							</div>
						</div>
					)}

					{/* Quiz */}
					{getCurrentModule()?.quiz && (
						<div className="mt-8">
							<h3 className="text-lg font-black text-slate-800 mb-4">
								ডায়াগনোসিস চ্যালেঞ্জ
							</h3>
							<div className="bg-slate-50 rounded-2xl p-6">
								<p className="text-slate-700 mb-4 font-bold">
									{getCurrentModule()?.quiz?.question ??
										"Question not available"}
								</p>
								<div className="space-y-3">
									{getCurrentModule()?.quiz?.options?.map((option, idx) => (
										<button
											key={idx}
											onClick={() => handleOptionSelect(option.value)}
											className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
												selectedOption === option.value
													? option.isCorrect
														? "border-emerald-500 bg-emerald-50 text-emerald-700"
														: "border-rose-500 bg-rose-50 text-rose-700"
													: "border-slate-200 hover:border-emerald-300 hover:bg-slate-100"
											}`}
										>
											<div className="font-bold">{option.label}</div>
											{showFeedback && selectedOption === option.value && (
												<div
													className={`text-sm mt-2 ${option.isCorrect ? "text-emerald-600" : "text-rose-600"}`}
												>
													{option.feedback}
												</div>
											)}
										</button>
									))}
								</div>
							</div>
						</div>
					)}

					{/* Tip */}
					{getCurrentModule()?.tip && (
						<div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
							<div className="flex items-start space-x-3">
								<div className="mt-1 text-emerald-500">💡</div>
								<p className="text-sm text-emerald-800 font-medium">
									{getCurrentModule().tip}
								</p>
							</div>
						</div>
					)}
				</div>

				{/* Navigation */}
				<div className="mt-12 flex justify-between">
					<button
						onClick={handlePrev}
						disabled={activeModule === 1}
						className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-black disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
					>
						পূর্ববর্তী
					</button>

					{!isQuiz && !getCurrentModule()?.quiz && (
						<button
							onClick={handleNext}
							className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 active:scale-95 transition-all"
						>
							{activeModule === ENHANCED_MODULES.length
								? "সম্পন্ন করুন"
								: "পরবর্তী"}
						</button>
					)}

					{getCurrentModule()?.quiz && showFeedback && (
						<button
							onClick={handleNext}
							className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-black hover:bg-emerald-700 active:scale-95 transition-all"
						>
							পরবর্তী ধাপ
						</button>
					)}
				</div>
			</div>

			{/* Completion Screen */}
			{activeModule > ENHANCED_MODULES.length && (
				<div className="max-w-2xl mx-auto py-12 text-center space-y-10 animate-fade-in">
					<div className="relative">
						<div className="w-48 h-48 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-9xl animate-bounce shadow-2xl border-4 border-white">
							🎓
						</div>
						<div className="absolute inset-0 w-full h-full pointer-events-none">
							{[1, 2, 3, 4, 5].map((i) => (
								<div
									key={i}
									className="absolute text-2xl animate-pulse"
									style={{
										top: `${Math.random() * 100}%`,
										left: `${Math.random() * 100}%`,
									}}
								>
									✨
								</div>
							))}
						</div>
					</div>

					<div className="space-y-4">
						<h2 className="text-5xl font-black text-slate-900 tracking-tight">
							অভিনন্দন, আপনি এখন একজন সার্টিফাইড 'প্ল্যান্ট ডক্টর'!
						</h2>
						<p className="text-xl text-slate-500 font-medium">
							আপনি সফলভাবে সকল বৈজ্ঞানিক সেশন এবং ডায়াগনোসিস ট্রেনিং সম্পন্ন
							করেছেন।
						</p>
					</div>

					<div className="bg-white p-10 rounded-[4rem] shadow-2xl border-2 border-emerald-500/20 relative overflow-hidden">
						<div className="absolute top-0 left-0 w-full h-3 bg-emerald-500"></div>
						<p className="text-[12px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-6">
							Scientific Achievement Rewards
						</p>
						<div className="flex justify-center space-x-6">
							<div className="p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 shadow-inner group hover:scale-105 transition-transform">
								<p className="text-4xl mb-2 group-hover:rotate-12 transition-transform">
									🏅
								</p>
								<p className="text-[10px] font-black uppercase">
									Elite Scout Badge
								</p>
							</div>
							<div className="p-6 bg-emerald-50 rounded-[2.5rem] border border-emerald-100 shadow-inner group hover:scale-105 transition-transform">
								<p className="text-4xl mb-2 group-hover:rotate-12 transition-transform">
									⭐
								</p>
								<p className="text-[10px] font-black uppercase">
									Knowledge +১০০ XP
								</p>
							</div>
						</div>
					</div>

					<div className="pt-6">
						<button
							onClick={onBack}
							className="w-full bg-[#0A8A1F] text-white py-7 rounded-[2.5rem] font-black text-2xl shadow-[0_20px_50px_rgba(10,138,31,0.3)] active:scale-95 transition-all hover:scale-[1.02]"
						>
							এআই স্ক্যানার দিয়ে প্র্যাকটিস শুরু করুন
						</button>
					</div>
				</div>
			)}
		</div>
	);
};

export default EnhancedCABIDiagnosisTraining;
