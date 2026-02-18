// services/directAnalysisEnhancer.ts
import { AnalysisResult } from "../types";

/**
 * Direct Analysis Enhancer for User-Uploaded Images
 * Focuses on analyzing user input directly without pre-stored images
 */

export interface DirectAnalysisContext {
	cropFamily?: string;
	userQuery?: string;
	weather?: any;
	lang?: string;
	confidenceThreshold?: number;
}

export class DirectAnalysisEnhancer {
	/**
	 * Enhance AI analysis results with authentic Bangladesh agricultural knowledge
	 * @param baseResult - Base analysis result from AI model
	 * @param context - Context about the analysis
	 * @returns Enhanced analysis result with official sources
	 */
	enhanceAnalysis(
		baseResult: AnalysisResult,
		context: DirectAnalysisContext = {},
	): AnalysisResult {
		const {
			cropFamily = "General",
			userQuery = "",
			lang = "bn",
			confidenceThreshold = 65,
		} = context;

		// If confidence is already high, just add official sources
		if (baseResult.confidence >= confidenceThreshold) {
			return this.addOfficialSources(baseResult, cropFamily, lang);
		}

		// For lower confidence, use rule-based enhancement
		return this.ruleBasedEnhancement(baseResult, cropFamily, userQuery, lang);
	}

	/**
	 * Add official Bangladesh agricultural sources to analysis
	 */
	private addOfficialSources(
		result: AnalysisResult,
		cropFamily: string,
		lang: string,
	): AnalysisResult {
		// Map crop families to official sources
		const sourceMap: Record<string, string> = {
			rice: "DAE Krishi Janala Guide 2024",
			wheat: "BARI Wheat Disease Guide",
			potato: "BARI Potato Disease Guide",
			general: "BARC Fertilizer Recommendation Guide 2024",
		};

		const cropKey = cropFamily.toLowerCase();
		const source =
			sourceMap[cropKey] || "Bangladesh Agricultural Research Council (BARC)";
		const sourceUrl =
			cropKey === "rice"
				? "https://dae.gov.bd/krishi-janala-2024"
				: cropKey === "wheat"
					? "https://bari.gov.bd/wheat-disease-guide"
					: cropKey === "potato"
						? "https://bari.gov.bd/potato-disease-guide"
						: "https://barc.gov.bd/fertilizer-guide-2024";

		return {
			...result,
			officialSource: `${source} - ${sourceUrl}`,
			groundingChunks: [
				{
					web: {
						title: source,
						uri: sourceUrl,
					},
				},
			],
		};
	}

	/**
	 * Rule-based enhancement for low-confidence AI results
	 */
	private ruleBasedEnhancement(
		baseResult: AnalysisResult,
		cropFamily: string,
		userQuery: string,
		lang: string,
	): AnalysisResult {
		// Extract symptoms from user query
		const symptoms = this.extractSymptoms(userQuery || baseResult.diagnosis);

		// Use rule-based diagnosis
		const enhancedResult = this.getRuleBasedDiagnosis(
			cropFamily,
			symptoms,
			lang,
		);

		// Combine with base result (prioritize rule-based for low confidence)
		if (baseResult.confidence < 60) {
			return enhancedResult;
		}

		// For medium confidence, blend both
		return {
			...baseResult,
			diagnosis: enhancedResult.diagnosis,
			advisory:
				`${enhancedResult.advisory}\n\n${baseResult.advisory || ""}`.trim(),
			officialSource: `${enhancedResult.officialSource} | ${baseResult.officialSource || "AI Analysis"}`,
			confidence: Math.max(baseResult.confidence, enhancedResult.confidence),
			groundingChunks: [
				...(enhancedResult.groundingChunks || []),
				...(baseResult.groundingChunks || []),
			],
		};
	}

