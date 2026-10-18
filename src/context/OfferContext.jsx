import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const OfferContext = createContext();

export const useOffers = () => useContext(OfferContext);

export const OfferProvider = ({ children }) => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchOffers = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('offers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOffers(data);
        } catch (err) {
            console.error('Error fetching offers:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createOffer = async (offerData) => {
        try {
            const { data, error } = await supabase
                .from('offers')
                .insert([offerData])
                .select()
                .single();

            if (error) throw error;
            setOffers(prev => [data, ...prev]);
            return { success: true, data };
        } catch (err) {
            console.error('Error creating offer:', err);
            return { success: false, error: err.message };
        }
    };

    const deleteOffer = async (id) => {
        try {
            const { error } = await supabase
                .from('offers')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setOffers(prev => prev.filter(offer => offer.id !== id));
            return { success: true };
        } catch (err) {
            console.error('Error deleting offer:', err);
            return { success: false, error: err.message };
        }
    };

    useEffect(() => {
        fetchOffers();
    }, []);

    return (
        <OfferContext.Provider value={{ offers, loading, error, fetchOffers, createOffer, deleteOffer }}>
            {children}
        </OfferContext.Provider>
    );
};
