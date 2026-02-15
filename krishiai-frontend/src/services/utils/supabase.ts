import { createClient } from "@supabase/supabase-js";
import { User, SavedReport } from "../../types";

// The Supabase URL for project nmngzjrrysjzuxfcklrk
const supabaseUrl = "https://nmngzjrrysjzuxfcklrk.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "";

/**
 * We only initialize the client if the Key is provided.
 * This prevents the "Uncaught Error" crash during module loading.
 */
export const supabase = supabaseKey
	? createClient(supabaseUrl, supabaseKey)
	: null;

/**
 * Synchronize user profile data with Supabase.
 */
export const syncUserProfile = async (user: User) => {
	if (!supabase || !user.uid) return null;

	try {
		const { data, error } = await supabase.from("profiles").upsert(
			{
				id: user.uid,
				display_name: user.displayName,
				mobile: user.mobile,
				role: user.role,
				farm_location: user.farmLocation,
				progress: user.progress,
				preferred_categories: user.preferredCategories,
				updated_at: new Date().toISOString(),
			},
			{ onConflict: "id" },
		);

		if (error) console.error("Supabase Profile Sync Error:", error);
		return data;
	} catch (err) {
		console.error("Supabase Profile Sync Exception:", err);
		return null;
	}
};

/**
 * Save a diagnostic or advisory report to Supabase.
 */
export const saveReportToSupabase = async (
	userId: string,
	report: SavedReport,
) => {
	if (!supabase) return null;

	try {
		const { data, error } = await supabase.from("reports").insert({
			id: report.id,
			user_id: userId,
			timestamp: new Date(report.timestamp).toISOString(),
			type: report.type,
			title: report.title,
			content: report.content,
			audio_base64: report.audioBase64,
			image_url: report.imageUrl,
			icon: report.icon,
		});

		if (error) console.error("Supabase Report Save Error:", error);
		return data;
	} catch (err) {
		console.error("Supabase Report Save Exception:", err);
		return null;
	}
};

/**
 * Get or create user in Supabase.
 */
export const getOrCreateUser = async (deviceId: string) => {
	if (!supabase) return null;

	try {
		// First, try to get the existing user
		let { data: existingUser, error: fetchError } = await supabase
			.from("profiles")
			.select("*")
			.eq("id", deviceId)
			.single();

		if (fetchError && fetchError.code !== "PGRST116") {
			// If there's an error other than "row not found", log it
			console.error("Supabase Fetch User Error:", fetchError);
		}

		if (existingUser) {
			// User exists, return it
			return existingUser;
		} else {
			// User doesn't exist, create a new one
			const newUser = {
				id: deviceId,
				display_name: "কৃষক বন্ধু",
				role: "farmer_entrepreneur",
				progress: {
					rank: "নবিশ কৃষক",
					level: 1,
					xp: 0,
					streak: 0,
					skills: { soil: 0, protection: 0, technology: 0 },
				},
				my_crops: [],
				saved_reports: [],
				preferred_categories: ["cereals", "vegetables"],
				settings: {
					theme: "light",
					notifications: { weather: true, market: true, crop_health: true },
				},
			};

			const { data: insertedUser, error: insertError } = await supabase
				.from("profiles")
				.insert([newUser])
				.select()
				.single();

			if (insertError) {
				console.error("Supabase Create User Error:", insertError);
				return null;
			}

			return insertedUser;
		}
	} catch (err) {
		console.error("Supabase GetOrCreate User Exception:", err);
		return null;
	}
};

/**
 * Fetch all reports for a specific user.
 */
export const fetchUserReports = async (userId: string) => {
	if (!supabase) return [];

	try {
		const { data, error } = await supabase
			.from("reports")
			.select("*")
			.eq("user_id", userId)
			.order("timestamp", { ascending: false });

		if (error) {
			console.error("Supabase Fetch Error:", error);
			return [];
		}
		return data;
	} catch (err) {
		console.error("Supabase Fetch Exception:", err);
		return [];
	}
};
