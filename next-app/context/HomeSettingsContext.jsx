import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

const HomeSettingsContext = createContext();

export const useHomeSettings = () => {
    const context = useContext(HomeSettingsContext);
    if (!context) {
        throw new Error('useHomeSettings must be used within a HomeSettingsProvider');
    }
    return context;
};

export const HomeSettingsProvider = ({ children }) => {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const { institute } = useInstitute();

    useEffect(() => {
        if (institute?.id) {
            fetchHomeSettings(institute.id);
        }
    }, [institute?.id]);

    const fetchHomeSettings = async (instituteId = institute?.id) => {
        try {
            if (!instituteId) return;

            const { data, error } = await supabase
                .from('home_settings')
                .select('*')
                .eq('institute_id', instituteId)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // Ignore not found error
            setSettings(data || {}); // Set empty object if not found to avoid null checks failing later
        } catch (error) {
            console.error('Error fetching home settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const uploadImage = async (file, folder = 'home-images') => {
        try {
            if (!file) return null;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', folder);

            // Import server action dynamically to avoid naming conflict
            const { uploadImage: uploadImageAction } = await import('../app/actions/images');

            const result = await uploadImageAction(formData);

            if (!result.success) {
                throw new Error(result.error || 'Upload failed');
            }

            return result.url;
        } catch (error) {
            console.error('Error uploading image to R2:', error);
            return null;
        }
    };

    const updateHomeSettings = async (updatedData, logoFile = null, bannerFile = null) => {
        try {
            let logoUrl = updatedData.institute_logo_url;
            let bannerUrl = updatedData.hero_banner_image;

            // Upload logo if provided
            if (logoFile) {
                const uploadedLogoUrl = await uploadImage(logoFile, 'logos');
                if (uploadedLogoUrl) logoUrl = uploadedLogoUrl;
            }

            // Upload banner if provided
            if (bannerFile) {
                const uploadedBannerUrl = await uploadImage(bannerFile, 'banners');
                if (uploadedBannerUrl) bannerUrl = uploadedBannerUrl;
            }

            const dataToUpdate = {
                ...updatedData,
                institute_logo_url: logoUrl,
                hero_banner_image: bannerUrl,
                updated_at: new Date().toISOString()
            };

            let data, error;

            if (settings && settings.id) {
                // Update existing
                const result = await supabase
                    .from('home_settings')
                    .update(dataToUpdate)
                    .eq('id', settings.id)
                    .select()
                    .single();
                data = result.data;
                error = result.error;
            } else {
                // Insert new
                const result = await supabase
                    .from('home_settings')
                    .insert([{ ...dataToUpdate, institute_id: institute?.id }])
                    .select()
                    .single();
                data = result.data;
                error = result.error;
            }

            if (error) throw error;

            setSettings(data);
            return { success: true, data };
        } catch (error) {
            console.error('Error updating home settings:', error);
            return { success: false, error: error.message };
        }
    };

    return (
        <HomeSettingsContext.Provider value={{
            settings,
            loading,
            fetchHomeSettings,
            updateHomeSettings,
            uploadImage
        }}>
            {children}
        </HomeSettingsContext.Provider>
    );
};
