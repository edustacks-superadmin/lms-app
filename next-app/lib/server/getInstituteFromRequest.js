import { headers } from "next/headers";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Gets institute settings from the request headers (subdomain).
 * For use in API routes.
 * 
 * @param {Request} request - The incoming request
 * @returns {Promise<Object|null>} Institute settings or null
 */
export async function getInstituteFromRequest(request) {
    try {
        // Get host from request URL or headers
        const url = new URL(request.url);
        const host = url.host || '';

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

        let settings = await prisma.institute_settings.findFirst({
            where: { slug: currentSlug }
        });

        // Fallback to institute ID 10 if slug not found (for local development)
        if (!settings) {
            settings = await prisma.institute_settings.findFirst({
                where: { id: 10 }
            });
        }

        return settings || null;
    } catch (error) {
        console.error("Error getting institute from request:", error);
        return null;
    }
}

/**
 * Gets institute ID from request, with fallback
 * 
 * @param {Request} request - The incoming request
 * @returns {Promise<number>} Institute ID
 */
export async function getInstituteIdFromRequest(request) {
    const institute = await getInstituteFromRequest(request);
    return institute?.id || 10; // Fallback to 10 for backwards compatibility
}
