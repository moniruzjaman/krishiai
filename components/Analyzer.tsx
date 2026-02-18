import React, { useState, useRef, useEffect } from "react";
import { useModelService } from "../services/modelService";
import { getStoredLocation } from "../services/locationService";
import {
	AnalysisResult,
	SavedReport,
	UserCrop,
	View,
	Language,
	WeatherData,
} from "../types";
import { CROPS_BY_CATEGORY } from "../constants";
import ShareDialog from "./ShareDialog";
import DynamicPrecisionForm from "./DynamicPrecisionForm";
import { useSpeech } from "../App";
import GuidedTour, { TourStep } from "./GuidedTour";
import { ToolGuideHeader } from "./ToolGuideHeader";

// Import cost-aware analyzer
import { costAwareAnalyzer, quotaManager } from "../services/modelService";

// Keep legacy imports for now (to be migrated later)
import {
	requestPrecisionParameters,
	performDeepAudit,
	getLiveWeather as geminiGetLiveWeather,
} from "../services/geminiService";

interface AnalyzerProps {
	onAction?: () => void;
	onSaveReport?: (report: Omit<SavedReport, "id" | "timestamp">) => void;
	onShowFeedback?: () => void;
	onBack?: () => void;
	onNavigate?: (view: View) => void;
	userRank?: string;
	userCrops?: UserCrop[];
	lang: Language;
}

const ANALYZER_TOUR: TourStep[] = [
	{
		title: "সমন্বিত এআই অডিট",
		content:
			"এই এআই স্ক্যানার একই সাথে পোকা (Pest), রোগ (Disease) এবং পুষ্টির অভাব (Nutrient Deficiency) শনাক্ত করতে পারে।",
		position: "center",
	},
	{
		targetId: "analyzer-media-selector",
		title: "মিডিয়া নির্বাচন",
		content: "আপনি এখন ছবি অথবা ভিডিওর মাধ্যমে নিখুঁত ডায়াগনোসিস করতে পারেন।",
		position: "bottom",
	},
	{
		targetId: "live-cam-btn",
		title: "লাইভ এআই ক্যামেরা",
		content:
			"সরাসরি মাঠ থেকে লাইভ ভিডিও এবং অডিওর মাধ্যমে ডায়াগনোসিস করতে এটি ব্যবহার করুন।",
		position: "top",
	},
];

