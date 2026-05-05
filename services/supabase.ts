// services/supabase.ts
import { createClient } from "@supabase/supabase-js";
import { SavedReport } from "../types";

// The Supabase URL for project nmngzjrrysjzuxfcklrk
const supabaseUrl = "https://nmngzjrrysjzuxfcklrk.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "";

export const supabase = supabaseKey
	? createClient(supabaseUrl, supabaseKey)
	: null;

/**
 * Synchronize user profile data with Supabase.
 */
export const syncUserProfile = async (user: any) => {
	if (!supabase || !user.uid) return null;

	try {
		const { data, error } = await supabase
			.from("users")
			.upsert({ id: user.uid, ...user }, { onConflict: "id" });

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
		const { data, error } = await supabase.from("reports").insert([
			{
				id: report.id,
				user_id: userId,
				type: report.type,
				title: report.title,
				content: report.content,
				icon: report.icon,
				timestamp: report.timestamp,
				audio_base64: report.audioBase64,
				created_at: new Date().toISOString(),
			},
		]);

		if (error) console.error("Supabase Report Save Error:", error);
		return data;
	} catch (err) {
		console.error("Supabase Report Save Exception:", err);
		return null;
	}
};

/**
 * Fetch user reports from Supabase.
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

// Export storage functions separately
export * from "./supabaseStorage";
