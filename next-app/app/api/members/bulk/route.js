import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone validation regex (10 digits)
const PHONE_REGEX = /^\d{10}$/;

// Validate a single member record
function validateMember(member, index) {
    const errors = [];

    // Required field: Email
    if (!member.email) {
        errors.push('Email is required');
    } else if (!EMAIL_REGEX.test(member.email)) {
        errors.push('Invalid email format');
    }

    // Phone validation (if provided)
    if (member.phone && !PHONE_REGEX.test(member.phone.toString().replace(/\D/g, ''))) {
        errors.push('Phone must be 10 digits');
    }

    return {
        isValid: errors.length === 0,
        errors,
        rowIndex: index + 1
    };
}

// Check for duplicate emails within the batch
function checkDuplicates(members) {
    const emailMap = new Map();
    const duplicates = [];

    members.forEach((member, index) => {
        if (member.email) {
            const email = member.email.toLowerCase();
            if (emailMap.has(email)) {
                duplicates.push({
                    rowIndex: index + 1,
                    email: member.email,
                    firstOccurrence: emailMap.get(email)
                });
            } else {
                emailMap.set(email, index + 1);
            }
        }
    });

    return duplicates;
}

// Parse date from various formats
function parseDate(dateStr) {
    if (!dateStr) return null;

    if (typeof dateStr === 'number') {
        // Excel serial date
        const date = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
        return !isNaN(date.getTime()) ? date.toISOString() : null;
    }

    const str = dateStr.toString().trim();
    // Try DD/MM/YYYY or DD-MM-YYYY format
    const match = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{1,2}))?$/);
    if (match) {
        const [_, day, month, year, hour, minute] = match;
        const dateObj = new Date(year, parseInt(month) - 1, day, hour || 0, minute || 0);
        if (!isNaN(dateObj.getTime())) return dateObj.toISOString();
    }

    const fallbackDate = new Date(dateStr);
    return !isNaN(fallbackDate.getTime()) ? fallbackDate.toISOString() : null;
}

