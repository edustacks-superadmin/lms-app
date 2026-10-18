import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin Supabase client for bypassing RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * GET /api/statistics/exams
 * Returns exam statistics for the dashboard
 * Query params:
 *   - period: 'week' | 'month' | 'year'
 *   - startDate, endDate: custom date range (ISO format)
 *   - platform: 'web' | 'mobile' | 'all' (future use)
 */
export async function GET(req) {
    try {
        const { searchParams } = new URL(req.url);
        const period = searchParams.get('period') || 'week';
        const customStart = searchParams.get('startDate');
        const customEnd = searchParams.get('endDate');

        const supabase = supabaseAdmin;

        // Calculate date range based on period
        const now = new Date();
        let startDate, endDate;

        if (customStart && customEnd) {
            startDate = new Date(customStart);
            endDate = new Date(customEnd);
        } else {
            endDate = now;
            switch (period) {
                case 'week':
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case 'month':
                    startDate = new Date(now);
                    startDate.setMonth(startDate.getMonth() - 1);
                    break;
                case 'year':
                    startDate = new Date(now);
                    startDate.setFullYear(startDate.getFullYear() - 1);
                    break;
                default:
                    startDate = new Date(now);
                    startDate.setDate(startDate.getDate() - 7);
            }
        }

        // 1. Get total attempts count in period
        const { count: totalAttempts } = await supabase
            .from('exam_attempts')
            .select('*', { count: 'exact', head: true })
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString())
            .eq('status', 'completed');

        // 2. Get attempts by date for chart
        const { data: attemptsData } = await supabase
            .from('exam_attempts')
            .select('id, started_at')
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString())
            .eq('status', 'completed')
            .order('started_at', { ascending: true });

        // Group by date for chart
        const chartData = {};
        attemptsData?.forEach(attempt => {
            const date = new Date(attempt.started_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short'
            });
            chartData[date] = (chartData[date] || 0) + 1;
        });

        const chartLabels = Object.keys(chartData);
        const chartValues = Object.values(chartData);

        // 3. Top Tests (most attempted exams)
        const { data: topTestsRaw } = await supabase
            .from('exam_attempts')
            .select('exam_id, exams!inner(id, title)')
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString())
            .eq('status', 'completed');

        // Count attempts per exam
        const examCounts = {};
        topTestsRaw?.forEach(attempt => {
            const examId = attempt.exam_id;
            const examTitle = attempt.exams?.title || 'Unknown';
            if (!examCounts[examId]) {
                examCounts[examId] = { id: examId, title: examTitle, attempts: 0 };
            }
            examCounts[examId].attempts++;
        });

        const topTests = Object.values(examCounts)
            .sort((a, b) => b.attempts - a.attempts)
            .slice(0, 10);

        // 4. Top Test Takers (users with most attempts)
        // 4. Top Test Takers (users with most attempts)
        const { data: topTakersRaw } = await supabase
            .from('exam_attempts')
            .select('member_id')
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString())
            .eq('status', 'completed');

        // 5. Top Scorers (users with highest total scores)
        const { data: topScorersRaw } = await supabase
            .from('exam_attempts')
            .select('member_id, score')
            .gte('started_at', startDate.toISOString())
            .lte('started_at', endDate.toISOString())
            .eq('status', 'completed')
            .not('score', 'is', null);

        // Collect all unique member IDs
        const memberIds = new Set();
        topTakersRaw?.forEach(a => memberIds.add(a.member_id));
        topScorersRaw?.forEach(a => memberIds.add(a.member_id));

        // Fetch member details separately
        let memberMap = {};
        if (memberIds.size > 0) {
            const { data: members } = await supabase
                .from('members')
                .select('id, display_name, first_name, last_name, username, email')
                .in('id', Array.from(memberIds));

            members?.forEach(m => {
                memberMap[m.id] = m;
            });
        }

        // Helper to get member name
        const getMemberName = (member) => {
            if (!member) return 'Anonymous';
            if (member.display_name) return member.display_name;
            if (member.first_name) return `${member.first_name} ${member.last_name || ''}`.trim();
            if (member.username) return member.username;
            return member.email || 'Anonymous';
        };

        // Process Top Test Takers
        const memberAttempts = {};
        topTakersRaw?.forEach(attempt => {
            const memberId = attempt.member_id;
            const member = memberMap[memberId];
            const memberName = getMemberName(member);

            if (!memberAttempts[memberId]) {
                memberAttempts[memberId] = { id: memberId, name: memberName, attempts: 0 };
            }
            memberAttempts[memberId].attempts++;
        });

        const topTestTakers = Object.values(memberAttempts)
            .sort((a, b) => b.attempts - a.attempts)
            .slice(0, 10);

        // Process Top Scorers
        const memberScores = {};
        topScorersRaw?.forEach(attempt => {
            const memberId = attempt.member_id;
            const member = memberMap[memberId];
            const memberName = getMemberName(member);

            if (!memberScores[memberId]) {
                memberScores[memberId] = { id: memberId, name: memberName, totalScore: 0 };
            }
            memberScores[memberId].totalScore += parseFloat(attempt.score) || 0;
        });

        const topScorers = Object.values(memberScores)
            .sort((a, b) => b.totalScore - a.totalScore)
            .slice(0, 10);

        return NextResponse.json({
            success: true,
            period,
            dateRange: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            },
            totalAttempts: totalAttempts || 0,
            chart: {
                labels: chartLabels,
                data: chartValues
            },
            topTests,
            topTestTakers,
            topScorers
        });

    } catch (error) {
        console.error('Statistics API error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
