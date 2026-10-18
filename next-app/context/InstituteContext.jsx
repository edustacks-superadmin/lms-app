'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const InstituteContext = createContext();

export const useInstitute = () => useContext(InstituteContext);

export const InstituteProvider = ({ children, initialInstitute = null }) => {
    const [institute, setInstitute] = useState(initialInstitute);
    const [loading, setLoading] = useState(!initialInstitute);
    const [error, setError] = useState(null);

    const fetchInstitute = async () => {
        // If we already have initial data and haven't fetched yet, we might want to skip or background update.
        // For now, let's keep the fetch but only set loading true if we have no data.
        if (!institute) setLoading(true);
        try {
            // 1. Get Subdomain
            let hostname = window.location.hostname;
            let currentSlug = 'demo'; // Default for localhost or main domain

            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                currentSlug = 'demo';
            } else if (hostname.endsWith('.localhost')) {
                // Handle subdomain.localhost (e.g. maheshiesacademy.localhost)
                currentSlug = hostname.split('.')[0];
            } else {
                // Remove www prefix if present
                if (hostname.startsWith('www.')) {
                    hostname = hostname.slice(4);
                }

                // e.g. "school1.myapp.com" -> parts[0] = "school1"
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    currentSlug = parts[0];
                }
            }

            console.log('Resolving Institute for Slug:', currentSlug);

            let { data, error } = await supabase
                .from('institute_settings')
                .select('*')
                .eq('slug', currentSlug)
                .single();

            // Fallback: If specific institute not found (e.g. invalid subdomain/typo), load the first/default one
            if (error || !data) {
                console.warn(`Institute '${currentSlug}' not found, falling back to default/first available.`);
                const { data: firstInst, error: firstError } = await supabase
                    .from('institute_settings')
                    .select('*')
                    .limit(1)
                    .single();

                if (!firstError && firstInst) {
                    data = firstInst;
                    error = null;
                }
            }

            if (error) {
                throw error;
            }

            console.log('Fetched institute settings:', data);

            setInstitute(data || {});
        } catch (err) {
            console.error('Error fetching institute settings:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const updateInstituteSettings = async (settings) => {
        setLoading(true);
        setError(null);
        console.log('Attempting to update institute settings:', settings);

        try {
            // 1. Determine Slug (Reuse logic to ensure we target correct tenant)
            const hostname = window.location.hostname;
            let currentSlug = 'demo';
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                currentSlug = 'demo';
            } else if (hostname.endsWith('.localhost')) {
                currentSlug = hostname.split('.')[0];
            } else {
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    currentSlug = parts[0];
                }
            }

            // 2. Determine ID to update
            let recordId = settings.id || institute?.id;

            // If we don't have an ID yet, try to find it by slug
            if (!recordId) {
                const { data: existingData } = await supabase
                    .from('institute_settings')
                    .select('id')
                    .eq('slug', currentSlug)
                    .single();

                if (existingData) {
                    recordId = existingData.id;
                }
            }

            const { id, ...dataToSave } = settings; // Exclude id from payload
            let result;

            if (recordId) {
                // Update existing record
                console.log('Updating existing record with ID:', recordId);
                result = await supabase
                    .from('institute_settings')
                    .update(dataToSave)
                    .eq('id', recordId);
            } else {
                // Insert new record
                console.log('No existing record found for slug:', currentSlug, '. Inserting new record.');
                result = await supabase
                    .from('institute_settings')
                    .insert([{ ...dataToSave, slug: currentSlug }]);
            }

            console.log('Supabase operation result:', result);

            if (result.error) throw result.error;

            // Refetch to ensure we have the latest data
            await fetchInstitute();

            // Return the data we just saved
            return { success: true, data: { ...institute, ...dataToSave } };
        } catch (err) {
            console.error('Error updating institute settings:', err);
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstitute();
    }, []);

    // Update Favicon, Title, and CSS Variables dynamically
    useEffect(() => {
        if (institute) {
            // Update Favicon - Only if different to prevent flickering/conflicts with server-side metadata
            if (institute.favicon_url) {
                const existingLink = document.querySelector("link[rel*='icon']");
                if (!existingLink || existingLink.getAttribute('href') !== institute.favicon_url) {
                    const link = existingLink || document.createElement('link');
                    link.type = 'image/x-icon';
                    link.rel = 'shortcut icon';
                    link.href = institute.favicon_url;
                    if (!existingLink) {
                        document.getElementsByTagName('head')[0].appendChild(link);
                    }
                }
            }

            // Update Title
            if (institute.name) {
                document.title = institute.name;
            }

            // Update CSS Variables
            if (institute.theme_color) {
                document.documentElement.style.setProperty('--primary-color', institute.theme_color);

                // Calculate contrast text color
                const hex = institute.theme_color.replace('#', '');
                // Handle 3-digit hex
                const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.substring(0, 2), 16);
                const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.substring(2, 4), 16);
                const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.substring(4, 6), 16);
                const brightness = ((r * 299) + (g * 587) + (b * 114)) / 1000;
                const textColor = brightness > 155 ? '#000000' : '#ffffff'; // Threshold 155 is a good balance

                document.documentElement.style.setProperty('--button-text-color', textColor);
            }
        }
    }, [institute]);

    return (
        <InstituteContext.Provider value={{ institute, loading, error, updateInstituteSettings, fetchInstitute }}>
            {children}
        </InstituteContext.Provider>
    );
};
