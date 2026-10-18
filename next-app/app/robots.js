
import { headers } from "next/headers";

export default async function robots() {
    const headersList = await headers();
    const host = headersList.get("host");
    const protocol = process.env.NODE_ENV === "development" ? "http" : "https";
    const baseUrl = `${protocol}://${host}`;

    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin/", "/student/api/", "/api/external/"],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
