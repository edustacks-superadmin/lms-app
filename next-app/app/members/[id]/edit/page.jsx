'use client';

import React, { use, useState, useEffect } from 'react';
import { useUsers } from '../../../../context/UserContext';
import { useRouter } from 'next/navigation';
import UserForm from '../../../../components/UserForm';
import { supabase } from '../../../../supabaseClient';

const EditMemberPage = ({ params }) => {
    const resolvedParams = use(params);
    const id = resolvedParams.id;

    const router = useRouter();
    const { users, updateUser, loading: contextLoading } = useUsers();
    const [member, setMember] = useState(null);
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadMember = async () => {
            let loadedMember = null;

            // 1. Try to find in context first
            if (!contextLoading && users.length > 0) {
                loadedMember = users.find(u => String(u.id) === String(id));
            }

            // 2. If not found or context empty, fetch from API
            if (!loadedMember) {
                try {
                    const res = await fetch(`/api/members/${id}`);
                    const data = await res.json();
                    if (data.member) {
                        loadedMember = data.member;
                    }
                } catch (err) {
                    console.error("Failed to fetch member:", err);
                }
            }

            if (loadedMember) {
                // 3. Fetch Achievements separately
                const { data: achData } = await supabase
                    .from('member_achievements')
                    .select('*')
                    .eq('member_id', id);

                // 4. Ensure is_achiever is fresh
                const { data: freshMember } = await supabase
                    .from('members')
                    .select('is_achiever')
                    .eq('id', id)
                    .single();

                setMember({
                    ...loadedMember,
                    is_achiever: freshMember ? freshMember.is_achiever : loadedMember.is_achiever
                });
                setAchievements(achData || []);
            } else {
                setMember(null);
            }
            setLoading(false);
        };

        loadMember();
    }, [id, users, contextLoading]);

    const handleUpdateMember = async (formData) => {
        // 1. Separate Achiever Data
        const { is_achiever, achievements: formAchievements, ...otherData } = formData;

        try {
            // 2. Call Secure API to update Achiever Status
            const response = await fetch(`/api/admin/members/${id}/achiever`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_achiever, achievements: formAchievements }),
            });

            if (!response.ok) {
                console.error('Failed to update achiever status');
            }
        } catch (e) {
            console.error('Error updating achiever status:', e);
        }

        // 3. Update basic user data via Context
        const result = await updateUser(id, otherData);
        if (result.success) {
            // Redirect to member detail page after successful update
            router.push(`/members/${id}`);
        }
        return result;
    };

    if (contextLoading || loading) {
        return (
            <div className="flex justify-center items-center p-10 text-slate-500 min-h-screen bg-slate-50">
                <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                    Loading member details...
                </div>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="flex flex-col items-center justify-center p-10 text-slate-600 min-h-screen bg-slate-50">
                <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200 text-center max-w-md w-full">
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Member not found</h3>
                    <p className="text-slate-500 mb-6">The member you are trying to edit does not exist or has been removed.</p>
                    <button
                        className="px-4 py-2 border border-slate-300 shadow-sm text-sm font-medium rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors inline-flex items-center gap-2"
                        onClick={() => router.push('/members')}
                    >
                        <ChevronLeft size={16} /> Back to Members
                    </button>
                </div>
            </div>
        );
    }

    // Prepare initial data for the form
    const initialData = {
        username: member.username || '',
        email: member.email || '',
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        display_name: member.display_name || member.displayName || '',
        phone_number: member.phone_number || member.mobile || '',
        birth_date: member.birth_date || '',
        gender: member.gender || '',
        address1: member.address1 || '',
        address2: member.address2 || '',
        city: member.city || '',
        state: member.state || '',
        zip: member.zip || '',
        role: member.role || 'student',
        status: member.status || 'active',
        photo_url: member.photo_url || '',
        batches: member.batchIds || [],
        is_achiever: member.is_achiever || false,
        achievements: achievements || []
    };

    return (
        <div className="bg-white min-h-screen p-6 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <UserForm
                    mode="edit"
                    initialData={initialData}
                    onSubmit={handleUpdateMember}
                    title={`Edit Member: ${member.display_name || member.displayName || member.email}`}
                    subtitle="Update member information below."
                    redirectUrl={`/members/${id}`}
                    backPath={`/members/${id}`}
                />
            </div>
        </div>
    );
};

export default EditMemberPage;
