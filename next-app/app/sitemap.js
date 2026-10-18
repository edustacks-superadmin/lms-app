
import { supabaseAdmin } from "../lib/supabase";
import { fetchInstituteServer } from "../lib/server/institute";
import { headers } from "next/headers";

export default async function sitemap() {
    const institute = await fetchInstituteServer();
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    if (!institute) {
        return [];
    }


    // Fetch all public posts
    const { data: posts } = await supabaseAdmin
        .from("posts")
        .select("id, slug, publication_date, created_at")
        .eq("access_control", "Public")
        .eq("institute_id", institute.id)
        .lte("publication_date", new Date().toISOString())
        .eq("is_deleted", false);

    const postEntries = (posts || []).map((post) => ({
        url: `${baseUrl}/posts/${post.slug || post.id}`,
        lastModified: post.publication_date || post.created_at,
        changeFrequency: "weekly",
        priority: 0.7,
    }));

    return [
        {
            url: baseUrl,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 1,
        },
        {
            url: `${baseUrl}/store`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.9,
        },
        {
            url: `${baseUrl}/login`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/student/signup`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/contact-us`,
            lastModified: new Date(),
            changeFrequency: "monthly",
            priority: 0.7,
        },
        {
            url: `${baseUrl}/achievers`,
            lastModified: new Date(),
            changeFrequency: "weekly",
            priority: 0.8,
        },
        {
            url: `${baseUrl}/results`,
            lastModified: new Date(),
            changeFrequency: "daily",
            priority: 0.8,
        },
        ...postEntries,
    ];
}