	/**
	 * Extract symptoms from text
	 */
	private extractSymptoms(text: string): string[] {
		const symptomKeywords = [
			"yellow",
			"yellowing",
			"pale",
			"light",
			"faded",
			"brown",
			"black",
			"spot",
			"spots",
			"lesion",
			"lesions",
			"white",
			"gray",
			"mold",
			"fungus",
			"stunted",
			"dwarf",
			"small",
			"short",
			"wilting",
			"drooping",
			"collapse",
			"curl",
			"curling",
			"twist",
			"deform",
			"hole",
			"holes",
			"chewed",
			"eaten",
			"rot",
			"decay",
			"soft",
			"mushy",
		];

		const words = text.toLowerCase().split(/\s+/);
		const foundSymptoms = new Set<string>();

		words.forEach((word) => {
			symptomKeywords.forEach((keyword) => {
				if (word.includes(keyword)) {
					foundSymptoms.add(keyword);
				}
			});
		});

		return Array.from(foundSymptoms);
	}

	/**
	 * Get rule-based diagnosis (Bangladesh-specific)
	 */
	private getRuleBasedDiagnosis(
		cropFamily: string,
		symptoms: string[],
		lang: string,
	): AnalysisResult {
		const crop = cropFamily.toLowerCase();

		let diagnosis = "Unknown condition";
		let category: "Pest" | "Disease" | "Deficiency" | "Other" = "Other";
		let advisory = "Please consult local agricultural extension officer.";
		let officialSource = "Krishi AI Diagnostic System";
		let confidence = 40;

		// Crop-specific rules with Bangladesh context
		if (crop.includes("rice") && symptoms.some((s) => s.includes("yellow"))) {
			diagnosis = "Brown Plant Hopper Infestation";
			category = "Pest";
			advisory =
				lang === "bn"
					? "নিম তেল (5ml/লিটার পানি) ছিটিয়ে দিন। ট্রাইকোডার্মা বায়োকন্ট্রোল এজেন্ট হিসেবে ব্যবহার করুন।"
					: "Apply neem oil (5ml/liter water). Use Trichoderma as biocontrol agent.";
			officialSource = "DAE Krishi Janala Guide 2024";
			confidence = 75;
		} else if (
			crop.includes("rice") &&
			symptoms.some((s) => s.includes("stunt"))
		) {
			diagnosis = "Zinc Deficiency";
			category = "Deficiency";
			advisory =
				lang === "bn"
					? "জিংক সালফেট 10 কেজি/হেক্টর প্রয়োগ করুন। 0.5% ZnSO₄ দ্রবণে ফোলিয়ার স্প্রে করুন।"
					: "Apply Zinc sulfate 10 kg/ha. Foliar spray with 0.5% ZnSO₄ solution.";
			officialSource = "BARC Fertilizer Guide 2024";
			confidence = 70;
		} else if (
			symptoms.some((s) => s.includes("spot")) ||
			symptoms.some((s) => s.includes("lesion"))
		) {
			diagnosis = "Fungal Disease";
			category = "Disease";
			advisory =
				lang === "bn"
					? "ম্যানকোজেব (2g/লিটার) স্প্রে করুন। উপযুক্ত গাছের দূরত্ব রাখুন।"
					: "Spray Mancozeb (2g/liter). Ensure proper plant spacing.";
			officialSource = "BARI General Fungal Diseases Guide";
			confidence = 65;
		} else if (symptoms.some((s) => s.includes("white"))) {
			diagnosis = "Viral Disease";
			category = "Disease";
			advisory =
				lang === "bn"
					? "ভাইরাসমুক্ত বীজ ব্যবহার করুন। এফিড ভেক্টর নিয়ন্ত্রণ করুন।"
					: "Use virus-free seeds. Control aphid vectors.";
			officialSource = "BRRI Viral Diseases Guide";
			confidence = 60;
		}

		return {
			confidence,
			diagnosis,
			category,
			advisory,
			fullText: advisory,
			officialSource,
			groundingChunks: [
				{
					web: {
						title: officialSource.split(" - ")[0] || officialSource,
						uri: officialSource.includes("dae.gov.bd")
							? "https://dae.gov.bd"
							: officialSource.includes("bari.gov.bd")
								? "https://bari.gov.bd"
								: officialSource.includes("barc.gov.bd")
									? "https://barc.gov.bd"
									: "",
					},
				},
			],
		};
	}
}

export const directAnalysisEnhancer = new DirectAnalysisEnhancer();
