
import { supabaseAdmin } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function POST(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { is_achiever, achievements } = body;

        if (!id) {
            return NextResponse.json({ error: "Missing ID" }, { status: 400 });
        }

        console.log(`[Admin Update] Updating achiever status for member ${id}:`, is_achiever);

        // 1. Update Member 'is_achiever' flag using Service Role (bypasses RLS)
        const { error: memberError } = await supabaseAdmin
            .from('members')
            .update({ is_achiever: is_achiever || false })
            .eq('id', id);

        if (memberError) {
            console.error("[Admin Update] Member update error:", memberError);
            throw memberError;
        }

        // 2. Sync Achievements
        if (is_achiever) {
            // Delete existing
            const { error: deleteError } = await supabaseAdmin
                .from('member_achievements')
                .delete()
                .eq('member_id', id);

            if (deleteError) throw deleteError;

            // Insert new
            if (achievements && achievements.length > 0) {
                const validAchievements = achievements.map(a => ({
                    member_id: id,
                    exam_name: a.exam_name,
                    rank: a.rank,
                    year: a.year,
                    quote: a.quote
                }));

                const { error: insertError } = await supabaseAdmin
                    .from('member_achievements')
                    .insert(validAchievements);

                if (insertError) throw insertError;
            }
        } else {
            // If disabled, remove achievements
            const { error: deleteError } = await supabaseAdmin
                .from('member_achievements')
                .delete()
                .eq('member_id', id);

            if (deleteError) throw deleteError;
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error("[Admin Update] Failed:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
