import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const OfferContext = createContext();

export const useOffers = () => useContext(OfferContext);

import { useInstitute } from './InstituteContext';

export const OfferProvider = ({ children }) => {
    const [offers, setOffers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { institute } = useInstitute();

    const fetchOffers = async () => {
        if (!institute?.id) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/store/coupons?instituteId=${institute.id}`);
            if (res.ok) {
                const data = await res.json();
                setOffers(data);
            } else {
                throw new Error('Failed to fetch offers');
            }
        } catch (err) {
            console.error('Error fetching offers:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const createOffer = async (offerData) => {
        try {
            const payload = {
                ...offerData,
                institute_id: institute?.id
            };
            const res = await fetch('/api/admin/store/coupons', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to create offer');

            setOffers(prev => [data, ...prev]);
            return { success: true, data };
        } catch (err) {
            console.error('Error creating offer:', err);
            return { success: false, error: err.message };
        }
    };

    const toggleOfferStatus = async (id) => {
        const offer = offers.find(o => o.id === id);
        if (!offer) return;

        const newStatus = offer.status === 'active' ? 'expired' : 'active';

        // Optimistic update
        setOffers(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));

        try {
            const res = await fetch('/api/admin/store/coupons', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [id], updates: { status: newStatus } })
            });
            if (!res.ok) throw new Error('Failed to toggle status');
            return { success: true };
        } catch (err) {
            console.error('Error toggling status:', err);
            // Revert on error
            setOffers(prev => prev.map(o => o.id === id ? { ...o, status: offer.status } : o));
            return { success: false, error: err.message };
        }
    };

    const bulkUpdateOffers = async (ids, updates) => {
        const originalOffers = [...offers];
        // Optimistic update
        setOffers(prev => prev.map(o => ids.includes(o.id) ? { ...o, ...updates } : o));

        try {
            const res = await fetch('/api/admin/store/coupons', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, updates })
            });
            if (!res.ok) throw new Error('Failed to bulk update');
            return { success: true };
        } catch (err) {
            console.error('Error bulk updating:', err);
            setOffers(originalOffers);
            return { success: false, error: err.message };
        }
    };

    const bulkDeleteOffers = async (ids) => {
        const originalOffers = [...offers];
        // Optimistic update: Remove from UI immediately
        setOffers(prev => prev.filter(o => !ids.includes(o.id)));

        try {
            // Use PATCH to soft delete (set status to 'deleted')
            const res = await fetch('/api/admin/store/coupons', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids, updates: { status: 'deleted' } })
            });

            if (!res.ok) throw new Error('Failed to bulk delete');
            return { success: true };
        } catch (err) {
            console.error('Error bulk deleting:', err);
            // Revert on error
            setOffers(originalOffers);
            return { success: false, error: err.message };
        }
    };

    const deleteOffer = async (id) => {
        return bulkDeleteOffers([id]);
    };

    // useEffect(() => {
    //     fetchOffers();
    // }, []);

    return (
        <OfferContext.Provider value={{
            offers,
            loading,
            error,
            fetchOffers,
            createOffer,
            deleteOffer,
            toggleOfferStatus,
            bulkUpdateOffers,
            bulkDeleteOffers
        }}>
            {children}
        </OfferContext.Provider>
    );
};
