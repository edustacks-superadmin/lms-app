import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useInstitute } from './InstituteContext';

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
    const [loading, setLoading] = useState(false); // Changed to false, no bulk loading
    const [error, setError] = useState(null);
    const { institute } = useInstitute();

    // Global auto-fetch disabled for performance. 
    // Components that need user data (like MembersPage) should call fetchUsers() or use specific API endpoints.
    /*
    useEffect(() => {
        if (institute?.id) {
            fetchUsers(institute.id);
        }
    }, [institute?.id]);
    */

    const fetchUsers = async (instituteId = institute?.id) => {
        try {
            setLoading(true);
            setError(null);

            // Fetch ALL members using pagination (Supabase has 1000 row default limit)
            let allMembers = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data: membersPage, error } = await supabase
                    .from('members')
                    .select('*')
                    .eq('institute_id', instituteId)
                    .range(from, from + pageSize - 1)
                    .order('created_at', { ascending: false });

                if (error) throw error;

                if (membersPage && membersPage.length > 0) {
                    allMembers = allMembers.concat(membersPage);
                    from += pageSize;

                    // If we got less than pageSize, we've reached the end
                    if (membersPage.length < pageSize) {
                        hasMore = false;
                    }
                } else {
                    hasMore = false;
                }
            }

            console.log(`Fetched ${allMembers.length} total members`);

            // OPTIMIZATION: Fetch ALL batch relationships at once (instead of per-member)
            // This prevents 13,788 individual API calls (N+1 query problem)

            // 1. Fetch all batch_members relationships
            let allBatchMembers = [];
            let batchFrom = 0;
            const batchPageSize = 1000;
            let hasBatchMore = true;

            while (hasBatchMore) {
                const { data: batchPage, error: batchError } = await supabase
                    .from('batch_members')
                    .select('member_id, batch_id, batches(name)')
                    .eq('institute_id', instituteId)
                    .range(batchFrom, batchFrom + batchPageSize - 1);

                if (batchError) {
                    console.error('Error fetching batch members:', batchError);
                    break;
                }

                if (batchPage && batchPage.length > 0) {
                    allBatchMembers = allBatchMembers.concat(batchPage);
                    batchFrom += batchPageSize;

                    if (batchPage.length < batchPageSize) {
                        hasBatchMore = false;
                    }
                } else {
                    hasBatchMore = false;
                }
            }

            // 2. Create a map of member_id -> batch data for quick lookup
            const batchesByMember = {};
            allBatchMembers.forEach(bm => {
                if (!batchesByMember[bm.member_id]) {
                    batchesByMember[bm.member_id] = [];
                }
                if (bm.batches && bm.batches.name) {
                    batchesByMember[bm.member_id].push({
                        id: bm.batch_id,
                        name: bm.batches.name
                    });
                }
            });

            console.log(`Fetched ${allBatchMembers.length} batch associations`);

            // 3. Fetch all subscriptions at once
            let allSubscriptions = [];
            let subFrom = 0;
            const subPageSize = 1000;
            let hasSubMore = true;

            while (hasSubMore) {
                const { data: subPage, error: subError } = await supabase
                    .from('subscriptions')
                    .select('member_id, batch_id, batch:batches(name), status')
                    .eq('institute_id', instituteId)
                    .eq('status', 'Active')
                    .range(subFrom, subFrom + subPageSize - 1);

                if (subError) {
                    console.error('Error fetching subscriptions:', subError);
                    break;
                }

                if (subPage && subPage.length > 0) {
                    allSubscriptions = allSubscriptions.concat(subPage);
                    subFrom += subPageSize;

                    if (subPage.length < subPageSize) {
                        hasSubMore = false;
                    }
                } else {
                    hasSubMore = false;
                }
            }

            // 4. Create a map of member_id -> subscription batches
            const subscriptionsByMember = {};
            allSubscriptions.forEach(sub => {
                if (!subscriptionsByMember[sub.member_id]) {
                    subscriptionsByMember[sub.member_id] = [];
                }
                if (sub.batch && sub.batch.name) {
                    subscriptionsByMember[sub.member_id].push({
                        id: sub.batch_id,
                        name: sub.batch.name
                    });
                }
            });

            console.log(`Fetched ${allSubscriptions.length} active subscriptions`);

            // 5. Enrich members with batch data (NO API calls in the loop!)
            const usersWithBatches = allMembers.map((member) => {
                // Get batches from our pre-fetched maps
                const manualBatches = batchesByMember[member.id] || [];
                const subscribedBatches = subscriptionsByMember[member.id] || [];

                // Combine and deduplicate
                const allBatchesMap = new Map();
                [...manualBatches, ...subscribedBatches].forEach(b => {
                    allBatchesMap.set(b.id, b.name);
                });

                const batchNames = Array.from(allBatchesMap.values());
                const batchIds = Array.from(allBatchesMap.keys());

                return {
                    ...member,
                    displayName: member.display_name ||
                        (member.first_name && member.last_name ? `${member.first_name} ${member.last_name}`.trim() : '') ||
                        member.username ||
                        member.email?.split('@')[0] ||
                        'User',
                    joinedDate: member.created_at ? new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '--',
                    batches: batchNames.length > 0 ? batchNames.join(', ') : '--',
                    batchIds: batchIds,
                    avatar: member.photo_url || `https://via.placeholder.com/40?text=${member.display_name ? member.display_name.charAt(0).toUpperCase() : 'U'}`
                };
            });

            console.log(`Enriched ${usersWithBatches.length} members with batch data`);
            setUsers(usersWithBatches);
        } catch (error) {
            console.error('Error fetching users:', error.message);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const uploadUserPhoto = async (file) => {
        try {
            console.log('uploadUserPhoto called with file:', file);
            if (!file) return null;

            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'profiles'); // Use 'profiles' folder for consistency

            // Import server action dynamically to avoid naming conflict or circular deps
            const { uploadImage } = await import('../app/actions/images');

            console.log('Uploading to R2...');
            const result = await uploadImage(formData);

            if (!result.success) {
                console.error('R2 upload error:', result.error);
                throw new Error(result.error || 'Upload failed');
            }

            console.log('Upload successful, URL:', result.url);
            return result.url;
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
                birth_date: userData.birth_date || null,
                address1: userData.address1,
                address2: userData.address2,
                zip: userData.zip,
                state: userData.state,
                state_code: userData.state_code,
                expiry_date: userData.expiry_date || null,
                report_card_url: userData.report_card_url,
                orders: userData.orders,
                is_active: userData.is_active,
                is_blocked: userData.is_blocked,
                custom_data: userData.custom_data || {},
                institute_id: institute?.id
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
                    member_id: memberData.id,
                    institute_id: institute?.id
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
                            expires_on: expiryDate,
                            institute_id: institute?.id
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


            // 3. Send Welcome Email if requested
            if (userData.sendEmail && memberData.email) {
                console.log('Sending welcome email to:', memberData.email);

                // Construct email content
                const subject = `Welcome to Mahesh IES Academy!`;
                // Simple password logic: if provided in userData use it, else if generated... 
                // userData.password comes from the form.
                const passwordText = userData.password
                    ? `Your password is: ${userData.password}`
                    : 'Please contact admin for your password.';

                const htmlContent = `
                    <div style="font-family: Arial, sans-serif; color: #333;">
                        <h2>Welcome, ${memberData.display_name}!</h2>
                        <p>Your account has been successfully created.</p>
                        <p><strong>Username:</strong> ${memberData.username}</p>
                        <p>${passwordText}</p>
                        <br/>
                        <p>Login here: <a href="https://maheshiesacademy.edustacks.co.in/login">https://maheshiesacademy.edustacks.co.in/login</a></p>
                    </div>
                `;

                try {
                    fetch('/api/emails/send', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: memberData.email,
                            subject: subject,
                            html: htmlContent
                        })
                    }).then(res => res.json())
                        .then(data => console.log('Email send result:', data))
                        .catch(err => console.error('Failed to call email API:', err));
                } catch (emailErr) {
                    console.error('Error triggering email:', emailErr);
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
                role: userData.role || 'student',
                status: userData.status || 'active',
                is_blocked: userData.is_blocked,
                phone_number: userData.phone_number === "" ? null : (userData.phone_number || userData.mobile),
                birth_date: userData.birth_date || null,
                gender: userData.gender || null,
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
            } else if (userData.removePhoto) {
                // Explicitly remove photo if requested
                updatedMember.photo_url = null;
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

                if (userData.batches && userData.batches.length > 0) {
                    const batchMembersData = userData.batches.map(batchId => ({
                        batch_id: batchId,
                        member_id: userId,
                        institute_id: institute?.id
                    }));

                    await supabase
                        .from('batch_members')
                        .insert(batchMembersData);
                }
            }

            // 3. Refresh user data
            await fetchUsers();

            return { success: true };


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

            let targetAuthUserId = null;

            // Helper to check if string is UUID
            const isUUID = (str) => {
                if (typeof str !== 'string') return false;
                return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
            };

            if (isUUID(userId)) {
                targetAuthUserId = userId;
            } else {
                // It's an integer ID, let's see if we can find the auth_user_id in the DB
                const { data: member, error: fetchError } = await supabase
                    .from('members')
                    .select('auth_user_id')
                    .eq('id', userId)
                    .single();

                if (!fetchError && member?.auth_user_id) {
                    targetAuthUserId = member.auth_user_id;
                    console.log('Found linked Auth ID for member:', targetAuthUserId);
                }

                // Always update the members table record too
                const { error: dbError } = await supabase
                    .from('members')
                    .update({
                        password: newPassword,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', userId);

                if (dbError) console.error('Error updating member password in DB:', dbError.message);
            }

            if (targetAuthUserId) {
                // Case 1: Active Auth User - Use RPC to update protected auth.users table
                const { error } = await supabase.rpc('update_student_password', {
                    target_user_id: targetAuthUserId,
                    new_password: newPassword
                });
                if (error) throw error;
            } else if (!isUUID(userId)) {
                // If we are here, it means we only updated the members table and no auth account was found
                console.warn('Password updated only in members table. No linked auth account found.');
            }

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
            error,
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
