'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import UserForm from './UserForm';
import { useUsers } from '../context/UserContext';

const EditUser = () => {
    const { id } = useParams();
    const router = useRouter();
    const { users, updateUser, loading: contextLoading } = useUsers();
    const [initialData, setInitialData] = useState(null);
    const [localLoading, setLocalLoading] = useState(true);

    useEffect(() => {
        if (contextLoading) return;

        const fetchExtraDetails = async () => {
            const user = users.find(u => String(u.id) === String(id));

            if (user) {
                // Fetch fresh member data to get is_achiever flag
                const { data: memberData } = await supabase
                    .from('members')
                    .select('is_achiever')
                    .eq('id', id)
                    .single();

                // Fetch achievements
                const { data: achievements } = await supabase
                    .from('member_achievements')
                    .select('*')
                    .eq('member_id', id);

                setInitialData({
                    username: user.email || '',
                    first_name: user.first_name || '',
                    last_name: user.last_name || '',
                    display_name: user.displayName || '',
                    email: user.email || '',
                    mobile: user.phone_number || '',
                    birth_date: user.birth_date ? user.birth_date.split('T')[0] : '',
                    gender: user.gender || '',
                    address1: user.address1 || '',
                    address2: user.address2 || '',
                    city: user.city || '',
                    state: user.state || '',
                    zip: user.zip || '',
                    status: user.role || 'Student',
                    batches: user.batchIds || [],
                    photo_url: user.photo_url || null,
                    // New Fields
                    is_achiever: memberData?.is_achiever || false,
                    achievements: achievements || []
                });
            }
            setLocalLoading(false);
        };

        fetchExtraDetails();
    }, [id, users, contextLoading]);

    const handleUpdateUser = async (formData) => {
        try {
            // 1. Separate Achiever Data
            const { is_achiever, achievements, ...otherData } = formData;

            // 2. Call Secure API to update Achiever Status (Bypassing RLS)
            const response = await fetch(`/api/admin/members/${id}/achiever`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_achiever, achievements }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to update achiever status');
            }

            // 3. Update basic user data via Context
            return await updateUser(id, otherData);

        } catch (error) {
            console.error("Error updating user extended details:", error);
            return { success: false, error: error.message };
        }
    };

    if (contextLoading || localLoading) {
        return <div className="p-10 text-center">Loading user details...</div>;
    }

    if (!initialData) {
        return <div className="p-10 text-center">User not found</div>;
    }

    return (
        <UserForm
            mode="edit"
            memberId={id}
            redirectUrl={`/members/${id}`}
            backPath={`/members/${id}`}
            initialData={initialData}
            onSubmit={handleUpdateUser}
            title="Edit Member"
            subtitle="Update member details and permissions."
        />
    );
};

export default EditUser;
