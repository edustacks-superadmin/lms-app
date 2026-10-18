import Login from '../../components/Login';
import { supabaseAdmin } from '../../lib/supabase';
import { headers } from 'next/headers';

// Helper to fetch institute serverside (copied from layout.js to avoid circular deps if any)
async function fetchInstituteServer() {
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

export async function generateMetadata() {
    const institute = await fetchInstituteServer();

    return {
        title: `Login - ${institute?.name || 'Edustacks'}`,
        description: `Login to your account at ${institute?.name || 'Edustacks'}`,
        alternates: {
            canonical: '/login',
        },
    };
}

export default function LoginPage() {
    return <Login />;
}