const Analyzer: React.FC<AnalyzerProps> = ({
	onAction,
	onSaveReport,
	onShowFeedback,
	onBack,
	onNavigate,
	userRank,
	userCrops = [],
	lang,
}) => {
	const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
	const [mimeType, setMimeType] = useState<string>("");
	const [userQuery, setUserQuery] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [loadingStep, setLoadingStep] = useState(0);
	const [result, setResult] = useState<AnalysisResult | null>(null);
	const [precisionFields, setPrecisionFields] = useState<any[] | null>(null);
	const [isListening, setIsListening] = useState(false);
	const [isShareOpen, setIsShareOpen] = useState(false);
	const [showTour, setShowTour] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [weather, setWeather] = useState<WeatherData | null>(null);
	const [isLiveMode, setIsLiveMode] = useState(false);
	const [showFlash, setShowFlash] = useState(false);

	const { playSpeech, stopSpeech, isSpeaking, speechEnabled } = useSpeech();
	const [cropFamily, setCropFamily] = useState<string>("ধান");

	const fileInputRef = useRef<HTMLInputElement>(null);
	const videoInputRef = useRef<HTMLInputElement>(null);
	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const reportRef = useRef<HTMLDivElement>(null);
	const recognitionRef = useRef<any>(null);

	const loadingMessages = [
		"ডিজিটাল ইমেজ সেন্সর ক্যালিব্রেট করা হচ্ছে...",
		"প্যাথলজিক্যাল প্যাটার্ন ও লক্ষণগুলো শনাক্ত করা হচ্ছে...",
		"অফিসিয়াল BARI/BRRI ডাটাবেসের সাথে তথ্য মেলানো হচ্ছে...",
		"আপনার এলাকার লাইভ আবহাওয়া ও মাটির অবস্থা বিশ্লেষণ চলছে...",
		"DAE স্ট্যান্ডার্ড অনুযায়ী সঠিক বালাইনাশক ডোজ নির্বাচন হচ্ছে...",
		"নিখুঁত বৈজ্ঞানিক ব্যবস্থাপত্র (Report) চূড়ান্ত করা হচ্ছে...",
	];

	const modelService = useModelService();

	useEffect(() => {
		const tourDone = localStorage.getItem("agritech_tour_analyzer_v5");
		if (!tourDone) setShowTour(true);

		const loadWeather = async () => {
			const loc = getStoredLocation();
			if (loc) {
				try {
					const data = await geminiGetLiveWeather(
						loc.lat,
						loc.lng,
						false,
						lang,
					);
					setWeather(data);
				} catch (e) {
					console.warn("Failed to load weather via gemini", e);
				}
			}
		};
		loadWeather();

		const SpeechRecognition =
			(window as any).SpeechRecognition ||
			(window as any).webkitSpeechRecognition;
		if (SpeechRecognition) {
			recognitionRef.current = new SpeechRecognition();
			recognitionRef.current.lang = lang === "bn" ? "bn-BD" : "en-US";
			recognitionRef.current.onstart = () => setIsListening(true);
			recognitionRef.current.onresult = (event: any) =>
				setUserQuery((prev) => prev + " " + event.results[0][0].transcript);
			recognitionRef.current.onend = () => setIsListening(false);
			recognitionRef.current.onerror = () => setIsListening(false);
		}
	}, [lang]);

	useEffect(() => {
		let interval: any;
		if (isLoading)
			interval = setInterval(
				() => setLoadingStep((prev) => (prev + 1) % loadingMessages.length),
				2000,
			);
		return () => clearInterval(interval);
	}, [isLoading]);

	const startLiveMode = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: {
					facingMode: "environment",
					width: { ideal: 1280 },
					height: { ideal: 720 },
				},
				audio: false,
			});
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				setIsLiveMode(true);
				setSelectedMedia(null);
				setResult(null);
			}
		} catch (err) {
			alert(
				lang === "bn"
					? "ক্যামেরা অ্যাক্সেস করা সম্ভব হয়নি।"
					: "Camera access denied.",
			);
		}
	};

	const stopLiveMode = () => {
		const stream = videoRef.current?.srcObject as MediaStream;
		stream?.getTracks().forEach((track) => track.stop());
		setIsLiveMode(false);
	};

	const captureFrame = (isDeepAudit: boolean = false) => {
		if (videoRef.current && canvasRef.current) {
			setShowFlash(true);
			setTimeout(() => setShowFlash(false), 400);

			const context = canvasRef.current.getContext("2d");
			canvasRef.current.width = videoRef.current.videoWidth;
			canvasRef.current.height = videoRef.current.videoHeight;
			context?.drawImage(videoRef.current, 0, 0);
			const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.95);
			setSelectedMedia(dataUrl);
			setMimeType("image/jpeg");
			stopLiveMode();
			handleAnalyze(isDeepAudit, dataUrl);
		}
	};

	const handleAnalyze = async (
		precision: boolean = false,
		dataUrlOverride?: string,
	) => {
		const mediaToAnalyze = dataUrlOverride || selectedMedia;
		const typeToAnalyze = dataUrlOverride ? "image/jpeg" : mimeType;

		if (!mediaToAnalyze && !isLiveMode) return;

		const startTime = performance.now(); // Track response time
		setIsLoading(true);
		setResult(null);
		setPrecisionFields(null);
		setLoadingStep(0);

		try {
			const base64 = (mediaToAnalyze || "").split(",")[1];
			const analysisStartTime = Date.now();

			if (precision) {
				// Still use gemini for precision params (to be migrated later)
				const fields = await requestPrecisionParameters(
					base64,
					typeToAnalyze,
					cropFamily,
					lang,
				);
				if (!fields || fields.length === 0) {
					// Fallback: use cost-aware analyzer
					const analysis = await costAwareAnalyzer.analyzeWithCostControl(
						base64,
						typeToAnalyze,
						{
							cropFamily,
							userRank,
							query: userQuery,
							lang,
							weather: weather || undefined,
							budget: "low-cost", // Deep audit uses low-cost tier
						},
					);
					setResult(analysis);
					if (speechEnabled) playSpeech(analysis.fullText);
				} else {
					setPrecisionFields(fields);
				}
			} else {
				// ✅ Core refactor: use cost-aware analyzer for cost optimization
				const analysis = await costAwareAnalyzer.analyzeWithCostControl(
					base64,
					typeToAnalyze,
					{
						cropFamily,
						userRank,
						query: userQuery,
						lang,
						weather: weather || undefined,
						budget: "free", // Start with free tier for cost optimization
					},
				);
				setResult(analysis);
				if (speechEnabled) playSpeech(analysis.fullText);
				if (onAction) onAction();

				// Record usage for quota management
				if (analysis.officialSource) {
					quotaManager.recordUsage(
						analysis.officialSource.includes("Gemini")
							? "gemini-3-flash-preview"
							: "meta-llama/llama-3.1-8b-chat",
					);
				}
			}
		} catch (error: any) {
			console.error("Analysis Error:", error);
			if (
				error.message.includes("fallback") ||
				error.message.includes("OpenRouter")
			) {
				try {
					const base64 = (selectedMedia || "").split(",")[1];
					const analysis =
						(await (modelService as any).geminiProvider?.analyzeImage?.(
							base64,
							mimeType,
							{
								cropFamily,
								userRank,
								query: userQuery,
								lang,
								weather: weather || undefined,
							},
						)) ||
						(await (window as any).geminiService?.analyzeCropImage?.(
							base64,
							mimeType,
							{
								cropFamily,
								userRank,
								query: userQuery,
								lang,
								weather: weather || undefined,
							},
						));
					if (analysis) {
						setResult(analysis);
						if (speechEnabled) playSpeech(analysis.fullText);
						if (onAction) onAction();
					}
				} catch (fallbackErr) {
					console.error("Fallback also failed:", fallbackErr);
				}
			}
		} finally {
			setIsLoading(false);
		}
	};

	const handlePrecisionSubmit = async (dynamicData: Record<string, string>) => {
		if (!selectedMedia) return;
		setIsLoading(true);
		setResult(null);
		setLoadingStep(0);
		try {
			const base64 = selectedMedia.split(",")[1];
			// ✅ Use cost-aware analyzer, not direct gemini call
			const analysis = await costAwareAnalyzer.analyzeWithCostControl(
				base64,
				mimeType,
				{
					cropFamily,
					userRank,
					query: userQuery,
					lang,
					weather: weather || undefined,
					budget: "low-cost", // Deep audit uses low-cost tier
				},
			);
			setResult(analysis);
			setPrecisionFields(null);
			if (speechEnabled) playSpeech(analysis.fullText);
			if (onAction) onAction();
		} catch (e) {
			alert(lang === "bn" ? "ডিপ অডিট ব্যর্থ হয়েছে।" : "Deep Audit Failed.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveToHistory = async () => {
		if (result && onSaveReport && selectedMedia) {
			setIsSaving(true);
			try {
				// ✅ Refactor: use modelService.generateSpeech
				let audioBase64: string | undefined;
				try {
					audioBase64 = await modelService.generateSpeech(
						result.fullText.replace(/[*#_~]/g, ""),
					);
				} catch (speechErr) {
					console.warn(
						"Speech generation failed (using OpenRouter?), falling back to Gemini...",
					);
					// Fallback to original geminiService.generateSpeech
					const { generateSpeech } = await import("../services/geminiService");
					audioBase64 = await generateSpeech(
						result.fullText.replace(/[*#_~]/g, ""),
					);
				}

				onSaveReport({
					type: "Official Scientific Audit",
					title: result.diagnosis,
					content: result.fullText,
					audioBase64,
					icon:
						result.category === "Pest"
							? "🦗"
							: result.category === "Disease"
								? "🦠"
								: result.category === "Deficiency"
									? "⚖️"
									: "🍂",
					imageUrl: selectedMedia,
				});
				alert(
					lang === "bn"
						? "অফিসিয়াল রিপোর্ট সংরক্ষিত হয়েছে!"
						: "Official Report Saved!",
				);
			} catch (e) {
				onSaveReport({
					type: "Official Scientific Audit",
					title: result.diagnosis,
					content: result.fullText,
					icon:
						result.category === "Pest"
							? "🦗"
							: result.category === "Disease"
								? "🦠"
								: result.category === "Deficiency"
									? "⚖️"
									: "🍂",
					imageUrl: selectedMedia,
				});
				alert(
					lang === "bn"
						? "সংরক্ষিত হয়েছে (অডিও ছাড়া)"
						: "Saved (without audio)",
				);
			} finally {
				setIsSaving(false);
			}
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-4 pb-32 animate-fade-in font-sans">
			{showTour && (
				<GuidedTour
					steps={ANALYZER_TOUR}
					tourKey="analyzer_v5"
					onClose={() => setShowTour(false)}
				/>
			)}

			{isShareOpen && result && (
				<ShareDialog
					isOpen={isShareOpen}
					onClose={() => setIsShareOpen(false)}
					title={`Scientific Audit: ${result.diagnosis}`}
					content={result.fullText}
				/>
			)}

			<ToolGuideHeader
				title={
					lang === "bn"
						? "অফিসিয়াল সায়েন্টিফিক অডিট"
						: "Official Scientific Audit"
				}
				subtitle={
					lang === "bn"
						? "পোকা, রোগ ও পুষ্টির অভাব শনাক্তকরণ এবং বিএআরআই/বিআরআই প্রটোকল ভিত্তিক প্রতিকার।"
						: "Identify pests, diseases, and deficiencies with official BARI/BRRI protocols."
				}
				protocol="BARC/BARI/BRRI Grounded"
				source="Authentic BD Government Repositories"
				lang={lang}
				onBack={onBack || (() => {})}
				icon="🔬"
				themeColor="emerald"
				guideSteps={
					lang === "bn"
						? [
								"শস্য নির্বাচন করুন বা আক্রান্ত অংশের ছবি তুলুন।",
								"লাইভ ক্যামেরা ব্যবহার করে সরাসরি মাঠ থেকে ডায়াগনোসিস করুন।",
								"তথ্যসূত্র যাচাই করতে রিপোর্টের নিচের লিংকে ক্লিক করুন।",
								"সকল পরামর্শ বিএআরআই (BARI) বা বিআরআরআই (BRRI) এর প্রটোকল অনুযায়ী তৈরি।",
							]
						: [
								"Select crop or take photo of affected part.",
								"Use Live Camera for real-time field diagnosis.",
								"Click verification links at the bottom of report for authentic sources.",
								"All advisories follow BARI/BRRI plant protection protocols.",
							]
				}
			/>

			<div className="bg-white rounded-[3rem] p-6 md:p-10 shadow-xl border border-slate-100 mb-8 print:hidden">
				<div className="space-y-6 mb-10">
					<div className="flex items-center justify-between">
						<div className="flex items-center space-x-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
							<span className="w-2 h-2 rounded-full bg-emerald-500"></span>
							<span>
								{lang === "bn"
									? "শস্য ও ডায়াগনোসিস মোড"
									: "Crop & Diagnosis Mode"}
							</span>
						</div>
						<div className="bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-100 flex items-center space-x-2">
							<span className="text-[8px] font-black text-indigo-600 uppercase tracking-widest">
								Grounded Source Verification
							</span>
						</div>
					</div>

					<select
						value={cropFamily}
						onChange={(e) => setCropFamily(e.target.value)}
						className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-4 px-6 font-black text-lg text-slate-700 focus:border-emerald-500 outline-none shadow-inner appearance-none transition-all"
					>
						{Object.values(CROPS_BY_CATEGORY)
							.flat()
							.map((c) => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
					</select>

					<div className="grid grid-cols-1 md:grid-cols-12 gap-6">
						<div
							id="analyzer-media-selector"
							className="md:col-span-5 aspect-square relative"
						>
							{isLiveMode ? (
								<div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black">
									<video
										ref={videoRef}
										autoPlay
										playsInline
										muted
										className="w-full h-full object-cover"
									/>

									{/* Immersive HUD Overlays */}
									<div className="absolute inset-0 pointer-events-none">
										{/* Animated Scanning Line */}
										<div className="absolute left-0 w-full h-0.5 bg-emerald-500 shadow-[0_0_15px_#10b981] animate-scanning-line z-10"></div>

										{/* Viewfinder corners */}
										<div className="absolute top-8 left-8 w-10 h-10 border-t-2 border-l-2 border-emerald-500/60 rounded-tl-xl"></div>
										<div className="absolute top-8 right-8 w-10 h-10 border-t-2 border-r-2 border-emerald-500/60 rounded-tr-xl"></div>
										<div className="absolute bottom-8 left-8 w-10 h-10 border-b-2 border-l-2 border-emerald-500/60 rounded-bl-xl"></div>
										<div className="absolute bottom-8 right-8 w-10 h-10 border-b-2 border-r-2 border-emerald-500/60 rounded-br-xl"></div>

										{/* Telemetry labels */}
										<div className="absolute top-10 left-10 space-y-2 opacity-60">
											<div className="bg-black/40 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase">
												MODE: AI_SCAN_V2
											</div>
											<div className="bg-black/40 px-2 py-0.5 rounded text-[8px] font-black text-white uppercase tracking-widest">
												ISO: 400
											</div>
										</div>

										{/* Center Target */}
										<div className="absolute inset-0 flex items-center justify-center opacity-30">
											<div className="w-40 h-40 border-2 border-emerald-500/50 rounded-full flex items-center justify-center">
												<div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
											</div>
										</div>
									</div>

									{showFlash && (
										<div className="absolute inset-0 bg-white z-[100] animate-camera-flash"></div>
									)}

									<div className="absolute bottom-6 left-0 right-0 flex justify-center space-x-4 px-6 z-30">
										<button
											onClick={() => captureFrame(true)}
											className="flex-[2] bg-emerald-600 text-white py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all border-b-4 border-emerald-800"
										>
											সায়েন্টিফিক স্ক্যান
										</button>
										<button
											onClick={() => captureFrame(false)}
											className="flex-1 bg-white text-slate-900 py-4 rounded-2xl font-black text-xs uppercase shadow-xl active:scale-95 transition-all"
										>
											দ্রুত ফটো
										</button>
										<button
											onClick={stopLiveMode}
											className="p-4 bg-red-600 text-white rounded-2xl shadow-xl active:scale-95"
										>
											✕
										</button>
									</div>
								</div>
							) : selectedMedia ? (
								<div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-emerald-50 shadow-2xl relative bg-black group">
									{mimeType.startsWith("video/") ? (
										<video
											src={selectedMedia}
											className="w-full h-full object-cover"
											controls
										/>
									) : (
										// Fixed image display with proper error handling
										<img
											src={selectedMedia}
											onError={(e) => {
												console.error("Image load failed:", e);
												// Fallback to placeholder if image fails to load
												setSelectedMedia(null);
											}}
											className="w-full h-full object-cover"
											alt="Scan"
											loading="lazy"
										/>
									)}
									<button
										onClick={() => {
											setSelectedMedia(null);
											setPrecisionFields(null);
											setResult(null);
										}}
										className="absolute top-4 right-4 p-2 bg-black/40 backdrop-blur-md rounded-full text-white z-20 opacity-0 group-hover:opacity-100 transition-opacity"
									>
										✕
									</button>
								</div>
							) : (
								<div className="grid grid-cols-2 gap-3 h-full">
									<button
										id="live-cam-btn"
										onClick={startLiveMode}
										className="col-span-2 bg-slate-900 rounded-[2.5rem] border-4 border-slate-800 flex flex-col items-center justify-center space-y-3 hover:bg-black transition-all group overflow-hidden relative"
									>
										<div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform"></div>
										<div className="text-4xl">🔴</div>
										<p className="text-[10px] font-black text-white uppercase tracking-widest">
											{lang === "bn" ? "লাইভ এআই ক্যামেরা" : "Live AI Camera"}
										</p>
									</button>
									<button
										onClick={() => fileInputRef.current?.click()}
										className="col-span-1 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-200 flex flex-col items-center justify-center space-y-2 hover:border-emerald-400 transition-all"
									>
										<div className="text-2xl">🖼️</div>
										<p className="text-[8px] font-black text-slate-400 uppercase">
											{lang === "bn" ? "ছবি আপলোড" : "Upload"}
										</p>
									</button>
									<button
										onClick={() => videoInputRef.current?.click()}
										className="col-span-1 bg-rose-50 rounded-[2rem] border-4 border-dashed border-rose-200 flex flex-col items-center justify-center space-y-2 hover:border-rose-400 transition-all"
									>
										<div className="text-2xl">📹</div>
										<p className="text-[8px] font-black text-rose-600 uppercase">
											{lang === "bn" ? "ভিডিও" : "Video"}
										</p>
									</button>
								</div>
							)}
							<input
								type="file"
								ref={fileInputRef}
								accept="image/*"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										const reader = new FileReader();
										reader.onloadend = () => {
											const result = reader.result as string;
											// Ensure proper data URL format
											if (result && result.startsWith("data:")) {
												setSelectedMedia(result);
												setMimeType(file.type);
												setPrecisionFields(null);
												setResult(null);
											} else {
												console.error("Invalid file data:", result);
											}
										};
										reader.onerror = (error) => {
											console.error("File reading error:", error);
										};
										reader.readAsDataURL(file);
									}
								}}
							/>
							<input
								type="file"
								ref={videoInputRef}
								accept="video/*"
								className="hidden"
								onChange={(e) => {
									const file = e.target.files?.[0];
									if (file) {
										const reader = new FileReader();
										reader.onloadend = () => {
											const result = reader.result as string;
											// Ensure proper data URL format
											if (result && result.startsWith("data:")) {
												setSelectedMedia(result);
												setMimeType(file.type);
												setPrecisionFields(null);
												setResult(null);
											} else {
												console.error("Invalid file data:", result);
											}
										};
										reader.onerror = (error) => {
											console.error("File reading error:", error);
										};
										reader.readAsDataURL(file);
									}
								}}
							/>
							<canvas ref={canvasRef} className="hidden" />
						</div>

						<div className="md:col-span-7 flex flex-col space-y-4">
							<div className="flex-1 bg-slate-900 rounded-[2.5rem] p-6 flex flex-col focus-within:ring-4 ring-emerald-500/30 transition-all shadow-2xl relative overflow-hidden">
								<div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
								<textarea
									value={userQuery}
									onChange={(e) => setUserQuery(e.target.value)}
									placeholder={
										lang === "bn"
											? "লক্ষণগুলো বা অতিরিক্ত তথ্য লিখুন..."
											: "Describe symptoms..."
									}
									className="w-full flex-1 bg-transparent resize-none font-bold text-white placeholder:text-slate-700 outline-none text-lg min-h-[140px] relative z-10"
								/>
								<div className="flex items-center justify-between mt-4 gap-2 relative z-10">
									<button
										onClick={() =>
											isListening
												? recognitionRef.current?.stop()
												: recognitionRef.current?.start()
										}
										className={`p-4 rounded-2xl transition-all shadow-lg ${isListening ? "bg-red-500 text-white animate-pulse" : "bg-white/10 text-emerald-400 hover:bg-white/20"}`}
										title="ভয়েস প্রম্পট"
									>
										<svg
											className="w-6 h-6"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2.5}
												d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 116 0v6a3 3 0 01-3 3z"
											/>
										</svg>
									</button>
									<button
										id="deep-audit-btn"
										onClick={() => handleAnalyze(true)}
										disabled={isLoading || (!selectedMedia && !isLiveMode)}
										className="flex-1 bg-emerald-600 text-white py-5 rounded-[1.8rem] font-black text-[10px] uppercase shadow-xl hover:bg-emerald-500 transition-all active:scale-95 disabled:opacity-50"
									>
										সায়েন্টিফিক অডিট
									</button>
									<button
										onClick={() => handleAnalyze(false)}
										disabled={isLoading || (!selectedMedia && !isLiveMode)}
										className="flex-1 bg-slate-800 text-white py-5 rounded-[1.8rem] font-black text-[10px] uppercase shadow-xl hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50"
									>
										দ্রুত স্ক্যান
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			{isLoading && (
				<div className="bg-white p-12 rounded-[3.5rem] text-center shadow-2xl flex flex-col items-center space-y-8 animate-fade-in my-8">
					<div className="relative">
						<div className="w-24 h-24 border-[10px] border-emerald-50 border-t-emerald-600 rounded-full animate-spin"></div>
						<div className="absolute inset-0 flex items-center justify-center text-4xl animate-bounce">
							🔬
						</div>
					</div>
					<div className="space-y-2">
						<h3 className="text-2xl font-black text-slate-800 transition-all duration-500">
							{loadingMessages[loadingStep]}
						</h3>
						<div className="w-full max-w-xs mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden mt-4">
							<div
								className="h-full bg-emerald-500 transition-all duration-1000"
								style={{
									width: `${((loadingStep + 1) / loadingMessages.length) * 100}%`,
								}}
							></div>
						</div>
					</div>
				</div>
			)}

			{precisionFields && !isLoading && !result && (
				<DynamicPrecisionForm
					fields={precisionFields}
					lang={lang}
					onSubmit={handlePrecisionSubmit}
					isLoading={isLoading}
					toolProtocol="DAE-SCAN-V5"
				/>
			)}

			{result && !isLoading && (
				<div className="space-y-8 animate-fade-in-up">
					<div
						ref={reportRef}
						className="bg-white rounded-none border-[12px] border-slate-900 p-8 md:p-14 shadow-2xl relative overflow-hidden flex flex-col print:shadow-none print:border-[5px]"
					>
						<div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none rotate-12 select-none text-[8rem] font-black uppercase whitespace-nowrap overflow-hidden">
							Govt Verified Protocol
						</div>
						<div className="flex flex-col md:flex-row justify-between items-start border-b-4 border-slate-900 pb-10 mb-10 gap-8 relative z-10">
							<div className="flex items-center space-x-6">
								<div className="w-24 h-24 bg-slate-900 text-white rounded-full flex flex-col items-center justify-center border-4 border-white shadow-xl rotate-12">
									<span className="text-3xl">🏛️</span>
									<span className="text-[7px] font-black uppercase tracking-tighter mt-1">
										Authentic
									</span>
								</div>
								<div>
									<p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.4em] mb-1">
										Official Agri-Diagnostic Report
									</p>
									<h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter leading-none mb-4">
										শনাক্তকরণ ও সমাধান
									</h2>
									<div className="flex flex-wrap gap-2">
										<span className="bg-slate-900 text-white px-3 py-1 rounded text-[8px] font-black uppercase">
											Ref: BD-AG-{(Math.random() * 10000).toFixed(0)}
										</span>
										<span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded text-[8px] font-black uppercase border border-emerald-100">
											Confidence: {result.confidence}%
										</span>
									</div>
								</div>
							</div>
							<div className="flex flex-col items-end gap-2 print:hidden">
								<div className="flex space-x-2">
									<button
										onClick={() => setIsShareOpen(true)}
										className="p-4 rounded-2xl bg-white text-emerald-600 shadow-xl hover:bg-emerald-50 transition-all active:scale-95 border border-emerald-100"
										title="শেয়ার করুন"
									>
										<svg
											className="w-6 h-6"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2.5}
												d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
											/>
										</svg>
									</button>
									<button
										onClick={() => playSpeech(result.fullText)}
										className={`p-4 rounded-2xl shadow-xl transition-all ${isSpeaking ? "bg-rose-500 text-white animate-pulse" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
										title="Read Aloud"
									>
										{isSpeaking ? (
											<svg
												className="w-6 h-6"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2.5}
													d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
												/>
											</svg>
										) : (
											<svg
												className="w-6 h-6"
												fill="none"
												viewBox="0 0 24 24"
												stroke="currentColor"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2.5}
													d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
												/>
											</svg>
										)}
									</button>
								</div>
							</div>
						</div>

						<div className="prose prose-slate max-w-none">
							{result.diagnosis && (
								<div className="mb-6">
									<h3 className="text-2xl font-bold text-emerald-700 flex items-center gap-2">
										<span>🔍</span> {lang === "bn" ? "শনাক্তকরণ" : "Diagnosis"}
									</h3>
									<p className="text-lg">{result.diagnosis}</p>
								</div>
							)}

							{result.category && (
								<div className="mb-6">
									<h3 className="text-xl font-bold text-slate-800">
										{lang === "bn" ? "বিভাগ" : "Category"}
									</h3>
									<span
										className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
											result.category === "Pest"
												? "bg-amber-100 text-amber-800"
												: result.category === "Disease"
													? "bg-rose-100 text-rose-800"
													: result.category === "Deficiency"
														? "bg-blue-100 text-blue-800"
														: "bg-slate-100 text-slate-800"
										}`}
									>
										{result.category}
									</span>
								</div>
							)}

							{result.confidence > 0 && (
								<div className="mb-6">
									<h3 className="text-xl font-bold text-slate-800">
										{lang === "bn" ? "বিশ্বাসযোগ্যতা" : "Confidence"}
									</h3>
									<div className="w-full bg-slate-200 rounded-full h-3">
										<div
											className="bg-emerald-500 h-3 rounded-full transition-all duration-1000"
											style={{ width: `${result.confidence}%` }}
										></div>
									</div>
									<p className="text-sm mt-1">{result.confidence}%</p>
								</div>
							)}

							{result.advisory && (
								<div className="mb-6">
									<h3 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
										<span>🛠️</span>{" "}
										{lang === "bn"
											? "ব্যবস্থাপনা প্রটোকল"
											: "Management Protocol"}
									</h3>
									<div className="bg-slate-50 p-4 rounded-lg whitespace-pre-line">
										{result.advisory}
									</div>
								</div>
							)}

							{result.officialSource && (
								<div className="mb-6">
									<h3 className="text-xl font-bold text-slate-800">
										{lang === "bn" ? "অফিসিয়াল উৎস" : "Official Source"}
									</h3>
									<p className="italic">{result.officialSource}</p>
								</div>
							)}

							{result.groundingChunks && result.groundingChunks.length > 0 && (
								<div className="mt-8 pt-6 border-t border-slate-200">
									<h3 className="text-xl font-bold text-slate-800 mb-3">
										{lang === "bn" ? "তথ্যসূত্র" : "Sources"}
									</h3>
									<ul className="space-y-2">
										{result.groundingChunks.slice(0, 3).map((chunk: any, i) => (
											<li key={i} className="flex items-start gap-2">
												<span className="text-emerald-500 mt-1">•</span>
												{chunk.snippet && (
													<div>
														<p className="font-medium text-slate-700">
															{chunk.snippet}
														</p>
														{chunk.url && (
															<a
																href={chunk.url}
																target="_blank"
																rel="noopener noreferrer"
																className="text-emerald-600 text-sm hover:underline"
															>
																{chunk.url}
															</a>
														)}
													</div>
												)}
											</li>
										))}
										{result.groundingChunks.length > 3 && (
											<li className="text-sm text-slate-500">
												+ {result.groundingChunks.length - 3} more sources
											</li>
										)}
									</ul>
								</div>
							)}
						</div>

						<div className="mt-10 pt-8 border-t border-slate-200 flex flex-wrap gap-3">
							<button
								onClick={handleSaveToHistory}
								disabled={isSaving}
								className="px-6 py-3 bg-emerald-600 text-white rounded-full font-bold text-sm hover:bg-emerald-500 transition-all disabled:opacity-50"
							>
								{isSaving
									? lang === "bn"
										? "সংরক্ষণ করা হচ্ছে..."
										: "Saving..."
									: lang === "bn"
										? "রিপোর্ট সংরক্ষণ করুন"
										: "Save Report"}
							</button>
							<button
								onClick={() => onNavigate?.(View.HOME)}
								className="px-6 py-3 bg-slate-200 text-slate-800 rounded-full font-bold text-sm hover:bg-slate-300 transition-all"
							>
								{lang === "bn" ? "হোমে ফিরুন" : "Back to Home"}
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
};

export default Analyzer;
