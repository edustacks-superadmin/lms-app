import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUsers } from '../context/UserContext';
import { useInstitute } from '../context/InstituteContext';
import { useTransactions } from '../context/TransactionContext';
import { supabase } from '../supabaseClient';
import { ChevronLeft, Edit, Mail, Phone, MapPin, Calendar, User, Shield, Layers, Plus, TrendingUp, Search, Award } from 'lucide-react';
import { getStateName } from '../utils/indianStates';

const MemberDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { institute } = useInstitute();
    const { transactions } = useTransactions();
    const { users, loading: contextLoading } = useUsers();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);
    const [directOrders, setDirectOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(false);

    // Exam stats & history states
    const [loadingExams, setLoadingExams] = useState(false);
    const [examStats, setExamStats] = useState({
        totalTestsTaken: 0,
        totalQuestionsAttempted: 0,
        totalCorrectAnswers: 0
    });
    const [memberAttempts, setMemberAttempts] = useState([]);
    const [examSearch, setExamSearch] = useState('');
    const [showExamsTable, setShowExamsTable] = useState(true);

    const orderPrefix = useMemo(() => {
        if (!institute?.name) return 'ORD';
        return institute.name.substring(0, 6).toUpperCase();
    }, [institute]);

    useEffect(() => {
        const loadMember = async () => {
            if (contextLoading) return;

            const foundUser = users.find(u => String(u.id) === String(id));
            if (foundUser) {
                setUser(foundUser);
                setLoading(false);
                return;
            }

            try {
                const { data, error } = await supabase
                    .from('members')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (data) {
                    setUser(data);
                }
            } catch (err) {
                console.error('Error fetching member directly:', err);
            } finally {
                setLoading(false);
            }
        };

        loadMember();
    }, [id, users, contextLoading]);

    useEffect(() => {
        if (user?.id) {
            const fetchSubscriptions = async () => {
                const { data, error } = await supabase
                    .from('subscriptions')
                    .select('*, batch:batches(name)')
                    .eq('member_id', user.id)
                    .order('expires_on', { ascending: false });

                if (error) console.error('Error fetching subscriptions:', error);
                else setSubscriptions(data || []);
            };
            fetchSubscriptions();
        }
    }, [user]);

    // Fetch Orders directly for this member
    useEffect(() => {
        const fetchOrders = async () => {
            const memberId = user?.id || id;
            const memberEmail = user?.email;
            if (!memberId && !memberEmail) return;

            setLoadingOrders(true);
            try {
                const orParts = [];
                if (memberId) {
                    orParts.push(`member_id.eq.${memberId}`);
                    orParts.push(`user_id.eq.${memberId}`);
                }
                if (memberEmail) {
                    orParts.push(`user_email.ilike.${memberEmail}`);
                }

                const { data, error } = await supabase
                    .from('orders')
                    .select('*, products(title)')
                    .or(orParts.join(','))
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    setDirectOrders(data);
                }
            } catch (err) {
                console.error('Error fetching member orders:', err);
            } finally {
                setLoadingOrders(false);
            }
        };

        fetchOrders();
    }, [user, id]);

    // Fetch Exams data for this member
    useEffect(() => {
        const fetchExamData = async () => {
            const memberId = user?.id || id;
            if (!memberId) return;

            setLoadingExams(true);
            try {
                // 1. Fetch attempts for this member
                const { data: attempts, error: attError } = await supabase
                    .from('exam_attempts')
                    .select('*')
                    .eq('member_id', memberId)
                    .order('started_at', { ascending: false });

                if (attError) throw attError;
                if (!attempts || attempts.length === 0) {
                    setMemberAttempts([]);
                    setExamStats({ totalTestsTaken: 0, totalQuestionsAttempted: 0, totalCorrectAnswers: 0 });
                    return;
                }

                // 2. Fetch exams & courses
                const examIds = [...new Set(attempts.map(a => a.exam_id).filter(Boolean))];
                let examsMap = {};
                if (examIds.length > 0) {
                    const { data: examsData } = await supabase
                        .from('exams')
                        .select('id, title, total_marks, passing_marks, number_of_questions, course_id, courses(id, title)')
                        .in('id', examIds);

                    (examsData || []).forEach(e => { examsMap[e.id] = e; });
                }

                // 3. Fetch answers for all attempts of this member
                const attemptIds = attempts.map(a => a.id);
                let answersByAttempt = {};
                if (attemptIds.length > 0) {
                    const { data: answersData } = await supabase
                        .from('exam_answers')
                        .select('attempt_id, is_correct, selected_option_index, marks_obtained')
                        .in('attempt_id', attemptIds);

                    (answersData || []).forEach(ans => {
                        if (!answersByAttempt[ans.attempt_id]) answersByAttempt[ans.attempt_id] = [];
                        answersByAttempt[ans.attempt_id].push(ans);
                    });
                }

                // 4. Fetch ranks (all attempts for these exams to rank the member)
                let ranksByExam = {};
                if (examIds.length > 0) {
                    const { data: allAttemptsForExams } = await supabase
                        .from('exam_attempts')
                        .select('id, exam_id, score')
                        .in('exam_id', examIds);

                    (allAttemptsForExams || []).forEach(a => {
                        if (!ranksByExam[a.exam_id]) ranksByExam[a.exam_id] = [];
                        ranksByExam[a.exam_id].push(a);
                    });
                    Object.keys(ranksByExam).forEach(eid => {
                        ranksByExam[eid].sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0));
                    });
                }

                // 5. Compute stats and row items
                let totalAttemptedAll = 0;
                let totalCorrectAll = 0;

                const processedAttempts = attempts.map(att => {
                    const exam = examsMap[att.exam_id] || {};
                    const answers = answersByAttempt[att.id] || [];

                    let correct = 0;
                    let incorrect = 0;
                    let attempted = 0;

                    answers.forEach(a => {
                        const hasChosen = a.selected_option_index !== null && a.selected_option_index !== undefined && a.selected_option_index >= 0;
                        if (hasChosen) {
                            attempted++;
                            if (a.is_correct) {
                                correct++;
                            } else {
                                incorrect++;
                            }
                        }
                    });

                    const totalQ = exam.number_of_questions || answers.length || 0;
                    const unanswered = Math.max(0, totalQ - attempted);

                    totalAttemptedAll += attempted;
                    totalCorrectAll += correct;

                    const maxScore = att.total_marks || exam.total_marks || 0;
                    const score = Number(att.score || 0);
                    const percentage = maxScore > 0
                        ? ((score / maxScore) * 100).toFixed(1)
                        : (totalQ > 0 ? ((correct / totalQ) * 100).toFixed(1) : '0.0');

                    const passMarks = exam.passing_marks || 0;
                    const isPassed = passMarks > 0 ? score >= passMarks : (Number(percentage) >= 40);

                    // Rank
                    const examAttemptsList = ranksByExam[att.exam_id] || [];
                    const rankIdx = examAttemptsList.findIndex(a => a.id === att.id);
                    const rankDisplay = rankIdx !== -1 ? `${rankIdx + 1}` : '--';

                    return {
                        id: att.id,
                        examId: att.exam_id,
                        examTitle: exam.title || 'Untitled Exam',
                        totalQuestions: totalQ,
                        courseTitle: exam.courses?.title || '--',
                        correct,
                        incorrect,
                        unanswered,
                        percentage: `${percentage}%`,
                        score: `${score} / ${maxScore}`,
                        rawScore: score,
                        rank: rankDisplay,
                        result: isPassed ? 'Passed' : 'Failed',
                        startDate: att.started_at ? new Date(att.started_at) : null
                    };
                });

                setMemberAttempts(processedAttempts);
                setExamStats({
                    totalTestsTaken: attempts.length,
                    totalQuestionsAttempted: totalAttemptedAll,
                    totalCorrectAnswers: totalCorrectAll
                });
            } catch (err) {
                console.error('Error fetching member exam details:', err);
            } finally {
                setLoadingExams(false);
            }
        };

        fetchExamData();
    }, [user, id]);

    const formatExamDate = (date) => {
        if (!date) return '--';
        const d = new Date(date);
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        let hours = d.getHours();
        const minutes = String(d.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12;
        return `${day}/${month}/${year} ${hours}:${minutes} ${ampm}`;
    };

    const filteredAttempts = useMemo(() => {
        if (!examSearch.trim()) return memberAttempts;
        const q = examSearch.toLowerCase();
        return memberAttempts.filter(a =>
            a.examTitle?.toLowerCase().includes(q) ||
            a.courseTitle?.toLowerCase().includes(q) ||
            a.result?.toLowerCase().includes(q)
        );
    }, [memberAttempts, examSearch]);

    // Combine transactions context and direct orders
    const memberOrders = useMemo(() => {
        const memberId = user?.id || id;
        const memberEmail = user?.email?.toLowerCase();

        const contextMatches = (transactions || []).filter(t => {
            const matchesId = memberId && (String(t.member_id) === String(memberId) || String(t.user_id) === String(memberId));
            const matchesEmail = memberEmail && t.user_email && t.user_email.toLowerCase() === memberEmail;
            return matchesId || matchesEmail;
        });

        const map = new Map();
        [...directOrders, ...contextMatches].forEach(o => {
            if (o && o.id) map.set(o.id, { ...map.get(o.id), ...o });
        });

        return Array.from(map.values()).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }, [transactions, directOrders, user, id]);

    const formatOrderDate = (dateString) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        const day = date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        let time = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
        time = time.replace(' AM', ' a.m.').replace(' PM', ' p.m.');
        return `${day} ${time}`;
    };

    const getOrderItems = (order) => {
        try {
            if (order.payment_notes) {
                const notes = typeof order.payment_notes === 'string'
                    ? JSON.parse(order.payment_notes)
                    : order.payment_notes;
                if (notes?.items && Array.isArray(notes.items) && notes.items.length > 0) {
                    return notes.items.map(i => i.title).join(', ');
                }
            }
        } catch (e) {
            // ignore
        }
        return order.products?.title || order.product?.title || order.product_name || 'Course / Material';
    };

    const getPaymentDetails = (order) => {
        if (order.payment_method === 'razorpay') {
            return order.razorpay_payment_id ? 'Card' : 'Razorpay';
        }
        if (order.payment_method) {
            return order.payment_method.charAt(0).toUpperCase() + order.payment_method.slice(1);
        }
        return 'Card';
    };

    if (contextLoading || loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '40px', color: '#666' }}>
                Loading member details...
            </div>
        );
    }

    if (!user) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px', color: '#666' }}>
                <p>Member not found</p>
                <button
                    className="btn btn-outline"
                    onClick={() => navigate('/members')}
                    style={{ marginTop: '16px' }}
                >
                    Back to Members
                </button>
            </div>
        );
    }

    const DetailItem = ({ icon: Icon, label, value }) => (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
            <div style={{ marginTop: '2px', color: '#666' }}>
                <Icon size={18} />
            </div>
            <div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '2px' }}>{label}</div>
                <div style={{ fontSize: '14px', color: '#1a1a1a', fontWeight: '500' }}>{value || '--'}</div>
            </div>
        </div>
    );

    return (
        <div className="container" style={{ padding: '24px 0 40px' }}>
            {/* Header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <button
                                    onClick={() => navigate('/members')}
                                    className="btn-icon"
                                    style={{ backgroundColor: 'white', border: '1px solid #e0e0e0' }}
                                >
                                    <ChevronLeft size={20} color="#666" />
                                </button>
                                <div>
                                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: 0 }}>Member Details</h1>
                                    <p style={{ color: '#666', marginTop: '4px', fontSize: '14px' }}>View member information</p>
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => navigate(`/members/${id}/progress`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: 'white' }}
                                >
                                    <TrendingUp size={16} /> Progress Report
                                </button>
                                <button
                                    className="btn btn-primary"
                                    onClick={() => navigate(`/edit-user/${id}`)}
                                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Edit size={16} /> Edit Member
                                </button>
                            </div>
                        </div>

                        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
                            <div className="card-body" style={{ padding: '32px' }}>
                                {/* Profile Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid #eee' }}>
                                    <div style={{
                                        width: '100px',
                                        height: '100px',
                                        borderRadius: '50%',
                                        backgroundColor: '#f5f5f5',
                                        border: '2px solid #e0e0e0',
                                        overflow: 'hidden',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        {user.photo_url ? (
                                            <img
                                                src={user.photo_url}
                                                alt={user.display_name}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            />
                                        ) : (
                                            <span style={{ fontSize: '32px', color: '#999', fontWeight: '600' }}>
                                                {user.display_name ? user.display_name.charAt(0).toUpperCase() : 'U'}
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h2 style={{ fontSize: '24px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px 0' }}>
                                            {user.display_name || user.username}
                                        </h2>
                                        <div style={{ display: 'flex', gap: '12px' }}>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                backgroundColor: '#e3f2fd',
                                                color: '#1976d2',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textTransform: 'capitalize'
                                            }}>
                                                {user.role || 'Student'}
                                            </span>
                                            <span style={{
                                                padding: '4px 12px',
                                                borderRadius: '16px',
                                                backgroundColor: user.status === 'active' ? '#e8f5e9' : '#ffebee',
                                                color: user.status === 'active' ? '#2e7d32' : '#c62828',
                                                fontSize: '12px',
                                                fontWeight: '600',
                                                textTransform: 'capitalize'
                                            }}>
                                                {user.status || 'Active'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Details Grid */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
                                    {/* Left Column */}
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '16px' }}>Personal Information</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <DetailItem icon={User} label="Full Name" value={`${user.first_name || ''} ${user.last_name || ''}`.trim()} />
                                            <DetailItem icon={Mail} label="Email Address" value={user.email} />
                                            <DetailItem icon={Phone} label="Mobile Number" value={user.phone_number || user.mobile} />
                                            <DetailItem icon={Calendar} label="Birth Date" value={user.birth_date || null} />
                                            <DetailItem icon={User} label="Gender" value={user.gender} />
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div>
                                        <h3 style={{ fontSize: '16px', fontWeight: '600', color: '#1a1a1a', marginBottom: '16px' }}>Account & Address</h3>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <DetailItem icon={Shield} label="Username" value={user.username} />
                                            <DetailItem icon={Layers} label="Batches" value={
                                                Array.isArray(user.batchIds) && user.batchIds.length > 0
                                                    ? user.batches // Assuming user.batches contains the string list from context
                                                    : 'No batches assigned'
                                            } />
                                            <DetailItem icon={Calendar} label="Joined Date" value={user.joinedDate} />
                                            <DetailItem icon={MapPin} label="Address" value={
                                                [user.address1, user.address2, user.city, user.state ? getStateName(user.state) : null, user.zip]
                                                    .filter(Boolean)
                                                    .join(', ')
                                            } />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Subscriptions Section */}
                        <div className="card" style={{ maxWidth: '900px', margin: '32px auto' }}>
                            <div className="card-body" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Active Subscriptions</h3>
                                    <button
                                        className="btn btn-primary"
                                        onClick={() => navigate('/settings/subscriptions')}
                                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', fontSize: '14px' }}
                                    >
                                        <Plus size={16} /> Create Subscription
                                    </button>
                                </div>

                                <div className="table-container">
                                    <table className="table">
                                        <thead>
                                            <tr>
                                                <th>Batch</th>
                                                <th>Expires On</th>
                                                <th>Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subscriptions.length > 0 ? (
                                                subscriptions.map(sub => (
                                                    <tr key={sub.id}>
                                                        <td>{sub.batch?.name || 'Unknown Batch'}</td>
                                                        <td>{new Date(sub.expires_on).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</td>
                                                        <td>
                                                            <button className="btn-icon" style={{ color: '#666' }}>
                                                                <Edit size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan="3" style={{ textAlign: 'center', padding: '24px', color: '#666' }}>
                                                        No active subscriptions found
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        {/* Exams Section matching Image 2 */}
                        <div className="card" style={{ maxWidth: '900px', margin: '32px auto' }}>
                            <div className="card-body" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Exams</h3>
                                    <button
                                        className="btn btn-outline"
                                        onClick={() => navigate(`/members/${id}/progress`)}
                                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', padding: '6px 12px', backgroundColor: 'white' }}
                                    >
                                        <TrendingUp size={14} /> Full Progress Report
                                    </button>
                                </div>

                                {loadingExams ? (
                                    <div style={{ padding: '16px 0', color: '#666', fontSize: '14px' }}>Loading exam details...</div>
                                ) : (
                                    <div>
                                        <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: '16px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                <span style={{ color: '#555', fontSize: '14px' }}>Number of Tests Taken</span>
                                                <span style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '14px' }}>{examStats.totalTestsTaken}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                <span style={{ color: '#555', fontSize: '14px' }}>Number of Questions Attempted</span>
                                                <span style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '14px' }}>{examStats.totalQuestionsAttempted}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f0f0f0' }}>
                                                <span style={{ color: '#555', fontSize: '14px' }}>Number of Correct Answers</span>
                                                <span style={{ fontWeight: '600', color: '#1a1a1a', fontSize: '14px' }}>{examStats.totalCorrectAnswers}</span>
                                            </div>
                                        </div>

                                        <div>
                                            <a
                                                href="#exams-list-section"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    setShowExamsTable(true);
                                                    setTimeout(() => {
                                                        const el = document.getElementById('exams-list-section');
                                                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                                                    }, 50);
                                                }}
                                                style={{
                                                    color: '#2563eb',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer'
                                                }}
                                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                            >
                                                View all {user?.email || user?.display_name || 'student'}'s Exams
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* List of Student's Test Section matching Image 3 */}
                        {showExamsTable && (
                            <div id="exams-list-section" className="card" style={{ maxWidth: '900px', margin: '32px auto' }}>
                                <div className="card-body" style={{ padding: '32px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                                        <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                                            List of {user?.first_name || user?.display_name || user?.username || 'Student'}'s Test
                                        </h3>
                                        <div style={{ position: 'relative', width: '240px' }}>
                                            <input
                                                type="text"
                                                placeholder="Search..."
                                                value={examSearch}
                                                onChange={(e) => setExamSearch(e.target.value)}
                                                style={{
                                                    width: '100%',
                                                    padding: '8px 12px 8px 34px',
                                                    fontSize: '13px',
                                                    border: '1px solid #d1d5db',
                                                    borderRadius: '6px',
                                                    outline: 'none',
                                                    boxSizing: 'border-box'
                                                }}
                                            />
                                            <Search size={15} color="#9ca3af" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }} />
                                        </div>
                                    </div>

                                    <div className="table-container" style={{ overflowX: 'auto' }}>
                                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: '920px' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid #eee' }}>
                                                    <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Exam</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>No. of questions</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Course</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Correct</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Incorrect</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Unanswered</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Percentage</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Score</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Rank</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Result</th>
                                                    <th style={{ textAlign: 'left', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Start Date</th>
                                                    <th style={{ textAlign: 'center', padding: '12px 12px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredAttempts.length > 0 ? (
                                                    filteredAttempts.map((attempt) => (
                                                        <tr key={attempt.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: '500', color: '#2563eb' }}>
                                                                <Link
                                                                    to={`/exams/result/${attempt.id}`}
                                                                    style={{ color: '#2563eb', textDecoration: 'none' }}
                                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                                >
                                                                    {attempt.examTitle}
                                                                </Link>
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', color: '#555' }}>
                                                                {attempt.totalQuestions}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#555' }}>
                                                                {attempt.courseTitle}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', color: '#16a34a', fontWeight: '600' }}>
                                                                {attempt.correct}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>
                                                                {attempt.incorrect}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', color: '#666' }}>
                                                                {attempt.unanswered}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', fontWeight: '600', color: '#1a1a1a' }}>
                                                                {attempt.percentage}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', fontWeight: '500', color: '#333', whiteSpace: 'nowrap' }}>
                                                                {attempt.score}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center', color: '#555' }}>
                                                                {attempt.rank}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', textAlign: 'center' }}>
                                                                <span style={{
                                                                    padding: '4px 10px',
                                                                    borderRadius: '12px',
                                                                    fontSize: '12px',
                                                                    fontWeight: '600',
                                                                    backgroundColor: attempt.result === 'Passed' ? '#e8f5e9' : '#ffebee',
                                                                    color: attempt.result === 'Passed' ? '#2e7d32' : '#c62828'
                                                                }}>
                                                                    {attempt.result}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '14px 12px', fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
                                                                {formatExamDate(attempt.startDate)}
                                                            </td>
                                                            <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                                                <button
                                                                    onClick={() => navigate(`/exams/result/${attempt.id}`, { state: { fromAdmin: true } })}
                                                                    className="btn btn-primary"
                                                                    style={{
                                                                        padding: '5px 14px',
                                                                        fontSize: '12px',
                                                                        fontWeight: '500',
                                                                        borderRadius: '4px',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    Review
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                ) : (
                                                    <tr>
                                                        <td colSpan="12" style={{ textAlign: 'center', padding: '32px', color: '#666', fontSize: '14px' }}>
                                                            {loadingExams ? 'Loading exams...' : 'No exams found for this member'}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Orders Section */}
                        <div className="card" style={{ maxWidth: '900px', margin: '32px auto' }}>
                            <div className="card-body" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>Orders</h3>
                                    {memberOrders.length > 0 && (
                                        <span style={{ fontSize: '13px', color: '#666' }}>
                                            {memberOrders.length} {memberOrders.length === 1 ? 'order' : 'orders'}
                                        </span>
                                    )}
                                </div>

                                <div className="table-container" style={{ overflowX: 'auto' }}>
                                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #eee' }}>
                                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Date</th>
                                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Items</th>
                                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Order Id</th>
                                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Details</th>
                                                <th style={{ textAlign: 'right', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#333' }}>+/-</th>
                                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Status</th>
                                                <th style={{ textAlign: 'left', padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#333' }}>Expires On</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {memberOrders.length > 0 ? (
                                                memberOrders.map((order) => {
                                                    const displayId = `${orderPrefix}${order.id}`;
                                                    const itemsText = getOrderItems(order);
                                                    const formattedDate = formatOrderDate(order.created_at);
                                                    const details = getPaymentDetails(order);
                                                    const status = (order.status || '').toLowerCase();
                                                    const statusText = status === 'completed' || status === 'success'
                                                        ? 'Completed'
                                                        : status === 'pending'
                                                            ? 'Pending Payment'
                                                            : 'Failed';

                                                    return (
                                                        <tr key={order.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                                                            <td style={{ padding: '16px', fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
                                                                {formattedDate}
                                                            </td>
                                                            <td style={{ padding: '16px', fontSize: '13px', color: '#2563eb', fontWeight: '500' }}>
                                                                {itemsText}
                                                            </td>
                                                            <td style={{ padding: '16px', fontSize: '13px', color: '#2563eb', fontWeight: '500', whiteSpace: 'nowrap' }}>
                                                                <Link
                                                                    to="/settings/sales"
                                                                    style={{ color: '#2563eb', textDecoration: 'none' }}
                                                                    onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                                    onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                                >
                                                                    {displayId}
                                                                </Link>
                                                            </td>
                                                            <td style={{ padding: '16px', fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
                                                                {details}
                                                            </td>
                                                            <td style={{ padding: '16px', fontSize: '13px', color: '#333', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: '500' }}>
                                                                {(order.amount || 0).toFixed(2)}
                                                            </td>
                                                            <td style={{ padding: '16px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                                                                <span style={{
                                                                    fontWeight: '500',
                                                                    color: status === 'completed' || status === 'success' ? '#15803d' : status === 'pending' ? '#b45309' : '#b91c1c'
                                                                }}>
                                                                    {statusText}
                                                                </span>
                                                            </td>
                                                            <td style={{ padding: '16px', fontSize: '13px', color: '#555', whiteSpace: 'nowrap' }}>
                                                                {order.expires_on ? new Date(order.expires_on).toLocaleDateString('en-GB') : 'None'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="7" style={{ textAlign: 'center', padding: '24px', color: '#666', fontSize: '14px' }}>
                                                        {loadingOrders ? 'Loading orders...' : 'No orders found for this member'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
    );
};

export default MemberDetails;