// Process batch subscription info
function processBatchSubscriptions(expiryData) {
    if (!expiryData) return null;

    if (typeof expiryData === 'string' && expiryData.trim().startsWith('{')) {
        try {
            const jsonStr = expiryData.replace(/'/g, '"');
            const datesObj = JSON.parse(jsonStr);
            return datesObj;
        } catch (e) {
            console.warn('Failed to parse expiry date JSON:', expiryData);
        }
    }
    return null;
}

export async function POST(request) {
    try {
        // Initialize Supabase client with service role key for admin operations
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false
                }
            }
        );

        const { members } = await request.json();

        if (!members || !Array.isArray(members) || members.length === 0) {
            return NextResponse.json(
                { error: 'No members data provided' },
                { status: 400 }
            );
        }

        // Validate all members first
        const validationResults = members.map((member, index) =>
            validateMember(member, index)
        );

        // Check for duplicates within the batch
        const duplicates = checkDuplicates(members);

        // Prepare results array
        const results = [];

        for (let i = 0; i < members.length; i++) {
            const member = members[i];
            const validation = validationResults[i];

            // Check if this row has a duplicate
            const isDuplicate = duplicates.find(d => d.rowIndex === i + 1);

            if (!validation.isValid) {
                results.push({
                    success: false,
                    email: member.email,
                    rowIndex: i + 1,
                    errors: validation.errors
                });
                continue;
            }

            if (isDuplicate) {
                results.push({
                    success: false,
                    email: member.email,
                    rowIndex: i + 1,
                    errors: [`Duplicate email (first seen in row ${isDuplicate.firstOccurrence})`]
                });
                continue;
            }

            try {
                // Check if email already exists in database
                const { data: existingMember } = await supabaseAdmin
                    .from('members')
                    .select('id, email')
                    .eq('email', member.email.toLowerCase())
                    .single();

                if (existingMember) {
                    results.push({
                        success: false,
                        email: member.email,
                        rowIndex: i + 1,
                        errors: ['Email already exists in database']
                    });
                    continue;
                }

                // Parse dates
                const joiningDate = parseDate(member.joining_date) || new Date().toISOString();
                const birthDate = parseDate(member.birth_date);
                const expiryDate = parseDate(member.expiry_date);

                // Process batch subscription info
                const batchExpiryMap = processBatchSubscriptions(member.expiry_date);

                // Prepare member data
                const newMember = {
                    username: member.username || null,
                    first_name: member.first_name || null,
                    last_name: member.last_name || null,
                    display_name: member.display_name ||
                        (member.first_name && member.last_name ?
                            `${member.first_name} ${member.last_name}`.trim() :
                            member.username || member.email?.split('@')[0]) || null,
                    email: member.email.toLowerCase(),
                    phone_number: member.phone || null,
                    address1: member.address1 || null,
                    address2: member.address2 || null,
                    city: member.city || null,
                    state: member.state || null,
                    zip: member.zip || null,
                    birth_date: birthDate,
                    joining_date: joiningDate,
                    photo_url: member.photo_url || null,
                    report_card_url: member.report_card_url || null,
                    id_proof_url: member.aadhaar_url || null,
                    role: 'student',
                    status: 'active',
                    is_active: member.is_active !== undefined ? member.is_active : true,
                    is_blocked: member.is_blocked !== undefined ? member.is_blocked : false,
                    custom_data: batchExpiryMap ? { expiry_info: member.expiry_date } : {},
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                // Insert member
                const { data: insertedMember, error: insertError } = await supabaseAdmin
                    .from('members')
                    .insert([newMember])
                    .select()
                    .single();

                if (insertError) throw insertError;

                // Handle batch assignments
                if (member.batches) {
                    const batchIds = member.batches.toString().split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));

                    if (batchIds.length > 0) {
                        // Verify batches exist
                        const { data: validBatches } = await supabaseAdmin
                            .from('batches')
                            .select('id, name')
                            .in('id', batchIds);

                        if (validBatches && validBatches.length > 0) {
                            const validBatchIds = validBatches.map(b => b.id);

                            // Insert batch_members
                            const batchMembersData = validBatchIds.map(batchId => ({
                                batch_id: batchId,
                                member_id: insertedMember.id
                            }));

                            await supabaseAdmin
                                .from('batch_members')
                                .insert(batchMembersData);

                            // Create subscriptions if expiry dates provided
                            if (expiryDate || batchExpiryMap) {
                                const subscriptionData = validBatchIds.map(batchId => {
                                    let batchExpiry = expiryDate;

                                    // Check if we have specific expiry for this batch
                                    if (batchExpiryMap) {
                                        const batchInfo = validBatches.find(b => b.id === batchId);
                                        if (batchInfo && batchExpiryMap[batchInfo.name]) {
                                            batchExpiry = parseDate(batchExpiryMap[batchInfo.name]);
                                        }
                                    }

                                    if (!batchExpiry) return null;

                                    return {
                                        user_id: null,
                                        member_id: insertedMember.id,
                                        batch_id: batchId,
                                        status: 'Active',
                                        expires_on: batchExpiry
                                    };
                                }).filter(sub => sub !== null);

                                if (subscriptionData.length > 0) {
                                    await supabaseAdmin
                                        .from('subscriptions')
                                        .insert(subscriptionData);
                                }
                            }
                        }
                    }
                }

                results.push({
                    success: true,
                    email: member.email,
                    rowIndex: i + 1,
                    memberId: insertedMember.id
                });

            } catch (error) {
                console.error(`Error processing member ${member.email}:`, error);
                results.push({
                    success: false,
                    email: member.email,
                    rowIndex: i + 1,
                    errors: [error.message || 'Database error occurred']
                });
            }
        }

        // Calculate summary statistics
        const successCount = results.filter(r => r.success).length;
        const failCount = results.filter(r => !r.success).length;

        return NextResponse.json({
            success: true,
            results,
            summary: {
                total: members.length,
                successful: successCount,
                failed: failCount
            }
        });

    } catch (error) {
        console.error('Bulk upload error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}
