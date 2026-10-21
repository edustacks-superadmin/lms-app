import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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

    useEffect(() => {
        fetchHomeSettings();
    }, []);

    const fetchHomeSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('home_settings')
                .select('*')
                .order('id', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (error) throw error;
            setSettings(data);
        } catch (error) {
            console.error('Error fetching home settings:', error);
        } finally {
            setLoading(false);
        }
    };

    const uploadImage = async (file, folder = 'home-images') => {
        try {
            if (!file) return null;

            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${folder}/${fileName}`;

            const { data, error } = await supabase.storage
                .from('home-images')
                .upload(filePath, file);

            if (error) throw error;

            const { data: { publicUrl } } = supabase.storage
                .from('home-images')
                .getPublicUrl(filePath);

            return publicUrl;
        } catch (error) {
            console.error('Error uploading image:', error);
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
                    .insert([dataToUpdate])
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
