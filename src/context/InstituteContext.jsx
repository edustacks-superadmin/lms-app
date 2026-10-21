import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const InstituteContext = createContext();

export const useInstitute = () => useContext(InstituteContext);

export const InstituteProvider = ({ children }) => {
    const [institute, setInstitute] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchInstitute = async () => {
        setLoading(true);
        try {
            // 1. Get Subdomain
            const hostname = window.location.hostname;
            let currentSlug = 'maheshiesacademy'; // Default for localhost or main domain

            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                currentSlug = 'maheshiesacademy';
            } else {
                // e.g. "school1.myapp.com" -> parts[0] = "school1"
                const parts = hostname.split('.');
                if (parts.length > 2) {
                    currentSlug = parts[0].toLowerCase();
                }
            }

            console.log('Resolving Institute for Slug:', currentSlug);

            let { data, error } = await supabase
                .from('institute_settings')
                .select('*')
                .eq('slug', currentSlug)
                .maybeSingle();

            if (!data) {
                console.warn(`Institute for slug "${currentSlug}" not found, falling back to maheshiesacademy`);
                const { data: fallbackData } = await supabase
                    .from('institute_settings')
                    .select('*')
                    .eq('slug', 'maheshiesacademy')
                    .maybeSingle();
                data = fallbackData;
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
            // Check if a record exists
            const { data: existingData, error: fetchError } = await supabase
                .from('institute_settings')
                .select('id');

            console.log('Existing data check:', { existingData, fetchError });

            if (fetchError) {
                throw fetchError;
            }

            const { id, ...dataToSave } = settings; // Exclude id from payload
            console.log('Data to save (excluding id):', dataToSave);

            let result;
            const targetId = institute?.id || (existingData && existingData.length > 0 ? existingData[0].id : null);
            if (targetId) {
                console.log('Updating existing record with ID:', targetId);
                result = await supabase
                    .from('institute_settings')
                    .update(dataToSave)
                    .eq('id', targetId);
            } else {
                console.log('No existing record found. Inserting new record.');
                result = await supabase
                    .from('institute_settings')
                    .insert([dataToSave]);
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

    // Update Favicon and Title dynamically
    useEffect(() => {
        if (institute) {
            // Update Favicon
            if (institute.favicon_url) {
                const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
                link.type = 'image/x-icon';
                link.rel = 'shortcut icon';
                link.href = institute.favicon_url;
                document.getElementsByTagName('head')[0].appendChild(link);
            }

            // Update Title
            if (institute.name) {
                document.title = institute.name;
            }
        }
    }, [institute]);

    return (
        <InstituteContext.Provider value={{ institute, loading, error, updateInstituteSettings, fetchInstitute }}>
            {children}
        </InstituteContext.Provider>
    );
};
