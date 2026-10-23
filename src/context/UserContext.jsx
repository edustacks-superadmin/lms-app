import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

const UserContext = createContext();

export const useUsers = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error('useUsers must be used within a UserProvider');
    }
    return context;
};

export const UserProvider = ({ children }) => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Skip heavy background data fetching on public auth pages
        const publicAuthPaths = ['/login', '/student/signup', '/forgot-password', '/reset-password'];
        if (publicAuthPaths.includes(window.location.pathname)) {
            setLoading(false);
            return;
        }
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);

            // Fetch all members
            const { data: members, error } = await supabase
                .from('members')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            if (!members || members.length === 0) {
                setUsers([]);
                return;
            }

            // Fetch all batch_members and active subscriptions in 2 parallel batch queries
            const [{ data: allBatchMembers }, { data: allSubscriptions }] = await Promise.all([
                supabase.from('batch_members').select('member_id, batch_id, batches(name)'),
                supabase.from('subscriptions').select('user_id, batch_id, batch:batches(name)').eq('status', 'Active')
            ]);

            const manualBatchesByMember = {};
            (allBatchMembers || []).forEach(bm => {
                if (!manualBatchesByMember[bm.member_id]) {
                    manualBatchesByMember[bm.member_id] = { names: [], ids: [] };
                }
                if (bm.batches?.name) manualBatchesByMember[bm.member_id].names.push(bm.batches.name);
                if (bm.batch_id) manualBatchesByMember[bm.member_id].ids.push(bm.batch_id);
            });

            const subscribedBatchesByUser = {};
            (allSubscriptions || []).forEach(sub => {
                if (!subscribedBatchesByUser[sub.user_id]) {
                    subscribedBatchesByUser[sub.user_id] = { names: [], ids: [] };
                }
                if (sub.batch?.name) subscribedBatchesByUser[sub.user_id].names.push(sub.batch.name);
                if (sub.batch_id) subscribedBatchesByUser[sub.user_id].ids.push(sub.batch_id);
            });

            const usersWithBatches = members.map(member => {
                const manual = manualBatchesByMember[member.id] || { names: [], ids: [] };
                const subscribed = (member.user_id && subscribedBatchesByUser[member.user_id]) || { names: [], ids: [] };

                const allBatches = [...new Set([...manual.names, ...subscribed.names])];
                const batchNames = allBatches.length > 0 ? allBatches.join(', ') : '--';
                const allBatchIds = [...new Set([...manual.ids, ...subscribed.ids])];

                return {
                    ...member,
                    displayName: member.display_name ||
                        (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}`.trim() : '') ||
                        member.username ||
                        member.email?.split('@')[0] ||
                        'User',
                    joinedDate: member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--',
                    batches: batchNames || '--',
                    batchIds: allBatchIds,
                    avatar: member.photo_url || `https://via.placeholder.com/40?text=${member.display_name ? member.display_name.charAt(0).toUpperCase() : 'U'}`
                };
            });

            setUsers(usersWithBatches);
        } catch (error) {
            console.error('Error fetching users:', error.message);
        } finally {
            setLoading(false);
        }
    };

    const uploadUserPhoto = async (file) => {
        try {
            console.log('uploadUserPhoto called with file:', file);
            if (!file) return null;

            // Create unique filename
            const fileExt = file.name.split('.').pop();
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const filePath = `${fileName}`;

            console.log('Uploading to Supabase storage, filePath:', filePath);

            // Upload to Supabase storage
            const { data, error } = await supabase.storage
                .from('user-photos')
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });

            if (error) {
                console.error('Supabase storage upload error:', error);
                throw error;
            }

            console.log('Upload successful, data:', data);

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('user-photos')
                .getPublicUrl(filePath);

            console.log('Public URL generated:', publicUrl);
            return publicUrl;
        } catch (error) {
            console.error('Error uploading photo:', error.message);
            return null;
        }
    };

    const checkDuplicate = (userData, excludeUserId = null) => {
        const nameToCheck = (userData.display_name || userData.username || '').toLowerCase();
        const emailToCheck = (userData.email || '').toLowerCase();
        const phoneToCheck = (userData.phone || userData.mobile || userData.phone_number || '').toString().toLowerCase();

        for (const user of users) {
            // Use loose equality to handle string/number ID mismatch
            if (excludeUserId && user.id == excludeUserId) continue;

            if (user.name && user.name.toLowerCase() === nameToCheck) return 'User name already exists';
            if (user.email && user.email.toLowerCase() === emailToCheck) return 'Email already exists';
            if (user.phone_number && user.phone_number.toLowerCase() === phoneToCheck) return 'Mobile number already exists';
        }
        return null;
    };

    const addUser = async (userData, allProducts, allCourses) => {
        try {
            console.log('addUser called with userData:', userData);

            // Check for duplicates
            const duplicateError = checkDuplicate(userData);
            if (duplicateError) {
                alert(duplicateError);
                return { success: false, error: duplicateError };
            }

            console.log('Photo in userData:', userData.photo);

            // Upload photo if provided
            let photoUrl = null;
            if (userData.photo) {
                console.log('Uploading photo...');
                photoUrl = await uploadUserPhoto(userData.photo);
                console.log('Photo uploaded, URL:', photoUrl);
            } else {
                console.log('No photo provided in userData');
            }

            const newMember = {
                display_name: userData.display_name || userData.username,
                email: userData.email,
                role: 'student', // Default role
                status: 'active',
                phone_number: userData.phone || userData.mobile,
                city: userData.city,
                joining_date: userData.joining_date || new Date().toISOString(),
                photo_url: photoUrl || userData.photo_url, // Use uploaded photo URL or provided URL string

                // Add missing fields for bulk upload
                username: userData.username,
                first_name: userData.first_name,
                last_name: userData.last_name,
                birth_date: userData.birth_date,
                address1: userData.address1,
                address2: userData.address2,
                zip: userData.zip,
                state: userData.state,
                state_code: userData.state_code,
                expiry_date: userData.expiry_date,
                report_card_url: userData.report_card_url,
                orders: userData.orders,
                is_active: userData.is_active,
                is_blocked: userData.is_blocked,
                custom_data: userData.custom_data || {}
            };

            // 1. Insert into members table
            const { data: memberData, error: memberError } = await supabase
                .from('members')
                .insert([newMember])
                .select()
                .single();

            if (memberError) throw memberError;

            // 2. Insert into batch_members if batches are selected
            let batchNames = '--';
            if (userData.batches && userData.batches.length > 0) {
                const batchMembersData = userData.batches.map(batchId => ({
                    batch_id: batchId,
                    member_id: memberData.id
                }));

                const { error: batchError } = await supabase
                    .from('batch_members')
                    .insert(batchMembersData);

                if (batchError) console.error('Error assigning batches:', batchError.message);

                // Fetch batch names for local state update
                const { data: batchesData } = await supabase
                    .from('batches')
                    .select('name')
                    .in('id', userData.batches);

                if (batchesData) {
                    batchNames = batchesData.map(b => b.name).join(', ');
                }

                // Create subscription record for each batch
                if (userData.expiry_date || userData.batch_expiry_map) {
                    const subscriptionData = userData.batches.map(batchId => {
                        // Determine expiry date for this specific batch
                        let expiryDate = userData.expiry_date;

                        // If we have a map, try to find specific date for this batch
                        if (userData.batch_expiry_map && userData.batch_expiry_map[batchId]) {
                            expiryDate = userData.batch_expiry_map[batchId];
                        }

                        if (!expiryDate) return null;

                        return {
                            user_id: null, // Explicitly null for bulk upload users (no auth yet)
                            member_id: memberData.id, // Link to member record
                            batch_id: batchId,
                            status: 'Active',
                            expires_on: expiryDate
                        };
                    }).filter(sub => sub !== null);

                    if (subscriptionData.length > 0) {
                        const { error: subError } = await supabase
                            .from('subscriptions')
                            .insert(subscriptionData);

                        if (subError) throw subError;
                    }
                }
            }

            await fetchUsers();
            return { success: true, data: memberData };

        } catch (error) {
            console.error('Error adding user:', error.message);
            alert('Error adding user: ' + error.message);
            return { success: false, error: error.message };
        }
    };

    const updateUser = async (userId, userData) => {
        try {
            // Check for duplicates
            const duplicateError = checkDuplicate(userData, userId);
            if (duplicateError) {
                alert(duplicateError);
                return { success: false, error: duplicateError };
            }

            // Upload new photo if provided
            let photoUrl = undefined;
            if (userData.photo) {
                photoUrl = await uploadUserPhoto(userData.photo);
            }

            const updatedMember = {
                first_name: userData.first_name,
                last_name: userData.last_name,
                display_name: userData.display_name || userData.username,
                email: userData.email,
                role: userData.status || 'Student',
                status: 'active',
                phone_number: userData.mobile,
                birth_date: userData.birth_date,
                gender: userData.gender,
                address1: userData.address1,
                address2: userData.address2,
                city: userData.city,
                state: userData.state,
                zip: userData.zip,
                updated_at: new Date().toISOString()
            };

            // Add photo_url if a new photo was uploaded
            if (photoUrl) {
                updatedMember.photo_url = photoUrl;
            }

            // Remove undefined fields
            Object.keys(updatedMember).forEach(key =>
                updatedMember[key] === undefined && delete updatedMember[key]
            );

            // 1. Update members table
            const { data: memberDataArray, error: memberError } = await supabase
                .from('members')
                .update(updatedMember)
                .eq('id', userId)
                .select();

            if (memberError) throw memberError;

            const memberData = memberDataArray && memberDataArray.length > 0 ? memberDataArray[0] : null;

            if (!memberData) {
                // Fallback if update didn't return data but succeeded (shouldn't happen with select())
                // or if record wasn't found
                console.warn("Update succeeded but no data returned");
            }

            // 2. Update batch associations
            if (userData.batches !== undefined) {
                // Delete existing batch associations
                await supabase
                    .from('batch_members')
                    .delete()
                    .eq('member_id', userId);

                // Insert new batch associations
                if (userData.batches && userData.batches.length > 0) {
                    const batchMembersData = userData.batches.map(batchId => ({
                        batch_id: batchId,
                        member_id: userId
                    }));

                    await supabase
                        .from('batch_members')
                        .insert(batchMembersData);
                }
            }

            // 3. Refresh user data
            await fetchUsers();

            return { success: true, data: memberData };

        } catch (error) {
            console.error('Error updating user:', error.message);
            return { success: false, error: error.message };
        }
    };

    const deleteUser = async (userId) => {
        try {
            console.log('Attempting to delete user with ID:', userId, 'Type:', typeof userId);

            // 1. Delete batch associations first (foreign key constraint)
            console.log('Step 1: Deleting batch associations...');
            const { error: batchError } = await supabase
                .from('batch_members')
                .delete()
                .eq('member_id', userId);

            if (batchError) {
                console.error('Error deleting batch associations:', batchError);
                throw batchError;
            }
            console.log('✅ Batch associations deleted');

            // 2. Delete the member
            console.log('Step 2: Deleting member from members table...');
            const { error: memberError } = await supabase
                .from('members')
                .delete()
                .eq('id', userId);

            if (memberError) {
                console.error('Error deleting member:', memberError);
                throw memberError;
            }
            console.log('✅ Member deleted from database');

            // 3. Update local state
            console.log('Step 3: Updating local state...');
            setUsers(prev => prev.filter(user => user.id !== userId));
            console.log('✅ Local state updated');

            return { success: true };

        } catch (error) {
            console.error('❌ Error deleting user:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                details: error.details,
                hint: error.hint
            });
            return { success: false, error: error.message };
        }
    };

    const getUser = (userId) => {
        return users.find(user => user.id === userId);
    };

    const updateUserPassword = async (userId, newPassword) => {
        try {
            console.log('Updating password for user:', userId);

            // Call the RPC function
            const { error } = await supabase.rpc('update_student_password', {
                target_user_id: userId,
                new_password: newPassword
            });

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Error updating password:', error.message);
            return { success: false, error: error.message };
        }
    };

    return (
        <UserContext.Provider value={{
            users,
            loading,
            addUser,
            updateUser,
            deleteUser,
            getUser,
            fetchUsers,
            updateUserPassword
        }}>
            {children}
        </UserContext.Provider>
    );
};
