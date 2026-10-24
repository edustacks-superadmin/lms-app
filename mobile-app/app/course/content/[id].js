
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StatusBar, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import CustomVideoPlayer from '../../../components/CustomVideoPlayer';
import PdfViewer from '../../../components/PdfViewer';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedbackModal from '../../../components/FeedbackModal';
import { getApiUrl } from '../../../config/organization';
import * as ScreenCapture from 'expo-screen-capture';
import { isScreenshotProtectionEnabled } from '../../../lib/configService';

export default function ContentPlayer() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [content, setContent] = useState(null);
    const [loading, setLoading] = useState(true);

    // New States for Exam Features
    const [attempts, setAttempts] = useState([]);
    const [examDetails, setExamDetails] = useState(null);
    const [selectedMode, setSelectedMode] = useState('exam'); // 'exam' or 'quiz'

    // Feedback State
    const [feedbackForm, setFeedbackForm] = useState(null);
    const [showFeedbackModal, setShowFeedbackModal] = useState(false);
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);
    const [isCompleted, setIsCompleted] = useState(false); // Local state for immediate UI update

    // Video Restriction State
    const [videoAccess, setVideoAccess] = useState(null);
    const [videoBlocked, setVideoBlocked] = useState(false);
    const [lastWatchUpdate, setLastWatchUpdate] = useState(0);
    const [lastPosition, setLastPosition] = useState(0);
    const [memberId, setMemberId] = useState(null);
    const videoPlayerRef = useRef(null);

    useEffect(() => {
        fetchContent();
    }, [id]);

    // Screenshot Protection for Course Materials & Content
    useEffect(() => {
        let isMounted = true;
        const initProtection = async () => {
            try {
                const shouldBlock = await isScreenshotProtectionEnabled('pdf');
                if (shouldBlock && isMounted) {
                    await ScreenCapture.preventScreenCaptureAsync();
                }
            } catch (e) {
                console.warn('Error setting content screen capture protection:', e);
            }
        };
        initProtection();

        return () => {
            isMounted = false;
            isScreenshotProtectionEnabled('global').then(isGlobal => {
                if (!isGlobal) {
                    ScreenCapture.allowScreenCaptureAsync().catch(() => {});
                }
            });
        };
    }, []);



    const fetchContent = async () => {
        try {
            if (!id || id === 'undefined') {
                console.warn('Invalid Content ID:', id);
                setLoading(false);
                return;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const { data, error } = await supabase
                .from('chapter_contents')
                .select(`
                    *,
                    chapters!inner (
                        course_id
                    )
                `)
                .eq('id', parseInt(id))
                .single();

            if (error) throw error;

            // Flatten the course_id from the chapter
            const contentWithCourseId = {
                ...data,
                course_id: data.chapters?.course_id
            };

            setContent(contentWithCourseId);

            // Track content access for videos and PDFs (for Resume section)
            if ((data.type === 'video' || data.type === 'pdf') && user) {
                let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
                if (!memberData) {
                    const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                    memberData = emailMember;
                }

                if (memberData) {
                    setMemberId(memberData.id);
                    // Fetch existing progress first to get last position
                    const { data: existingProgress, error: fetchError } = await supabase
                        .from('content_progress')
                        .select('last_position_seconds')
                        .eq('member_id', memberData.id)
                        .eq('content_id', parseInt(id))
                        .maybeSingle();

                    console.log('[ContentPlayer] Existing Progress Fetch:', { existingProgress, fetchError, memberId: memberData.id, contentId: parseInt(id) });

                    if (existingProgress?.last_position_seconds) {
                        console.log('Resuming video from:', existingProgress.last_position_seconds);
                        setLastPosition(existingProgress.last_position_seconds);
                        setLastWatchUpdate(existingProgress.last_position_seconds); // Prevent double counting
                    }

                    // Upsert content access history (New Table)
                    await supabase
                        .from('content_progress')
                        .upsert({
                            member_id: memberData.id,
                            content_id: parseInt(id),
                            course_id: data.chapters?.course_id,
                            chapter_id: data.chapter_id,
                            content_type: data.type,
                            content_title: data.title,
                            updated_at: new Date().toISOString()
                        }, {
                            onConflict: 'member_id, content_id'
                        });
                }
            }

            if (data.type === 'exam' && user) {
                // 1. Fetch Past Attempts
                let { data: memberData } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
                if (!memberData) {
                    const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                    memberData = emailMember;
                }

                let attemptCount = 0;  // Declare outside if block

                if (memberData) {
                    // Fetch enrollment to get cycle start date (enrolled_at)
                    let enrollmentDate = null;
                    const courseId = data.chapters?.course_id || data.course_id;
                    if (courseId) {
                        const { data: enrollment } = await supabase
                            .from('enrollments')
                            .select('enrolled_at')
                            .eq('member_id', memberData.id)
                            .eq('course_id', courseId)
                            .maybeSingle();
                        if (enrollment?.enrolled_at) {
                            enrollmentDate = enrollment.enrolled_at;
                        }
                    }

                    let attemptsQuery = supabase
                        .from('exam_attempts')
                        .select('*')
                        .eq('exam_id', data.exam_id)
                        .eq('member_id', memberData.id)
                        .not('submitted_at', 'is', null);

                    if (enrollmentDate) {
                        attemptsQuery = attemptsQuery.gte('started_at', enrollmentDate);
                    }

                    const { data: attemptsData } = await attemptsQuery.order('submitted_at', { ascending: false });
                    setAttempts(attemptsData || []);
                    attemptCount = attemptsData?.length || 0;  // Store count for current cycle
                }

                // 2. Fetch Exam Metadata (Duration + Max Attempts)

                const { data: examMeta } = await supabase
                    .from('exams')
                    .select('duration_minutes, max_attempts, allow_mode_toggle, negative_marking_enabled, negative_marks_per_question')
                    .eq('id', data.exam_id)
                    .single();

                // 3. Fetch Question Stats (Count & Marks)
                const { data: qStats } = await supabase
                    .from('exam_questions')
                    .select('marks')
                    .eq('exam_id', data.exam_id);

                const questionCount = qStats?.length || 0;
                const totalMarks = qStats?.reduce((sum, item) => sum + (item.marks || 1), 0) || 0;

                setExamDetails({
                    duration: examMeta?.duration_minutes || 0,
                    questions: questionCount,
                    marks: totalMarks,
                    maxAttempts: examMeta?.max_attempts || 0,
                    maxAttempts: examMeta?.max_attempts || 0,
                    attemptsUsed: attemptCount,  // Use the stored count
                    allowModeToggle: examMeta?.allow_mode_toggle,
                    negativeMarkingEnabled: Boolean(examMeta?.negative_marking_enabled),
                    negativeMarks: examMeta?.negative_marks_per_question ?? 0.33
                });
            }

        } catch (error) {
            console.error('Error fetching content:', error);
        } finally {
            setLoading(false);
        }
    };

    // content is loaded here, so we can check feedback safely
    useEffect(() => {
        if (content?.course_id) {
            checkFeedback();
            checkCompletionStatus();
            if (content.type === 'video') {
                checkVideoAccess();
            }
        }
    }, [content]);

    const checkCompletionStatus = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Get member id (robust check)
            console.log('Checking completion for user:', user.email, user.id);
            let { data: member } = await supabase.from('members').select('id, email').eq('auth_user_id', user.id).single();
            if (!member) {
                console.log('Auth ID lookup failed, trying email...');
                const { data: emailMember } = await supabase.from('members').select('id, email').eq('email', user.email).single();
                member = emailMember;
            }

            console.log('Resolved Member:', member);

            if (!member) return;

            const { data, error } = await supabase
                .from('content_progress')
                .select('completed, id')
                .eq('member_id', member.id)
                .eq('content_id', parseInt(id))
                .maybeSingle();

            console.log('Completion Data:', data);
            console.log('Completion Error:', error);

            if (data?.completed) {
                console.log('Setting IsCompleted to TRUE');
                setIsCompleted(true);
            } else {
                console.log('Setting IsCompleted to FALSE');
            }
        } catch (error) {
            console.error('Error checking completion:', error);
        }
    };

    const checkFeedback = async () => {
        try {
            if (!content?.course_id) return;
            const endpoint = getApiUrl(`/api/courses/${content.course_id}/feedback/check`);
            const response = await fetch(endpoint);
            if (!response.ok) return;
            const text = await response.text();
            if (!text) return;
            const data = JSON.parse(text);

            if (data.should_trigger && data.form) {
                setFeedbackForm(data.form);
                setShowFeedbackModal(true);
            }
        } catch (error) {
            console.warn("Feedback check skipped:", error?.message || error);
        }
    };

    const checkVideoAccess = async () => {
        if (!content || content.type !== 'video' || !content.course_id) return;

        try {
            const endpoint = getApiUrl('/api/student/video/check-access');
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    contentId: parseInt(id),
                    courseId: content.course_id
                })
            });

            // Note: Expo generic fetch doesn't send cookies automatically unless properly configured. 
            // If the backend relies strictly on 'cookies' helper, it might fail.
            // Let's assume this works for now, if not I will debug auth.

            // To be safe, let's pass the access token in headers. 
            // The Next.js API might need to be created with `createRouteHandlerClient` taking request headers if cookies aren't present.
            // But typical setup is cookies.
            // Let's verify how `organization.js` handles requests. 
            // But for now, let's implement the logic.

            if (response.ok) {
                const data = await response.json();
                setVideoAccess(data);
                if (data.canAccess === false) {
                    setVideoBlocked(true);
                }
            }
        } catch (error) {
            console.error('Error checking video access:', error);
        }
    };

    const trackVideoView = async () => {
        if (!content || !content.course_id) return;

        try {
            // Check access first locally if we have it
            if (videoAccess && !videoAccess.canAccess) {
                setVideoBlocked(true);
                if (videoPlayerRef.current) {
                    videoPlayerRef.current.injectJavaScript('document.querySelector("video").pause();');
                }
                alert('Video limit reached: ' + videoAccess.reason);
                return;
            }

            const endpoint = getApiUrl('/api/student/video/track-view');
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    contentId: parseInt(id),
                    courseId: content.course_id,
                    chapterId: content.chapter_id,
                    contentTitle: content.title
                })
            });

            // Refresh access info after tracking
            checkVideoAccess();

        } catch (error) {
            console.error('Error tracking view:', error);
        }
    };

    const updateWatchTime = async (secondsToAdd, currentPosition) => {
        try {
            console.log('[ContentPlayer] updateWatchTime:', { secondsToAdd, currentPosition });
            const endpoint = getApiUrl('/api/student/video/update-watch-time');
            const { data: { session } } = await supabase.auth.getSession();

            const body = {
                contentId: parseInt(id),
                secondsWatched: secondsToAdd
            };

            if (currentPosition !== undefined) {
                body.lastPosition = currentPosition;
            } else {
                body.lastPosition = lastWatchUpdate + secondsToAdd;
            }

            // Perform direct DB update (bypassing potentially outdated API)
            const updatePayload = {
                updated_at: new Date().toISOString()
            };

            // Calculate new total time
            // We need to fetch current total first if we want to be accurate, 
            // but for now let's just increment if possible or trust the API for duration? 
            // Actually, for page numbers (PDF), we don't care about duration accumulation as much.
            // For video, we do. 
            // Safe approach: RPC? Or just specific columns.
            // Since we can't trust the API to handle the logic, we must do it here.

            // Let's just update last_position_seconds and rely on the API for total_watch_seconds?
            // No, the API ignores the request if we don't call it. 
            // Let's call BOTH: API for watch time (if video), and Direct for position.

            // 1. Call API for existing watch time logic (if seconds > 0)
            if (secondsToAdd > 0) {
                await fetch(endpoint, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        contentId: parseInt(id),
                        secondsWatched: secondsToAdd
                    })
                });
            }

            // 2. Direct Update for Position
            if (currentPosition !== undefined) {
                const { error: updateError } = await supabase
                    .from('content_progress')
                    .update({
                        last_position_seconds: Math.floor(currentPosition),
                        updated_at: new Date().toISOString()
                    })
                    .eq('member_id', memberId)
                    .eq('content_id', parseInt(id));

                if (updateError) console.error('Direct update failed:', updateError);
                else console.log('Direct update success: Position', currentPosition);
            }

            // Re-check access periodically? Maybe not every 10s to save calls, 
            // but we could decrement local counters.
            // For now, let's rely on initial check.
        } catch (error) {
            console.error('Error updating watch time:', error);
        }
    };

    const handleVideoEvents = (event) => {
        if (event.type === 'play') {
            trackVideoView();
        } else if (event.type === 'timeUpdate') {
            if (event.currentTime && event.currentTime - lastWatchUpdate >= 10) {
                const secondsToAdd = event.currentTime - lastWatchUpdate;
                // Basic sanity check to avoid huge jumps
                if (secondsToAdd > 0 && secondsToAdd < 60) {
                    updateWatchTime(secondsToAdd, event.currentTime);
                }
                setLastWatchUpdate(event.currentTime);
            }
            // Auto-complete at 90%
            if (event.duration && (event.currentTime / event.duration) > 0.9 && !isCompleted && !isMarkingComplete) {
                markAsComplete();
            }
        }
    };

    const markAsComplete = async () => {
        try {
            setIsMarkingComplete(true);
            console.log('=== MARK AS COMPLETE STARTED ===');

            const { data: { user } } = await supabase.auth.getUser();
            console.log('User:', user?.email, user?.id);
            if (!user) {
                console.error('No user found');
                alert('Please login to mark content as complete');
                return;
            }

            let { data: member } = await supabase.from('members').select('id').eq('auth_user_id', user.id).single();
            console.log('Member by auth_user_id:', member);

            if (!member) {
                const { data: emailMember } = await supabase.from('members').select('id').eq('email', user.email).single();
                member = emailMember;
                console.log('Member by email:', member);
            }

            if (!member) {
                console.error('No member found for user');
                alert('Member record not found. Please contact support.');
                return;
            }

            console.log('Upserting progress:', {
                member_id: member.id,
                content_id: parseInt(id),
                course_id: content.course_id,
                chapter_id: content.chapter_id,
                content_type: content.type,
                content_title: content.title
            });

            // Upsert content_progress
            const { data: upsertData, error } = await supabase
                .from('content_progress')
                .upsert({
                    member_id: member.id,
                    content_id: parseInt(id),
                    course_id: content.course_id,
                    chapter_id: content.chapter_id,
                    content_type: content.type,
                    content_title: content.title,
                    completed: true,
                    completion_percentage: 100,
                    completed_at: new Date().toISOString()
                }, { onConflict: 'member_id, content_id' })
                .select();

            console.log('Upsert response:', upsertData);
            console.log('Upsert error:', error);

            if (error) {
                console.error('Upsert failed:', error);
                throw error;
            }

            console.log('=== MARK AS COMPLETE SUCCESS ===');
            setIsCompleted(true);
            alert('Content marked as complete!');

            // Re-check feedback
            await checkFeedback();

        } catch (error) {
            console.error('Error marking complete:', error);
            alert(`Failed to mark as complete: ${error.message}`);
        } finally {
            setIsMarkingComplete(false);
        }
    };

    if (loading) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center">
                <ActivityIndicator size="large" color="#ffffff" />
            </View>
        );
    }

    if (!content) {
        return (
            <View className="flex-1 bg-slate-900 justify-center items-center p-4">
                <Text className="text-white text-lg">Content not found</Text>
                <Text className="text-slate-500 text-sm mt-2">Debug ID: {JSON.stringify(id)}</Text>
                <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-slate-800 px-4 py-2 rounded-lg">
                    <Text className="text-white">Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-slate-900" edges={['top']}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar barStyle="light-content" backgroundColor="#0f172a" />

            {/* Header / Back Button */}
            <View className="px-4 py-3 flex-row items-center bg-slate-900 border-b border-slate-800">
                <TouchableOpacity onPress={() => router.back()} className="mr-3 p-1">
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <Text className="text-white font-semibold text-lg flex-1" numberOfLines={1}>
                    {content.title}
                </Text>
            </View>

            <View className="flex-1 bg-slate-950 px-0">
                {content.type === 'video' ? (
                    <View className="flex-1 justify-center">
                        {videoAccess && (
                            <View className="bg-slate-800 p-3 mx-4 mt-4 rounded-lg border border-slate-700">
                                <View className="flex-row justify-between">
                                    {videoAccess.viewsRemaining !== undefined && videoAccess.viewsRemaining !== null && (
                                        <Text className="text-blue-400 text-xs font-bold">
                                            📹 {videoAccess.viewsRemaining} views left
                                        </Text>
                                    )}
                                    {videoAccess.watchTimeRemaining !== undefined && videoAccess.watchTimeRemaining !== null && (
                                        <Text className="text-blue-400 text-xs font-bold">
                                            ⏱️ {Math.round(videoAccess.watchTimeRemaining / 60)} mins left
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {videoBlocked ? (
                            <View className="w-full h-72 bg-black justify-center items-center p-8">
                                <Ionicons name="ban" size={48} color="#ef4444" />
                                <Text className="text-white font-bold text-xl mt-4">Limit Reached</Text>
                                <Text className="text-slate-400 text-center mt-2">{videoAccess?.reason || 'You have reached the viewing limit for this video.'}</Text>
                            </View>
                        ) : (
                            <CustomVideoPlayer
                                ref={videoPlayerRef}
                                source={{ uri: content.url }}
                                initialTime={lastPosition}
                                style={{ width: '100%', height: 300, backgroundColor: 'black' }}
                                onPlay={() => handleVideoEvents({ type: 'play' })}
                                onTimeUpdate={(data) => handleVideoEvents(data)}
                                onEnded={() => handleVideoEvents({ type: 'ended' })}
                                onError={(error) => {
                                    console.error('Video Player Error:', error);
                                    alert('Video Error: ' + error);
                                }}
                            />
                        )}
                        {!isCompleted && (
                            <View className="p-4">
                                <TouchableOpacity
                                    onPress={markAsComplete}
                                    disabled={isMarkingComplete}
                                    className="flex-row items-center justify-center p-4 rounded-xl bg-blue-600"
                                >
                                    {isMarkingComplete ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                                            <Text className="text-white font-bold ml-2 text-lg">
                                                Mark as Complete
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : content.type === 'pdf' ? (
                    <View className="flex-1">
                        <PdfViewer
                            url={content.url || getApiUrl(`/api/proxy-pdf?id=${content.id}`)}
                            headers={{ 'x-platform': 'mobile' }}
                            initialPage={lastPosition || 1}
                            onPageChanged={(page) => {
                                // Update progress on page flip (debounce?)
                                // Sending 0 seconds watched, but updating position
                                updateWatchTime(0, page);
                            }}
                        />
                        {!isCompleted && (
                            <View className="p-4 bg-slate-900 border-t border-slate-800">
                                <TouchableOpacity
                                    onPress={markAsComplete}
                                    disabled={isMarkingComplete}
                                    className="flex-row items-center justify-center p-4 rounded-xl bg-blue-600"
                                >
                                    {isMarkingComplete ? (
                                        <ActivityIndicator color="white" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle-outline" size={24} color="white" />
                                            <Text className="text-white font-bold ml-2 text-lg">
                                                Mark as Complete
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : content.type === 'exam' ? (
                    <ScrollView
                        className="flex-1"
                        contentContainerStyle={{ padding: 24, paddingBottom: 100 }}
                        showsVerticalScrollIndicator={false}
                    >
                        <View className="items-center mb-8">
                            <View className="w-20 h-20 bg-blue-500/10 rounded-full items-center justify-center mb-4 ring-4 ring-blue-500/20">
                                <Ionicons name="school" size={40} color="#3b82f6" />
                            </View>
                            <Text className="text-white text-2xl font-bold text-center mb-2">{content.title}</Text>
                            <Text className="text-slate-400 text-center">Ready to challenge yourself?</Text>
                        </View>

                        {/* Exam Details Badge */}
                        {examDetails && (
                            <View className="flex-row justify-between mb-8 bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
                                <View className="items-center flex-1 border-r border-slate-700">
                                    <View className="bg-blue-500/20 p-2 rounded-full mb-1">
                                        <Ionicons name="time" size={16} color="#60a5fa" />
                                    </View>
                                    <Text className="text-white font-bold">{examDetails.duration}</Text>
                                    <Text className="text-slate-400 text-[10px] uppercase tracking-wider">Minutes</Text>
                                </View>
                                <View className="items-center flex-1 border-r border-slate-700">
                                    <View className="bg-purple-500/20 p-2 rounded-full mb-1">
                                        <Ionicons name="list" size={16} color="#c084fc" />
                                    </View>
                                    <Text className="text-white font-bold">{examDetails.questions}</Text>
                                    <Text className="text-slate-400 text-[10px] uppercase tracking-wider">Questions</Text>
                                </View>
                                <View className="items-center flex-1 border-r border-slate-700">
                                    <View className="bg-orange-500/20 p-2 rounded-full mb-1">
                                        <Ionicons name="trophy" size={16} color="#fb923c" />
                                    </View>
                                    <Text className="text-white font-bold">{examDetails.marks}</Text>
                                    <Text className="text-slate-400 text-[10px] uppercase tracking-wider">Marks</Text>
                                </View>
                                <View className="items-center flex-1">
                                    {(() => {
                                        const isExhausted = examDetails.attemptsUsed >= examDetails.maxAttempts && examDetails.maxAttempts > 0;
                                        const remaining = examDetails.maxAttempts > 0 ? examDetails.maxAttempts - examDetails.attemptsUsed : '∞';
                                        return (
                                            <>
                                                <View className={`${isExhausted ? 'bg-red-500/20' : 'bg-green-500/20'} p-2 rounded-full mb-1`}>
                                                    <Ionicons name={isExhausted ? 'close-circle' : 'checkmark-circle'} size={16} color={isExhausted ? '#ef4444' : '#22c55e'} />
                                                </View>
                                                <Text className={`${isExhausted ? 'text-red-400' : 'text-green-400'} font-bold`}>
                                                    {isExhausted ? 'Used' : remaining === '∞' ? 'Unlimited' : `${remaining} Left`}
                                                </Text>
                                                <Text className="text-slate-400 text-[10px] uppercase tracking-wider">Attempts</Text>
                                            </>
                                        );
                                    })()}
                                </View>
                            </View>

                        )}

                        {/* Negative Marking Notice */}
                        {examDetails && (
                            examDetails.negativeMarkingEnabled ? (
                                <View className="mb-6 flex-row items-center justify-between p-3.5 rounded-xl border bg-amber-500/10 border-amber-500/30">
                                    <View className="flex-row items-center gap-2.5 flex-1 mr-2">
                                        <Ionicons name="alert-circle" size={20} color="#f59e0b" />
                                        <View className="flex-1">
                                            <Text className="text-amber-400 font-bold text-xs uppercase tracking-wider">Negative Marking</Text>
                                            <Text className="text-slate-300 text-xs mt-0.5">
                                                -{examDetails.negativeMarks} marks for each incorrect answer
                                            </Text>
                                        </View>
                                    </View>
                                    <View className="bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-500/40">
                                        <Text className="text-amber-300 font-extrabold text-xs">-{examDetails.negativeMarks}</Text>
                                    </View>
                                </View>
                            ) : (
                                <View className="mb-6 flex-row items-center p-3 rounded-xl border bg-slate-800/40 border-slate-700/40">
                                    <Ionicons name="checkmark-circle-outline" size={18} color="#22c55e" style={{ marginRight: 8 }} />
                                    <Text className="text-slate-300 text-xs font-medium">No negative marking</Text>
                                </View>
                            )
                        )}

                        {/* Mode Selection Toggle */}
                        {examDetails?.allowModeToggle && (
                            <View className="mb-6">
                                <Text className="text-white font-bold mb-3">Select Mode</Text>
                                <View className="flex-row bg-slate-800 p-1 rounded-xl border border-slate-700">
                                    <TouchableOpacity
                                        onPress={() => setSelectedMode('exam')}
                                        className={`flex-1 py-3 items-center rounded-lg ${selectedMode === 'exam' ? 'bg-blue-600' : 'bg-transparent'}`}
                                    >
                                        <Text className={`font-bold ${selectedMode === 'exam' ? 'text-white' : 'text-slate-400'}`}>Exam Mode</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setSelectedMode('quiz')}
                                        className={`flex-1 py-3 items-center rounded-lg ${selectedMode === 'quiz' ? 'bg-purple-600' : 'bg-transparent'}`}
                                    >
                                        <Text className={`font-bold ${selectedMode === 'quiz' ? 'text-white' : 'text-slate-400'}`}>Quiz Mode</Text>
                                    </TouchableOpacity>
                                </View>
                                <Text className="text-slate-500 text-xs mt-2 px-1">
                                    {selectedMode === 'exam' ? 'Submit answers at the end. No immediate feedback.' : 'Check answers instantly. Great for practice.'}
                                </Text>
                            </View>
                        )}

                        {/* Start Exam Button - Disabled if attempts exhausted */}
                        {(() => {
                            const attemptsExhausted = examDetails?.attemptsUsed >= examDetails?.maxAttempts && examDetails?.maxAttempts > 0;

                            return (
                                <TouchableOpacity
                                    onPress={() => {
                                        if (!attemptsExhausted) {
                                            router.replace({
                                                pathname: `/exam/${content.exam_id}/take`,
                                                params: {
                                                    courseId: content.course_id,
                                                    quizMode: selectedMode === 'quiz'
                                                }
                                            });
                                        }
                                    }}

                                    disabled={attemptsExhausted}
                                    className={`${attemptsExhausted ? 'bg-slate-700' : 'bg-blue-600'} w-full py-4 rounded-xl items-center shadow-lg ${attemptsExhausted ? 'shadow-slate-900/50' : 'shadow-blue-900/50'} mb-8 ${attemptsExhausted ? 'opacity-50' : 'active:opacity-90'}`}
                                >
                                    {attemptsExhausted ? (
                                        <>
                                            <Text className="text-slate-400 font-bold text-lg">🚫 All Attempts Used</Text>
                                            <Text className="text-slate-500 text-xs mt-1">View your results below</Text>
                                        </>
                                    ) : (
                                        <>
                                            <Text className="text-white font-bold text-lg">Start Exam Now</Text>
                                            <Text className="text-blue-200 text-xs mt-1">Best of luck!</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            );
                        })()}

                        {/* Past Attempts */}
                        {attempts.length > 0 && (
                            <View>
                                <View className="flex-row items-center justify-between mb-4">
                                    <Text className="text-white font-bold text-lg">History</Text>
                                    <View className="bg-slate-800 px-2 py-1 rounded">
                                        <Text className="text-slate-400 text-xs">{attempts.length} Attempts</Text>
                                    </View>
                                </View>

                                {attempts.map((attempt, idx) => {
                                    const percentage = Math.round((attempt.score / attempt.total_marks) * 100) || 0;
                                    let scoreColor = 'text-slate-400';
                                    if (percentage >= 80) scoreColor = 'text-green-400';
                                    else if (percentage >= 50) scoreColor = 'text-yellow-400';
                                    else scoreColor = 'text-red-400';

                                    return (
                                        <View key={attempt.id} className="bg-slate-800 p-4 rounded-xl mb-3 border border-slate-700 flex-row justify-between items-center">
                                            <View className="flex-1">
                                                <View className="flex-row items-center mb-1">
                                                    <Text className="text-white font-semibold mr-2">Attempt {attempts.length - idx}</Text>
                                                    <Text className="text-slate-500 text-xs">{new Date(attempt.submitted_at).toLocaleDateString()}</Text>
                                                </View>
                                                <Text className="text-slate-300 text-sm">
                                                    Score: <Text className={`font-bold ${scoreColor}`}>{attempt.score}</Text> <Text className="text-slate-500">/ {attempt.total_marks}</Text>
                                                </Text>
                                            </View>
                                            <TouchableOpacity
                                                onPress={() => router.push({
                                                    pathname: `/exam/${content.exam_id}/review`,
                                                    params: { id: content.exam_id, attemptId: attempt.id }
                                                })}
                                                className="bg-slate-700 px-4 py-2 rounded-lg active:bg-slate-600"
                                            >
                                                <Text className="text-white text-xs font-semibold">Review</Text>
                                            </TouchableOpacity>
                                        </View>
                                    );
                                })}
                            </View>
                        )}
                    </ScrollView>
                ) : (
                    <View className="flex-1 justify-center items-center">
                        <Text className="text-slate-400">Unsupported content type</Text>
                    </View>
                )}
            </View>


            {/* Feedback Modal */}
            <FeedbackModal
                visible={showFeedbackModal}
                form={feedbackForm}
                courseId={content?.course_id}
                onClose={() => setShowFeedbackModal(false)}
                onSuccess={() => {
                    setShowFeedbackModal(false);
                    // Optional: Toast message
                }}
            />
        </SafeAreaView >
    );
}
