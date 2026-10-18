export async function validateMemberProfile(supabase, userId) {
    // 1. Fetch Member Profile
    const { data: member, error } = await supabase
        .from('members')
        .select('id, photo_url, community, verification_status, birth_date, gender, pstm')
        .eq('auth_user_id', userId)
        .single();

    if (error || !member) {
        return { valid: false, error: 'Member profile not found', status: 404 };
    }

    // 2. Identify Missing Fields
    const missingFields = [];
    if (!member.photo_url) missingFields.push('photo_url');
    if (!member.community) missingFields.push('community');
    if (!member.birth_date) missingFields.push('birth_date');
    if (!member.gender) missingFields.push('gender');
    if (member.pstm === null) missingFields.push('pstm'); // Check for null, as false is a valid answer

    // 3. Return Result
    if (missingFields.length > 0) {
        return {
            valid: false,
            error: 'Profile incomplete',
            requires_action: 'complete_profile',
            missing_fields: missingFields,
            memberId: member.id,
            status: 403
        };
    }

    return {
        valid: true,
        memberId: member.id,
        member: member
    };
}
