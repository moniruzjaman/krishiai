// components/OptimizedAnalyzer.tsx
import React, { useState, useRef, useEffect } from "react";
import { useSpeech } from "../App";
import { costAwareAnalyzer } from "../services/modelService";
import { directAnalysisEnhancer } from "../services/directAnalysisEnhancer";
import { AnalysisResult } from "../types";

interface OptimizedAnalyzerProps {
	onAction?: () => void;
	onSaveReport?: (report: Omit<AnalysisResult, "id" | "timestamp">) => void;
	onShowFeedback?: () => void;
	onBack?: () => void;
	onNavigate?: (view: any) => void;
	userRank?: string;
	userCrops?: any[];
	lang: string;
}

const OptimizedAnalyzer: React.FC<OptimizedAnalyzerProps> = ({
	onAction,
	onSaveReport,
	onShowFeedback,
	onBack,
	onNavigate,
	userRank,
	userCrops,
	lang,
}) => {
	const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
	const [mimeType, setMimeType] = useState<string>("");
	const [result, setResult] = useState<AnalysisResult | null>(null);
	const [isLoading, setIsLoading] = useState(false);
	const [loadingStep, setLoadingStep] = useState(0);
	const [isLiveMode, setIsLiveMode] = useState(false);
	const [showFlash, setShowFlash] = useState(false);
	const [cropFamily, setCropFamily] = useState("General");
	const [userQuery, setUserQuery] = useState("");

	const videoRef = useRef<HTMLVideoElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const mediaStreamRef = useRef<MediaStream | null>(null);

	// Simulate loading steps
	useEffect(() => {
		let interval: NodeJS.Timeout;
		if (isLoading) {
			interval = setInterval(() => {
				setLoadingStep((prev) => (prev + 1) % 4);
			}, 3000);
		}
		return () => clearInterval(interval);
	}, [isLoading]);

	const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				const base64 = event.target?.result as string;
				setSelectedMedia(base64);
				setMimeType(file.type);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			const reader = new FileReader();
			reader.onload = (event) => {
				const base64 = event.target?.result as string;
				setSelectedMedia(base64);
				setMimeType(file.type);
			};
			reader.readAsDataURL(file);
		}
	};

	const startLiveCapture = async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: { width: 640, height: 480 },
				audio: false,
			});
			mediaStreamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
				setIsLiveMode(true);
			}
		} catch (err) {
			console.error("Error accessing camera:", err);
		}
	};

	const stopLiveCapture = () => {
		if (mediaStreamRef.current) {
			mediaStreamRef.current.getTracks().forEach((track) => track.stop());
			mediaStreamRef.current = null;
		}
		setIsLiveMode(false);
	};

	const captureFrame = () => {
		if (!videoRef.current || !canvasRef.current) return;

		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		const video = videoRef.current;

		canvas.width = video.videoWidth;
		canvas.height = video.videoHeight;

		ctx?.drawImage(video, 0, 0);

		const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
		setSelectedMedia(dataUrl);
		setMimeType("image/jpeg");
		setShowFlash(true);

		setTimeout(() => setShowFlash(false), 500);
	};

	const analyzeImage = async () => {
		if (!selectedMedia) return;

		setIsLoading(true);
		setResult(null);
		setLoadingStep(0);

		try {
			const base64 = selectedMedia.split(",")[1];

			// Analyze with cost-aware analyzer
			const analysis = await costAwareAnalyzer.analyzeWithCostControl(
				base64,
				mimeType,
				{
					cropFamily,
					userRank,
					query: userQuery,
					lang,
					weather: undefined,
					budget: "free",
				},
			);

			// Enhance with direct analysis enhancer
			const enhancedResult = directAnalysisEnhancer.enhanceAnalysis(analysis, {
				cropFamily,
				userQuery,
				lang,
				confidenceThreshold: 65,
			});

			setResult(enhancedResult);

			// Auto-play speech if enabled
			if (onAction) onAction();
			if (onShowFeedback) onShowFeedback();
		} catch (error) {
			console.error("Analysis failed:", error);
			// Fallback to rule-based analysis
			const fallbackResult: AnalysisResult = {
				confidence: 40,
				diagnosis:
					lang === "bn"
						? "এআই স্ক্যানার বর্তমানে উপলব্ধ নয়।"
						: "AI Scanner is currently unavailable.",
				category: "Other",
				advisory:
					lang === "bn"
						? "দয়া করে আপনার স্থানীয় কৃষি প্রসারণ অফিসের সাথে যোগাযোগ করুন।"
						: "Please contact your local agricultural extension office.",
				fullText:
					lang === "bn"
						? "এআই স্ক্যানার বর্তমানে উপলব্ধ নয়। দয়া করে স্থানীয় কৃষি প্রসারণ অফিসের সাথে যোগাযোগ করুন।"
						: "AI Scanner is currently unavailable. Please contact your local agricultural extension office.",
				officialSource: "Krishi AI Fallback System",
				groundingChunks: [],
			};
			setResult(fallbackResult);
		} finally {
			setIsLoading(false);
		}
	};

	const handleSaveReport = () => {
		if (result && onSaveReport) {
			// Create report without id and timestamp
			const { id, timestamp, ...reportData } = result;
			onSaveReport(reportData);
		}
	};

	return (
		<div className="max-w-4xl mx-auto p-4 pb-32 font-sans min-h-screen">
			<div className="flex items-center space-x-4 mb-8">
				<button
					onClick={onBack}
					className="p-3 bg-white rounded-2xl shadow-sm border hover:bg-slate-50 transition-all active:scale-90 text-slate-400"
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
						এআই স্ক্যানার
					</h1>
					<p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-full inline-block border border-emerald-100">
						Real-time Crop Diagnosis
					</p>
				</div>
				<button
					onClick={() => onNavigate?.("CABI_TRAINING")}
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
							d="M12 6v6m0 0v6m0-6h6m-6 0H6"
						/>
					</svg>
				</button>
			</div>

			<div className="bg-white rounded-[3rem] p-8 shadow-xl">
				{/* Media Selection */}
				<div className="mb-8">
					<h2 className="text-xl font-black text-slate-800 mb-4">
						ছবি/ভিডিও আপলোড করুন
					</h2>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
						<label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 cursor-pointer transition-colors">
							<input
								type="file"
								accept="image/*"
								onChange={handleImageUpload}
								className="hidden"
							/>
							<div className="text-4xl mb-2">📷</div>
							<span className="text-sm font-medium text-slate-700">
								ছবি আপলোড
							</span>
							<span className="text-xs text-slate-500 mt-1">JPG, PNG</span>
						</label>

						<label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-300 rounded-xl hover:border-emerald-500 cursor-pointer transition-colors">
							<input
								type="file"
								accept="video/*"
								onChange={handleVideoUpload}
								className="hidden"
							/>
							<div className="text-4xl mb-2">🎥</div>
							<span className="text-sm font-medium text-slate-700">
								ভিডিও আপলোড
							</span>
							<span className="text-xs text-slate-500 mt-1">MP4, MOV</span>
						</label>

						<div className="flex flex-col items-center justify-center">
							<button
								onClick={startLiveCapture}
								disabled={isLiveMode}
								className={`w-full p-6 border-2 border-dashed border-slate-300 rounded-xl transition-colors ${
									isLiveMode
										? "border-red-500 bg-red-50 text-red-700"
										: "border-slate-300 hover:border-emerald-500"
								}`}
							>
								<div className="text-4xl mb-2">📹</div>
								<span className="text-sm font-medium">
									{isLiveMode ? "ক্যামেরা বন্ধ করুন" : "লাইভ ক্যামেরা"}
								</span>
							</button>

							{isLiveMode && (
								<button
									onClick={captureFrame}
									className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
								>
									ফ্রেম ক্যাপচার
								</button>
							)}
						</div>
					</div>
				</div>

				{/* Live Camera View */}
				{isLiveMode && (
					<div className="mb-8">
						<div className="relative aspect-video rounded-xl overflow-hidden border-4 border-emerald-500 shadow-2xl">
							<video
								ref={videoRef}
								autoPlay
								playsInline
								muted
								className="w-full h-full object-cover"
							/>

							{showFlash && (
								<div className="absolute inset-0 bg-white z-[100] animate-camera-flash"></div>
							)}

							<div className="absolute bottom-4 left-4 right-4 flex justify-between">
								<button
									onClick={stopLiveCapture}
									className="px-4 py-2 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition-colors"
								>
									বন্ধ করুন
								</button>
								<button
									onClick={captureFrame}
									className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
								>
									ফ্রেম ক্যাপচার
								</button>
							</div>
						</div>
					</div>
				)}

				{/* Crop Selection */}
				<div className="mb-8">
					<h2 className="text-xl font-black text-slate-800 mb-4">
						ফসলের ধরণ নির্বাচন করুন
					</h2>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
						{["General", "Rice", "Wheat", "Potato", "Vegetables", "Fruits"].map(
							(crop) => (
								<button
									key={crop}
									onClick={() => setCropFamily(crop)}
									className={`p-3 rounded-xl border transition-colors ${
										cropFamily === crop
											? "border-emerald-500 bg-emerald-50 text-emerald-700"
											: "border-slate-200 hover:border-emerald-300 hover:bg-slate-50"
									}`}
								>
									{crop}
								</button>
							),
						)}
					</div>
				</div>

				{/* User Query */}
				<div className="mb-8">
					<h2 className="text-xl font-black text-slate-800 mb-4">
						অতিরিক্ত তথ্য (ঐচ্ছিক)
					</h2>
					<textarea
						value={userQuery}
						onChange={(e) => setUserQuery(e.target.value)}
						placeholder="উদাহরণ: পাতায় হলুদ ছোপ দেখা যাচ্ছে, গাছ শুকিয়ে যাচ্ছে..."
						className="w-full p-4 border border-slate-200 rounded-xl focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
						rows={3}
					/>
				</div>

				{/* Analyze Button */}
				<div className="flex justify-center mb-8">
					<button
						onClick={analyzeImage}
						disabled={!selectedMedia || isLoading}
						className={`px-12 py-5 rounded-[2.5rem] font-black text-lg uppercase tracking-wider transition-all ${
							!selectedMedia || isLoading
								? "bg-slate-200 text-slate-500 cursor-not-allowed"
								: "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-lg"
						}`}
					>
						{isLoading ? "বিশ্লেষণ চলছে..." : "এআই স্ক্যান করুন"}
					</button>
				</div>

				{/* Results */}
				{result && (
					<div className="animate-fade-in">
						<div className="bg-slate-50 rounded-2xl p-6 mb-6">
							<div className="flex items-start justify-between mb-4">
								<div className="flex items-center space-x-3">
									<div
										className={`w-3 h-3 rounded-full ${
											result.confidence >= 70
												? "bg-green-500"
												: result.confidence >= 50
													? "bg-yellow-500"
													: "bg-red-500"
										}`}
									></div>
									<h3 className="text-lg font-black text-slate-800">
										{result.diagnosis}
									</h3>
								</div>
								<span className="text-sm font-bold bg-slate-200 px-3 py-1 rounded-full">
									{result.confidence}% নির্ভরযোগ্য
								</span>
							</div>

							<div className="space-y-4">
								<div>
									<h4 className="font-bold text-slate-700 mb-2">বিশ্লেষণ:</h4>
									<p className="text-slate-600">{result.advisory}</p>
								</div>

								<div>
									<h4 className="font-bold text-slate-700 mb-2">উৎস:</h4>
									{result.officialSource && (
										<p className="text-sm text-slate-500">
											{result.officialSource}
										</p>
									)}
								</div>
							</div>
						</div>

						{/* Save Report */}
						<div className="flex justify-end">
							<button
								onClick={handleSaveReport}
								className="px-6 py-3 bg-slate-900 text-white rounded-xl font-black hover:bg-slate-800 transition-colors"
							>
								রিপোর্ট সংরক্ষণ করুন
							</button>
						</div>
					</div>
				)}

				{/* Loading State */}
				{isLoading && (
					<div className="text-center py-12">
						<div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
						<h3 className="text-xl font-black text-slate-800 mb-2">
							এআই স্ক্যান করা হচ্ছে...
						</h3>
						<p className="text-slate-500">
							{loadingStep === 0 && "ছবি প্রসেস করা হচ্ছে..."}
							{loadingStep === 1 && "AI মডেল বিশ্লেষণ করছে..."}
							{loadingStep === 2 && "বাংলাদেশি কৃষি ডেটাবেস মিলানো হচ্ছে..."}
							{loadingStep === 3 && "চূড়ান্ত ডায়াগনোসিস তৈরি করা হচ্ছে..."}
						</p>
					</div>
				)}
			</div>

			{/* Hidden canvas for frame capture */}
			<canvas ref={canvasRef} className="hidden" />
		</div>
	);
};

export default OptimizedAnalyzer;
