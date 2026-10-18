'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../supabaseClient';
import SimpleCoursesListView from './SimpleCoursesListView';
import { BookOpen, Award, Search, X, Filter, ArrowUpDown, Book, FileText } from 'lucide-react';

const CourseThumbnail = ({ src, alt, isCompleted }) => {
    const [imgError, setImgError] = useState(false);

    return (
        <div className="relative">
            {src && !imgError ? (
                <img
                    src={src}
                    alt={alt}
                    className="course-list-thumbnail"
                    onError={() => setImgError(true)}
                />
            ) : (
                <div className="course-list-thumbnail flex items-center justify-center">
                    <Book size={20} className="text-gray-400" />
                </div>
            )}
            {isCompleted && (
                <div className="absolute -top-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
                    <Award size={12} className="text-white" />
                </div>
            )}
        </div>
    );
};

const MyCourses = () => {
    const { user } = useAuth();
    const router = useRouter();
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [sortBy, setSortBy] = useState('newest');
    const [debugInfo, setDebugInfo] = useState({ studentBatches: [], allCourses: [] });

    useEffect(() => {
        console.log('🔄 MyCourses useEffect triggered, user:', user?.email);
        if (user?.email) {
            console.log('✅ User email exists, calling fetchEnrolledCourses...');
            fetchEnrolledCourses();
            fetchDebugInfo();
        } else {
            console.log('❌ No user email, skipping fetch');
        }
    }, [user]);

    const fetchDebugInfo = async () => {
        const { data: member } = await supabase.from('members').select('id').eq('email', user.email).single();
        if (member) {
            const { data: batches } = await supabase.from('batch_members').select('batch_id').eq('member_id', member.id);
            const batchIds = batches?.map(b => b.batch_id) || [];
            const { data: allCourses } = await supabase.from('courses').select('*');
            setDebugInfo({
                studentBatches: batchIds,
                allCourses: allCourses || []
            });
        }
    };

    const fetchEnrolledCourses = async () => {
        try {
            console.log('🎓 ===== FETCHING ENROLLED COURSES START ===== 🎓');
            console.log('Fetching courses for student:', user.email);

            const { data: member, error: memberError } = await supabase
                .from('members')
                .select('id, email')
                .eq('email', user.email)
                .single();

            if (memberError) throw memberError;
            if (!member) {
                console.log('No member found for email:', user.email);
                setLoading(false);
                return;
            }

            console.log('Member data:', member);

            const { data: batchMemberships, error: batchMemberError } = await supabase
                .from('batch_members')
                .select('batch_id')
                .eq('member_id', member.id);

            if (batchMemberError) {
                console.error('Error fetching batch memberships:', batchMemberError);
            }

            const studentBatches = (batchMemberships || []).map(bm => bm.batch_id);
            console.log('Student batches:', studentBatches);

            let validBatches = [];
            if (studentBatches.length > 0) {
                const { data: subscriptions, error: subError } = await supabase
                    .from('subscriptions')
                    .select('batch_id, status, expires_on')
                    .eq('member_id', member.id)
                    .in('batch_id', studentBatches);

                if (subError) {
                    console.error('Error fetching subscriptions:', subError);
                } else {
                    const today = new Date().toISOString().split('T')[0];
                    validBatches = (subscriptions || [])
                        .filter(sub => {
                            if (sub.status !== 'Active') return false;
                            if (sub.expires_on && sub.expires_on < today) return false;
                            return true;
                        })
                        .map(sub => sub.batch_id);

                    console.log('Valid batches after subscription check:', validBatches);
                }
            }

            const { data: manualEnrollments, error: enrollError } = await supabase
                .from('enrollments')
                .select(`
                    *,
                    courses:course_id (
                        *,
                        chapters:chapters(id, chapter_contents(count))
                    )
                `)
                .eq('member_id', member.id)
                .in('status', ['active', 'completed']);

            if (enrollError) throw enrollError;
            console.log('Manual enrollments:', manualEnrollments?.length || 0);

            let batchCourses = [];
            if (validBatches.length > 0) {
                const { data: batchCourseLinks, error: batchError } = await supabase
                    .from('batch_courses')
                    .select('course_id')
                    .in('batch_id', validBatches);

                if (batchError) {
                    console.error('Error fetching batch courses:', batchError);
                } else {
                    console.log('Batch course links found:', batchCourseLinks?.length || 0);

                    if (batchCourseLinks && batchCourseLinks.length > 0) {
                        const courseIds = batchCourseLinks.map(bc => bc.course_id);
                        console.log('Course IDs from batches:', courseIds);

                        const { data: courseData, error: courseError } = await supabase
                            .from('courses')
                            .select('*, chapters(id, chapter_contents(count))')
                            .in('id', courseIds);

                        if (courseError) {
                            console.error('Error fetching batch courses data:', courseError);
                        } else {
                            const linkedCourses = (courseData || []).map(course => ({
                                id: `batch-${course.id}`,
                                course_id: course.id,
                                progress: 0,
                                status: 'active',
                                enrolled_at: new Date().toISOString(),
                                source: 'batch',
                                courses: course
                            }));
                            batchCourses = [...batchCourses, ...linkedCourses];
                        }
                    }
                }

                const { data: batchAllowedCourses, error: batchAllowedError } = await supabase
                    .from('courses')
                    .select('*, chapters(id, chapter_contents(count))');

                if (batchAllowedError) {
                    console.error('Error fetching batch-allowed courses:', batchAllowedError);
                } else if (batchAllowedCourses && batchAllowedCourses.length > 0) {
                    const allowedBatchCourses = batchAllowedCourses.filter(course => {
                        if (!course.allowed_batches || !Array.isArray(course.allowed_batches)) return false;
                        return course.allowed_batches.some(batchId => validBatches.includes(batchId));
                    });

                    console.log('Found courses via allowed_batches (JS filter):', allowedBatchCourses.length);

                    const mappedAllowedCourses = allowedBatchCourses.map(course => ({
                        id: `batch-allowed-${course.id}`,
                        course_id: course.id,
                        progress: 0,
                        status: 'active',
                        enrolled_at: new Date().toISOString(),
                        source: 'batch',
                        courses: course
                    }));

                    const existingIds = new Set(batchCourses.map(bc => bc.course_id));
                    const newCourses = mappedAllowedCourses.filter(c => !existingIds.has(c.course_id));
                    batchCourses = [...batchCourses, ...newCourses];
                }

                console.log('Total batch courses found:', batchCourses.length);
            } else {
                console.log('Student has no batches assigned');
            }

            let productCourses = [];
            const { data: orders, error: ordersError } = await supabase
                .from('orders')
                .select('product_id')
                .eq('member_id', member.id)
                .eq('status', 'completed');

            console.log('Orders for member:', member.id, orders);

            if (ordersError) {
                console.error('Error fetching orders:', ordersError);
            } else if (orders && orders.length > 0) {
                const purchasedProductIds = orders.map(o => o.product_id).filter(Boolean);
                console.log('Purchased product IDs:', purchasedProductIds);

                if (purchasedProductIds.length > 0) {
                    const { data: allowedProductCourses, error: productAccessError } = await supabase
                        .from('courses')
                        .select('*, chapters(id, chapter_contents(count))')
                        .overlaps('allowed_products', purchasedProductIds);

                    console.log('Product-allowed courses:', allowedProductCourses);

                    if (productAccessError) {
                        console.error('Error fetching product-allowed courses:', productAccessError);
                    } else if (allowedProductCourses && allowedProductCourses.length > 0) {
                        const mappedProductCourses = allowedProductCourses.map(course => ({
                            id: `product-allowed-${course.id}`,
                            course_id: course.id,
                            progress: 0,
                            status: 'active',
                            enrolled_at: new Date().toISOString(),
                            source: 'product',
                            courses: course
                        }));
                        productCourses = mappedProductCourses;
                        console.log('Courses found via product purchase:', productCourses.length);
                    }
                }
            }

            let publicCourses = [];
            const { data: publicCoursesData, error: publicCoursesError } = await supabase
                .from('courses')
                .select('*, chapters(id, chapter_contents(count))')
                .eq('is_public', true);

            if (publicCoursesError) {
                console.error('Error fetching public courses:', publicCoursesError);
            } else if (publicCoursesData && publicCoursesData.length > 0) {
                console.log('Public courses found:', publicCoursesData.length);
                const mappedPublicCourses = publicCoursesData.map(course => ({
                    id: `public-${course.id}`,
                    course_id: course.id,
                    progress: 0,
                    status: 'active',
                    enrolled_at: new Date().toISOString(),
                    source: 'public',
                    courses: course
                }));
                publicCourses = mappedPublicCourses;
            }

            const allCourses = [
                ...(manualEnrollments || []),
                ...batchCourses,
                ...productCourses,
                ...publicCourses
            ];

            console.log('Total courses before deduplication:', allCourses.length);

            const courseMap = new Map();
            allCourses.forEach(enrollment => {
                const courseId = enrollment.course_id;
                if (!courseMap.has(courseId)) {
                    courseMap.set(courseId, enrollment);
                } else {
                    const existing = courseMap.get(courseId);
                    if (enrollment.source !== 'batch' && enrollment.source !== 'public') {
                        courseMap.set(courseId, enrollment);
                    }
                }
            });

            const uniqueCourses = Array.from(courseMap.values());
            console.log('Unique courses after deduplication:', uniqueCourses.length);

            const coursesWithChapters = await Promise.all(
                uniqueCourses.map(async (enrollment) => {
                    const { data: chapters, count: chapterCount } = await supabase
                        .from('chapters')
                        .select('id', { count: 'exact' })
                        .eq('course_id', enrollment.course_id);

                    let contentCount = 0;
                    if (chapters && chapters.length > 0) {
                        const chapterIds = chapters.map(c => c.id);
                        const { count } = await supabase
                            .from('chapter_contents')
                            .select('*', { count: 'exact', head: true })
                            .in('chapter_id', chapterIds);
                        contentCount = count || 0;
                    }

                    return {
                        ...enrollment,
                        totalChapters: chapterCount || 0,
                        totalContents: contentCount
                    };
                })
            );

            if (coursesWithChapters.length === 0 && user.email === 'student@demo.com') {
                const mockCourses = [
                    {
                        id: 'mock-1',
                        course_id: 'c1',
                        progress: 45,
                        status: 'active',
                        enrolled_at: new Date().toISOString(),
                        totalChapters: 12,
                        courses: {
                            id: 'c1',
                            title: 'Complete React Developer Course 2024',
                            thumbnail_url: 'https://img.youtube.com/vi/bMknfKXIFA8/maxresdefault.jpg',
                            description: 'Master React from scratch',
                            instructor_name: 'Sarah Smith',
                            duration: '12h 30m'
                        }
                    },
                    {
                        id: 'mock-2',
                        course_id: 'c2',
                        progress: 100,
                        status: 'completed',
                        enrolled_at: new Date(Date.now() - 86400000 * 10).toISOString(),
                        totalChapters: 8,
                        courses: {
                            id: 'c2',
                            title: 'Advanced JavaScript Concepts',
                            thumbnail_url: 'https://img.youtube.com/vi/2pL28CcEijU/maxresdefault.jpg',
                            description: 'Deep dive into JS',
                            instructor_name: 'John Doe',
                            duration: '8h 15m'
                        }
                    },
                    {
                        id: 'mock-3',
                        course_id: 'c3',
                        progress: 0,
                        status: 'active',
                        enrolled_at: new Date(Date.now() - 86400000).toISOString(),
                        totalChapters: 20,
                        courses: {
                            id: 'c3',
                            title: 'Python for Data Science',
                            thumbnail_url: 'https://img.youtube.com/vi/rfscVS0vtbw/maxresdefault.jpg',
                            description: 'Learn Python for AI',
                            instructor_name: 'Alice Johnson',
                            duration: '15h 45m'
                        }
                    }
                ];
                setCourses(mockCourses);
            } else {
                setCourses(coursesWithChapters);
            }
        } catch (error) {
            console.error('Error fetching courses:', error);
        } finally {
            setLoading(false);
        }
    };

    const getProgressStatus = (progress) => {
        if (progress === 0) return { text: 'Not Started', color: '#999' };
        if (progress === 100) return { text: 'Completed', color: '#10b981' };
        return { text: 'In Progress', color: '#0088cc' };
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const filteredCourses = courses
        .filter(enrollment => {
            const searchLower = searchTerm.toLowerCase();
            const title = enrollment.courses?.title?.toLowerCase() || '';
            const instructor = enrollment.courses?.instructor_name?.toLowerCase() || '';
            const matchesSearch = title.includes(searchLower) || instructor.includes(searchLower);

            let matchesStatus = true;
            if (filterStatus === 'in_progress') {
                matchesStatus = enrollment.progress > 0 && enrollment.progress < 100;
            } else if (filterStatus === 'completed') {
                matchesStatus = enrollment.progress === 100;
            } else if (filterStatus === 'not_started') {
                matchesStatus = enrollment.progress === 0;
            }

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            if (sortBy === 'newest') {
                return new Date(b.enrolled_at || 0) - new Date(a.enrolled_at || 0);
            } else if (sortBy === 'oldest') {
                return new Date(a.enrolled_at || 0) - new Date(b.enrolled_at || 0);
            } else if (sortBy === 'alphabetical') {
                return (a.courses?.title || '').localeCompare(b.courses?.title || '');
            } else if (sortBy === 'progress_high') {
                return (b.progress || 0) - (a.progress || 0);
            } else if (sortBy === 'progress_low') {
                return (a.progress || 0) - (b.progress || 0);
            }
            return 0;
        });

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px] text-base text-gray-500">
                Loading courses...
            </div>
        );
    }

    return (
        <div className="py-8 px-6 max-w-[1400px] mx-auto min-h-screen">
            {/* Header Section */}
            <div className="mb-12 pb-6 border-b-2 border-gray-100">
                <div className="flex justify-between items-start flex-wrap gap-6 mb-6">
                    <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-3 mb-3">
                            <BookOpen size={36} className="text-[var(--primary-color)]" />
                            <h1 className="text-4xl font-bold text-gray-900 m-0 leading-tight">
                                My Courses
                            </h1>
                        </div>
                        <p className="text-base text-gray-500 m-0 font-medium">
                            {filteredCourses.length} {filteredCourses.length === 1 ? 'course' : 'courses'} enrolled
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative min-w-[320px] flex-1 max-w-[400px]">
                        <input
                            type="text"
                            placeholder="Search your courses..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full py-3.5 px-5 pl-12 rounded-xl border-2 border-gray-200 text-[15px] outline-none transition-all bg-white shadow-sm focus:border-[var(--primary-color)] focus:shadow-lg"
                        />
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search size={20} />
                        </div>
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-100 border-none rounded-md text-gray-500 cursor-pointer p-1.5 flex items-center justify-center transition-colors hover:bg-gray-200"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Course Grid/List */}
            {courses.length === 0 ? (
                <div className="text-center py-20 px-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <BookOpen size={64} className="text-gray-300 mb-5 mx-auto" />
                    <h3 className="text-[22px] font-semibold mb-3 text-gray-700">
                        No courses yet
                    </h3>
                    <p className="text-gray-500 text-base max-w-[400px] mx-auto">
                        You haven't enrolled in any courses yet. Start your learning journey today!
                    </p>
                </div>
            ) : filteredCourses.length === 0 ? (
                <div className="text-center py-20 px-8 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                    <div className="mb-5 text-gray-300 flex justify-center">
                        <Search size={64} />
                    </div>
                    <h3 className="text-[22px] font-semibold mb-3 text-gray-700">
                        No matches found
                    </h3>
                    <p className="text-gray-500 text-base mb-6">
                        We couldn't find any courses matching "{searchTerm}".
                    </p>
                    <button
                        onClick={() => setSearchTerm('')}
                        className="py-3 px-6 bg-[var(--primary-color)] border-none rounded-lg text-white text-[15px] font-semibold cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    >
                        Clear Search
                    </button>
                </div>
            ) : (
                <SimpleCoursesListView courses={filteredCourses} />
            )}
        </div>
    );
};

export default MyCourses;
