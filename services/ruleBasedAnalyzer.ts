// services/ruleBasedAnalyzer.ts
import { AnalysisResult } from "../types";

// Crop-specific symptom databases (Bangladesh context)
const CROP_SYMPTOM_DB: Record<string, Record<string, string[]>> = {
	rice: {
		yellowing_leaves: [
			"Pest: Brown Plant Hopper",
			"Disease: Bacterial Blight",
			"Deficiency: Nitrogen",
		],
		stunted_growth: [
			"Deficiency: Zinc",
			"Pest: Root Knot Nematode",
			"Disease: Sheath Blight",
		],
		brown_spots: [
			"Disease: Leaf Blast",
			"Pest: Rice Stem Borer",
			"Deficiency: Potassium",
		],
	},
	wheat: {
		yellow_stripes: ["Disease: Stripe Rust", "Deficiency: Iron"],
		white_heads: ["Disease: Fusarium Head Blight", "Pest: Aphids"],
		stunted_plants: ["Deficiency: Phosphorus", "Pest: Soil Insects"],
	},
	potato: {
		black_rot: ["Disease: Black Rot", "Deficiency: Calcium"],
		leaf_curling: ["Pest: Aphids", "Virus: Potato Leaf Roll Virus"],
		tuber_scab: ["Disease: Common Scab", "Deficiency: Boron"],
	},
	general: {
		yellowing: [
			"Deficiency: Nitrogen",
			"Pest: Aphids",
			"Disease: Viral infection",
		],
		wilting: ["Pest: Root damage", "Disease: Wilt disease", "Water stress"],
		spots: [
			"Disease: Fungal infection",
			"Pest: Leaf miner",
			"Deficiency: Magnesium",
		],
	},
};

const BANGLADESH_EXPERT_GUIDELINES = {
	pest_control: [
		"Use neem oil (নিম তেল) for aphids and whiteflies",
		"Apply garlic-chili spray (রসুন-মরিচের স্প্রে) for general pest control",
		"Use Trichoderma (ট্রাইকোডার্মা) for fungal diseases",
	],
	nutrient_management: [
		"Nitrogen deficiency: Apply urea (ইউরিয়া) at 50 kg/ha",
		"Phosphorus deficiency: Apply TSP (TSP) at 30 kg/ha",
		"Potassium deficiency: Apply MOP (MOP) at 20 kg/ha",
	],
};

export const getRuleBasedAnalysis = (
	cropFamily: string,
	symptoms: string[],
): AnalysisResult => {
	// Normalize crop family
	const normalizedCrop = cropFamily.toLowerCase().replace(/\s+/g, "");

	// Find matching symptoms in database
	let matches: string[] = [];

	// Check specific crop first
	if (CROP_SYMPTOM_DB[normalizedCrop]) {
		symptoms.forEach((symptom) => {
			const symptomKey = symptom.toLowerCase().replace(/\s+/g, "");
			if (CROP_SYMPTOM_DB[normalizedCrop][symptomKey]) {
				matches = matches.concat(CROP_SYMPTOM_DB[normalizedCrop][symptomKey]);
			}
		});
	}

	// Check general symptoms if no specific matches
	if (matches.length === 0) {
		symptoms.forEach((symptom) => {
			const symptomKey = symptom.toLowerCase().replace(/\s+/g, "");
			if (CROP_SYMPTOM_DB.general[symptomKey]) {
				matches = matches.concat(CROP_SYMPTOM_DB.general[symptomKey]);
			}
		});
	}

	// Generate analysis result
	const diagnosis =
		matches.length > 0
			? matches[0]
			: `No specific diagnosis found. Please consult local agricultural extension officer.`;

	const category =
		matches.length > 0
			? matches[0].includes("Pest")
				? "Pest"
				: matches[0].includes("Disease")
					? "Disease"
					: "Deficiency"
			: "Other";

	return {
		diagnosis,
		category,
		confidence: matches.length > 0 ? 70 : 40,
		advisory:
			matches.length > 0
				? `Recommended action: ${BANGLADESH_EXPERT_GUIDELINES.pest_control[0]} or ${BANGLADESH_EXPERT_GUIDELINES.nutrient_management[0]}`
				: `Please provide more details or consult local agricultural extension office.`,
		fullText:
			matches.length > 0
				? `Diagnosis: ${diagnosis}. ${BANGLADESH_EXPERT_GUIDELINES.pest_control[0]}`
				: `No specific diagnosis found for ${cropFamily}. Symptoms: ${symptoms.join(", ")}.`,
		officialSource: "Rule-Based Expert System (Bangladesh Agriculture)",
		groundingChunks: [],
	};
};
