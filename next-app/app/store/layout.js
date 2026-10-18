import { headers } from "next/headers";
import { supabaseAdmin } from "../../lib/supabase";

export async function generateMetadata() {
    const headersList = await headers();
    const host = headersList.get("host") || "edustacks.co.in";
    const protocol = host.includes("localhost") ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    // Fetch institute info to be safe, though root layout has it.
    // We can just set the title relative to template.

    return {
        title: "Store - Browse Courses & Products",
        description: "Explore our collection of online courses, test series, and digital products.",
        alternates: {
            canonical: '/store',
        },
        openGraph: {
            title: "Store - Browse Courses & Products",
            url: `${baseUrl}/store`,
        }
    };
}

export default function StoreLayout({ children }) {
    return (
        <>
            {children}
        </>
    );
}
