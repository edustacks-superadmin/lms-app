import { headers } from "next/headers";
import { supabaseAdmin } from "../../lib/supabase";

/**
 * Fetches the institute settings based on the hostname from the request headers.
 * This is a server-side only function.
 */
export async function fetchInstituteServer() {
    const headersList = await headers();
    const host = headersList.get("host") || "";

    // Remove port if present
    const hostname = host.split(':')[0];
    let currentSlug = "demo";

    if (hostname.includes("localhost") || hostname.includes("127.0.0.1")) {
        if (hostname.endsWith(".localhost")) {
            currentSlug = hostname.split(".")[0];
        } else {
            currentSlug = "demo";
        }
    } else {
        // Handle www prefix
        const cleanHost = hostname.startsWith('www.') ? hostname.slice(4) : hostname;
        const parts = cleanHost.split(".");

        // e.g. "school1.myapp.com" -> parts[0] = "school1"
        // e.g. "maheshiesacademy.edustacks.co.in" -> parts[0] = "maheshiesacademy"
        if (parts.length > 2) {
            currentSlug = parts[0];
        }
    }

    try {
        const { data } = await supabaseAdmin
            .from("institute_settings")
            .select("*")
            .eq("slug", currentSlug)
            .single();

        return data || null;
    } catch (error) {
        console.error("Error fetching institute server-side:", error);
        return null;
    }
}
