
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const examTag = searchParams.get('examTag');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 20;
        const search = searchParams.get('search') || '';
        const status = searchParams.get('status') || 'all';
        const postFilter = searchParams.get('postFilter') || 'all';
        const sortBy = searchParams.get('sortBy') || '';
        const sortDir = searchParams.get('sortDir') || 'asc';

        if (!examTag) {
            return NextResponse.json({ error: "Missing examTag" }, { status: 400 });
        }

        const offset = (page - 1) * limit;

        // 1. Build Query on external_exam_results (Flattened View)
        let query = supabaseAdmin
            .from('external_exam_results')
            .select(`
                *,
                members (
                    id, display_name, email, phone_number, photo_url, is_achiever, birth_date, gender, community
                )
            `, { count: 'exact' })
            .eq('exam_tag', examTag);

        // 2. Apply Filters
        if (postFilter && postFilter !== 'all') {
            query = query.ilike('post_selected', `%${postFilter}%`);
        }

        if (search) {
            console.log("Searching for:", search);

            // Step 1: Find matching members first
            const { data: memberMatches } = await supabaseAdmin
                .from('members')
                .select('id')
                .or(`display_name.ilike.%${search}%,email.ilike.%${search}%`)
                .limit(100);

            const memberIds = (memberMatches || []).map(m => m.id);

            // Step 2: Construct OR filter with member IDs and Registration Number
            // Use quotes for registration_number search to handle spaces if any
            let orFilter = `registration_number.ilike."%${search}%"`;

            if (memberIds.length > 0) {
                orFilter += `,member_id.in.(${memberIds.join(',')})`;
            }

            query = query.or(orFilter);
        }

        if (status === 'achiever') {
            query = query.eq('members.is_achiever', true);
        } else if (status === 'verified') {
            query = query.eq('is_verified', true);
        } else if (status === 'applied') {
            // "Pending" means NOT verified
            query = query.or('is_verified.is.false,is_verified.is.null');
        } else if (status === 'not_registered') {
            // "Not Registered" means member_id is NULL
            query = query.is('member_id', null);
        }

        // 3. Sorting
        let sortCol = 'overall_rank';
        let isAsc = true;

        if (sortBy === 'verified_marks') {
            sortCol = 'total_marks';
            isAsc = sortDir === 'asc';
        } else if (sortBy === 'verified_rank') {
            sortCol = 'overall_rank';
            isAsc = sortDir === 'asc';
        } else {
            // Default sort: highest marks first
            sortCol = 'total_marks';
            isAsc = false;
        }

        // Prepare stats promises (run in parallel with main query)
        // Prepare stats promises (LAZY LOAD)
        // If includeStats is true, we run counts. If false, we resolve null.
        let globalTotalPromise = Promise.resolve({ count: null });
        let verifiedCountPromise = Promise.resolve({ count: null });
        let achieverCountPromise = Promise.resolve({ count: null });
        let notRegisteredCountPromise = Promise.resolve({ count: null });

        const includeStatsParam = searchParams.get('includeStats') === 'true';

        if (includeStatsParam) {
            globalTotalPromise = supabaseAdmin.from('external_exam_results').select('*', { count: 'exact', head: true }).eq('exam_tag', examTag);
            verifiedCountPromise = supabaseAdmin.from('external_exam_results').select('*', { count: 'exact', head: true }).eq('exam_tag', examTag).eq('is_verified', true);
            achieverCountPromise = supabaseAdmin.from('exam_applications').select('id, members!inner(id, is_achiever)', { count: 'exact', head: true }).eq('exam_tag', examTag).eq('members.is_achiever', true);
            notRegisteredCountPromise = supabaseAdmin.from('external_exam_results').select('*', { count: 'exact', head: true }).eq('exam_tag', examTag).is('member_id', null);
        }

        // Execute all queries in parallel
        const [
            mainResult,
            globalTotalRes,
            verifiedCountRes,
            achieverCountRes,
            notRegisteredCountRes
        ] = await Promise.all([
            query.order(sortCol, { ascending: isAsc, nullsFirst: false }).range(offset, offset + limit - 1),
            globalTotalPromise,
            verifiedCountPromise,
            achieverCountPromise,
            notRegisteredCountPromise
        ]);

        const { data: results, error: resError, count: totalCount } = mainResult;

        if (resError) throw resError;

        if (resError) throw resError;

        const includeStats = searchParams.get('includeStats') === 'true';

        // --- AUTO-SYNC LOGIC START ---
        // Sync missing member details from external_exam_results
        const memberUpdates = {}; // Map memberId -> updateObject to avoid duplicate updates

        (results || []).forEach(res => {
            if (!res.members) return;

            const m = res.members;
            const updatePayload = { id: m.id }; // ID is required for update
            let hasUpdate = false;

            // 1. Phone / WhatsApp
            if (!m.phone_number && res.whatsapp_number) {
                updatePayload.phone_number = res.whatsapp_number;
                m.phone_number = res.whatsapp_number; // Update local object
                hasUpdate = true;
            }

            // 2. DOB
            if (!m.birth_date && res.dob) {
                updatePayload.birth_date = res.dob;
                m.birth_date = res.dob;
                hasUpdate = true;
            }

            // 3. Gender
            if (!m.gender && res.gender) {
                updatePayload.gender = res.gender.toLowerCase();
                m.gender = res.gender.toLowerCase();
                hasUpdate = true;
            }

            // 4. Community
            if (!m.community && res.community) {
                updatePayload.community = res.community;
                m.community = res.community;
                hasUpdate = true;
            }

            // 5. Name (Only if missing or default)
            if ((!m.display_name || m.display_name === 'Anonymous User') && res.full_name) {
                updatePayload.display_name = res.full_name;
                m.display_name = res.full_name;
                hasUpdate = true;
            }

            if (hasUpdate) {
                memberUpdates[m.id] = { ...(memberUpdates[m.id] || {}), ...updatePayload };
            }
        });

        // Executing updates safely with Promise.all
        const updatesArray = Object.values(memberUpdates);
        if (updatesArray.length > 0) {
            console.log(`[Auto-Sync] Syncing details for ${updatesArray.length} members...`);
            await Promise.allSettled(updatesArray.map(u => supabaseAdmin.from('members').update(u).eq('id', u.id)));
        }
        // --- AUTO-SYNC LOGIC END ---

        // 4. Fetch Application Status for these results
        const regNumbers = Array.from(new Set((results || []).map(r => r.registration_number)));
        let apps = [];
        if (regNumbers.length > 0) {
            const { data: appsData } = await supabaseAdmin
                .from('exam_applications')
                .select('status, registration_number, id, verified_rank, verified_marks, verified_post_selected')
                .eq('exam_tag', examTag)
                .in('registration_number', regNumbers);
            apps = appsData || [];
        }

        // 5. Map results to "application-like" objects for frontend compatibility
        const flattenedApps = (results || []).map(res => {
            const app = apps.find(a => a.registration_number === res.registration_number);
            return {
                ...app,
                id: `${app?.id || 'temp'}_${res.id}`,
                original_app_id: app?.id,
                registration_number: res.registration_number,
                members: res.members,
                member_id: app?.member_id || res.member_id, // Ensure member_id is available
                verified_rank: res.overall_rank,
                verified_marks: res.total_marks,
                verified_post_selected: res.post_selected,
                status: res.is_verified ? 'verified' : 'applied',
                results: [res]
            };
        });

        // 6. Generic Stats (Lazy Loading)
        // Only fetch stats if requested (initial load or explicit refresh)
        let stats = null;
        if (includeStats) {
            // Already fetched in parallel above, use the results
            stats = {
                filtered: totalCount,
                total: globalTotalRes.count,
                verified: verifiedCountRes.count,
                achievers: achieverCountRes.count,
                not_registered: notRegisteredCountRes.count
            };
        }

        return NextResponse.json({
            applications: flattenedApps,
            totalCount: totalCount,
            totalPages: Math.ceil(totalCount / limit),
            currentPage: page,
            stats: stats
        });

    } catch (error) {
        console.error("[Admin Apps] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const {
            applicationId,
            memberId,
            examTag,
            examName,
            rank,
            marks,
            department,
            year,
            quote,
            action // 'promote', 'verify', or 'remove'
        } = body;


        let resolvedMemberId = memberId;

        // Parse composite applicationId (e.g., "temp_123" or "uuid_uuid")
        let finalAppId = applicationId;
        if (finalAppId && typeof finalAppId === 'string' && finalAppId.includes('_')) {
            const parts = finalAppId.split('_');
            // parts[0] is either 'temp' or the real exam_applications.id
            finalAppId = parts[0] === 'temp' ? null : parts[0];
        }

        // Auto-Resolution/Registration if memberId is missing
        if (!resolvedMemberId && (body.email || body.whatsapp_number)) {
            console.log(`[Admin Promote] Attempting auto-resolution for ${body.email || body.whatsapp_number}`);

            // 1. Check by email
            if (body.email) {
                const { data: mEmail } = await supabaseAdmin
                    .from('members')
                    .select('id')
                    .eq('email', body.email)
                    .maybeSingle();
                if (mEmail) resolvedMemberId = mEmail.id;
            }

            // 2. Check by phone
            if (!resolvedMemberId && body.whatsapp_number) {
                const { data: mPhone } = await supabaseAdmin
                    .from('members')
                    .select('id')
                    .eq('phone_number', body.whatsapp_number)
                    .maybeSingle();
                if (mPhone) resolvedMemberId = mPhone.id;
            }

            // 3. Create if still not found
            if (!resolvedMemberId) {
                console.log(`[Admin Promote] Creating new member profile for ${body.email}`);
                const { data: newM, error: createError } = await supabaseAdmin
                    .from('members')
                    .insert([{
                        email: body.email,
                        display_name: body.full_name || 'Anonymous User',
                        phone_number: body.whatsapp_number,
                        birth_date: body.dob,
                        community: body.community,
                        gender: body.gender ? body.gender.toLowerCase() : null,
                        pstm: body.pstm_status === true || body.pstm_status === 'TRUE',
                        institute_id: 10,
                        role: 'student',
                        status: 'active',
                        is_active: true
                    }])
                    .select()
                    .single();

                if (createError) {
                    console.error("Auto-Registration Error:", createError);
                } else {
                    resolvedMemberId = newM.id;
                }
            }

            // 4. Update external_exam_results with the new ID
            if (resolvedMemberId) {
                await supabaseAdmin
                    .from('external_exam_results')
                    .update({ member_id: resolvedMemberId })
                    .eq('registration_number', body.registrationNumber)
                    .eq('exam_tag', examTag);
            }
        }

        if (!resolvedMemberId || !examTag) {
            return NextResponse.json({ error: "Missing required fields or member could not be resolved" }, { status: 400 });
        }

        // Use resolvedMemberId for all subsequent operations
        const finalMemberId = resolvedMemberId;

        // 0. Handle Manual Registration Sync
        if (action === 'register') {
            return NextResponse.json({ success: true, message: "Member registered and linked successfully", memberId: finalMemberId });
        }

        // 1. Handle Removal
        if (action === 'remove') {
            console.log(`[Admin Promote] Removing promotion for member ${finalMemberId} - Post: ${department}`);

            // Delete from gallery
            const { error: galleryDeleteError } = await supabaseAdmin
                .from('external_exam_results')
                .delete()
                .eq('member_id', finalMemberId)
                .eq('exam_tag', examTag)
                .eq('post_selected', department);

            if (galleryDeleteError) console.error("Gallery Delete Error:", galleryDeleteError);

            // Delete from achievements
            const { error: achDeleteError } = await supabaseAdmin
                .from('member_achievements')
                .delete()
                .eq('member_id', finalMemberId)
                .eq('exam_name', examName || examTag);

            // Note: If they have OTHER achievements, keep is_achiever = true
            const { count } = await supabaseAdmin
                .from('member_achievements')
                .select('*', { count: 'exact', head: true })
                .eq('member_id', finalMemberId);

            if (count === 0) {
                await supabaseAdmin.from('members').update({ is_achiever: false }).eq('id', finalMemberId);
            }

            return NextResponse.json({ success: true });
        }

        // 2. Handle Unverify (Reset Application Status)
        if (action === 'unverify') {
            console.log(`[Admin Unverify] Resetting application ${finalAppId} for member ${finalMemberId}`);

            if (finalAppId) {
                const { error: appError } = await supabaseAdmin
                    .from('exam_applications')
                    .update({
                        status: 'applied',
                        verified_rank: null,
                        verified_marks: null,
                        verified_post_selected: null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', finalAppId);

                if (appError) throw appError;
            }

            // Also update the external result to reflect the pending status
            await supabaseAdmin
                .from('external_exam_results')
                .update({ is_verified: false })
                .eq('member_id', finalMemberId)
                .eq('exam_tag', examTag);

            return NextResponse.json({ success: true });
        }

        // 3. Handle Internal Verification
        if (action === 'verify') {
            console.log(`[Admin Verify] Verifying application ${applicationId} for member ${finalMemberId}`);

            // A. Update Member Achievements (Internal Record)
            const { data: existingAch } = await supabaseAdmin
                .from('member_achievements')
                .select('id')
                .eq('member_id', finalMemberId)
                .eq('exam_name', examName || examTag)
                .maybeSingle();

            if (!existingAch) {
                const { error: achError } = await supabaseAdmin
                    .from('member_achievements')
                    .insert([{
                        member_id: finalMemberId,
                        exam_name: examName || examTag,
                        rank: rank?.toString() || '',
                        year: year?.toString() || new Date().getFullYear().toString(),
                        quote: quote || ''
                    }]);
                if (achError) throw achError;
            } else {
                const { error: achError } = await supabaseAdmin
                    .from('member_achievements')
                    .update({
                        rank: rank?.toString() || '',
                        year: year?.toString() || new Date().getFullYear().toString(),
                        quote: quote || ''
                    })
                    .eq('id', existingAch.id);
                if (achError) throw achError;
            }

            // B. Update Application Status
            let targetAppId = finalAppId;

            if (targetAppId) {
                const { error: appError } = await supabaseAdmin
                    .from('exam_applications')
                    .update({
                        status: 'verified',
                        verified_rank: parseInt(rank) || null,
                        verified_marks: parseFloat(marks) || null,
                        verified_post_selected: department || null,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', targetAppId);
                if (appError) throw appError;
            } else {
                // Create or Upsert application metadata if it doesn't exist
                const { error: upsertError } = await supabaseAdmin
                    .from('exam_applications')
                    .upsert({
                        member_id: finalMemberId,
                        exam_tag: examTag,
                        registration_number: body.registrationNumber,
                        status: 'verified',
                        verified_rank: parseInt(rank) || null,
                        verified_marks: parseFloat(marks) || null,
                        verified_post_selected: department || null,
                        applied_at: new Date().toISOString()
                    }, { onConflict: 'member_id, exam_tag' })
                    .select(); // Select to ensure it executes and returns

                if (upsertError) {
                    console.error("Auto-Application Upsert Error:", upsertError);
                    // Non-blocking: We still proceed to verify the external result
                }
            }

            // C. Update External Result Status
            await supabaseAdmin
                .from('external_exam_results')
                .update({ is_verified: true })
                .eq('member_id', finalMemberId)
                .eq('exam_tag', examTag);

            return NextResponse.json({ success: true, message: "Verified successfully" });
        }

        // 4. Handle Public Promotion (Gallery & Star Achiever)
        if (action === 'promote') {
            console.log(`[Admin Promote] Promoting member ${finalMemberId} to star achiever and gallery`);

            // A. Update Member 'is_achiever' flag
            const { error: memberError } = await supabaseAdmin
                .from('members')
                .update({ is_achiever: true })
                .eq('id', finalMemberId);
            if (memberError) throw memberError;

            // B. Upsert into external_exam_results (Public Gallery)
            const { data: member } = await supabaseAdmin
                .from('members')
                .select('*')
                .eq('id', finalMemberId)
                .single();

            const galleryData = {
                full_name: member.display_name || member.first_name || '',
                email: member.email || '',
                whatsapp_number: member.phone_number || '',
                registration_number: body.registrationNumber || '',
                dob: member.dob || '',
                community: member.community || '',
                gender: member.gender || '',
                exam_tag: examTag,
                overall_rank: parseInt(rank) || 0,
                total_marks: parseFloat(marks) || 0,
                department: department || 'Civil',
                post_selected: department || 'Civil',
                member_id: finalMemberId,
                is_verified: true,
                institute_id: member.institute_id || 10
            };

            const { error: galleryError } = await supabaseAdmin
                .from('external_exam_results')
                .upsert([galleryData], { onConflict: 'registration_number,exam_tag,post_selected' });

            if (galleryError) throw galleryError;

            return NextResponse.json({ success: true, message: "Promoted to gallery successfully" });
        }

        return NextResponse.json({ error: "Action not handled" }, { status: 400 });

    } catch (error) {
        console.error("[Admin Promote] Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
