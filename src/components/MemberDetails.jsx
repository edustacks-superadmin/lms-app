import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUsers } from '../context/UserContext';
import { useInstitute } from '../context/InstituteContext';
import { useTransactions } from '../context/TransactionContext';
import { supabase } from '../supabaseClient';
import { ChevronLeft, Edit, Mail, Phone, MapPin, Calendar, User, Shield, Layers, Plus, TrendingUp, Trash2 } from 'lucide-react';
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

    // Exam stats states
    const [loadingExams, setLoadingExams] = useState(false);
    const [examStats, setExamStats] = useState({
        totalTestsTaken: 0,
        totalQuestionsAttempted: 0,
        totalCorrectAnswers: 0
    });

    // Device sessions states
    const [sessions, setSessions] = useState([]);
    const [loadingSessions, setLoadingSessions] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

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

    // Fetch Exams summary for this member
    useEffect(() => {
        const fetchExamData = async () => {
            const memberId = user?.id || id;
            if (!memberId) return;

            setLoadingExams(true);
            try {
                // 1. Fetch attempts count for this member
                const { data: attempts, error: attError } = await supabase
                    .from('exam_attempts')
                    .select('id')
                    .eq('member_id', memberId);

                if (attError) throw attError;
                if (!attempts || attempts.length === 0) {
                    setExamStats({ totalTestsTaken: 0, totalQuestionsAttempted: 0, totalCorrectAnswers: 0 });
                    return;
                }

                // 2. Fetch answers to compute attempted and correct questions
                const attemptIds = attempts.map(a => a.id);
                let totalAttempted = 0;
                let totalCorrect = 0;

                if (attemptIds.length > 0) {
                    const { data: answersData } = await supabase
                        .from('exam_answers')
                        .select('is_correct, selected_option_index')
                        .in('attempt_id', attemptIds);

                    (answersData || []).forEach(a => {
                        const hasChosen = a.selected_option_index !== null && a.selected_option_index !== undefined && a.selected_option_index >= 0;
                        if (hasChosen) {
                            totalAttempted++;
                            if (a.is_correct) {
                                totalCorrect++;
                            }
                        }
                    });
                }

                setExamStats({
                    totalTestsTaken: attempts.length,
                    totalQuestionsAttempted: totalAttempted,
                    totalCorrectAnswers: totalCorrect
                });
            } catch (err) {
                console.error('Error fetching member exam details:', err);
            } finally {
                setLoadingExams(false);
            }
        };

        fetchExamData();
    }, [user, id]);

    // Fetch currently logged in devices for this member
    useEffect(() => {
        const fetchSessions = async () => {
            const authUserId = user?.auth_user_id;
            const memberId = user?.id || id;
            if (!authUserId && !memberId) return;

            setLoadingSessions(true);
            try {
                let dbSessions = [];
                // 1. Fetch from user_sessions table
                try {
                    let query = supabase.from('user_sessions').select('*');
                    if (authUserId && memberId) {
                        query = query.or(`user_id.eq.${authUserId},user_id.eq.${memberId}`);
                    } else if (authUserId) {
                        query = query.eq('user_id', authUserId);
                    } else {
                        query = query.eq('user_id', memberId);
                    }

                    const { data, error } = await query.order('last_active', { ascending: false });
                    if (!error && data) {
                        dbSessions = data;
                    }
                } catch (e) {
                    console.warn('Could not query user_sessions directly:', e);
                }

                // 2. Fetch from members.custom_data.active_sessions
                let memberActiveSessions = [];
                try {
                    const { data: memberData } = await supabase
                        .from('members')
                        .select('custom_data')
                        .eq('id', memberId)
                        .maybeSingle();

                    if (memberData?.custom_data?.active_sessions && Array.isArray(memberData.custom_data.active_sessions)) {
                        memberActiveSessions = memberData.custom_data.active_sessions;
                    }
                } catch (e) {
                    console.warn('Could not query member custom_data sessions:', e);
                }

                // 3. Merge sessions avoiding duplicates
                const sessionMap = new Map();
                // Add dbSessions first
                dbSessions.forEach(s => {
                    const key = s.id || s.device_name;
                    sessionMap.set(key, s);
                });
                // Merge/add memberActiveSessions
                memberActiveSessions.forEach(s => {
                    const key = s.id || s.device_id || s.device_name;
                    if (sessionMap.has(key)) {
                        sessionMap.set(key, { ...sessionMap.get(key), ...s });
                    } else {
                        sessionMap.set(key, s);
                    }
                });

                const allSessions = Array.from(sessionMap.values());
                // Only keep sessions that are marked as currently active
                const activeOnly = allSessions.filter(s => s.is_current !== false);

                activeOnly.sort((a, b) => {
                    const timeA = new Date(a.last_active || a.login_time || a.created_at || 0).getTime();
                    const timeB = new Date(b.last_active || b.login_time || b.created_at || 0).getTime();
                    return timeB - timeA;
                });

                setSessions(activeOnly);
            } catch (err) {
                console.error('Error fetching user sessions:', err);
            } finally {
                setLoadingSessions(false);
            }
        };

        fetchSessions();
    }, [user, id]);

    const formatLastUsed = (dateString) => {
        if (!dateString) return '--';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '--';
        const months = ['Jan.', 'Feb.', 'Mar.', 'Apr.', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];
        const month = months[date.getMonth()];
        const day = date.getDate();
        const year = date.getFullYear();
        let hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? 'p.m.' : 'a.m.';
        hours = hours % 12 || 12;
        return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm}`;
    };

    const handleLogoutAllDevices = async () => {
        if (!sessions || sessions.length === 0) {
            alert('No active devices to logout.');
            return;
        }
        if (!window.confirm('Are you sure you want to log out all devices for this member?')) {
            return;
        }

        setLoggingOut(true);
        try {
            const memberId = user?.id || id;
            const authUserId = user?.auth_user_id;

            // 1. Delete all user_sessions
            try {
                let deleteQuery = supabase.from('user_sessions').delete();
                if (authUserId && memberId) {
                    deleteQuery = deleteQuery.or(`user_id.eq.${authUserId},user_id.eq.${memberId}`);
                } else if (authUserId) {
                    deleteQuery = deleteQuery.eq('user_id', authUserId);
                } else {
                    deleteQuery = deleteQuery.eq('user_id', memberId);
                }
                await deleteQuery;
            } catch (e) {
                console.warn('Error deleting user_sessions:', e);
            }

            // 2. Clear from members.custom_data
            if (memberId) {
                try {
                    const { data: memberData } = await supabase
                        .from('members')
                        .select('custom_data')
                        .eq('id', memberId)
                        .maybeSingle();

                    const existingCustomData = memberData?.custom_data || {};
                    await supabase
                        .from('members')
                        .update({
                            custom_data: {
                                ...existingCustomData,
                                active_sessions: []
                            }
                        })
                        .eq('id', memberId);
                } catch (e) {
                    console.warn('Error updating member custom_data on logout all:', e);
                }
            }

            setSessions([]);
            alert('All devices have been successfully logged out.');
        } catch (err) {
            console.error('Error logging out all devices:', err);
            alert('Failed to logout all devices: ' + err.message);
        } finally {
            setLoggingOut(false);
        }
    };

    const handleLogoutDevice = async (sessionId) => {
        if (!window.confirm('Are you sure you want to log out this device?')) {
            return;
        }

        try {
            const memberId = user?.id || id;

            // 1. Delete from user_sessions if UUID
            try {
                await supabase
                    .from('user_sessions')
                    .delete()
                    .eq('id', sessionId);
            } catch (e) {
                console.warn('Error deleting single user_session:', e);
            }

            // 2. Remove from members.custom_data
            if (memberId) {
                try {
                    const { data: memberData } = await supabase
                        .from('members')
                        .select('custom_data')
                        .eq('id', memberId)
                        .maybeSingle();

                    const existingCustomData = memberData?.custom_data || {};
                    const updatedSessions = (existingCustomData.active_sessions || []).filter(
                        s => s.id !== sessionId && s.device_id !== sessionId
                    );
                    await supabase
                        .from('members')
                        .update({
                            custom_data: {
                                ...existingCustomData,
                                active_sessions: updatedSessions
                            }
                        })
                        .eq('id', memberId);
                } catch (e) {
                    console.warn('Error updating member custom_data on logout device:', e);
                }
            }

            setSessions(prev => prev.filter(s => s.id !== sessionId && s.device_id !== sessionId));
        } catch (err) {
            console.error('Error logging out device:', err);
            alert('Failed to logout device: ' + err.message);
        }
    };

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
                                            <button
                                                onClick={() => navigate(`/members/${id}/progress`)}
                                                style={{
                                                    background: 'none',
                                                    border: 'none',
                                                    color: '#2563eb',
                                                    fontSize: '14px',
                                                    fontWeight: '500',
                                                    textDecoration: 'none',
                                                    cursor: 'pointer',
                                                    padding: 0
                                                }}
                                                onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                            >
                                                View all {user?.email || user?.display_name || 'student'}'s Exams
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Currently Logged in devices Section */}
                        <div className="card" style={{ maxWidth: '900px', margin: '32px auto' }}>
                            <div className="card-body" style={{ padding: '32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #eee', paddingBottom: '16px' }}>
                                    <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                                        Currently Logged in devices
                                    </h3>
                                    <button
                                        onClick={handleLogoutAllDevices}
                                        disabled={loggingOut || sessions.length === 0}
                                        style={{
                                            backgroundColor: sessions.length === 0 ? '#e0e0e0' : '#c82333',
                                            color: sessions.length === 0 ? '#888' : 'white',
                                            fontWeight: '600',
                                            fontSize: '13px',
                                            padding: '8px 16px',
                                            borderRadius: '4px',
                                            border: 'none',
                                            cursor: sessions.length === 0 ? 'not-allowed' : 'pointer',
                                            transition: 'background-color 0.2s'
                                        }}
                                        onMouseEnter={(e) => {
                                            if (sessions.length > 0) e.currentTarget.style.backgroundColor = '#a71d2a';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (sessions.length > 0) e.currentTarget.style.backgroundColor = '#c82333';
                                        }}
                                    >
                                        {loggingOut ? 'Logging out...' : 'Logout of all devices'}
                                    </button>
                                </div>

                                <div className="table-container" style={{ overflowX: 'auto' }}>
                                    <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                                        <thead>
                                            <tr style={{ borderBottom: '1px solid #e0e0e0' }}>
                                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#555' }}>S.No</th>
                                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Device name</th>
                                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Last used</th>
                                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#555' }}>Location</th>
                                                <th style={{ textAlign: 'left', padding: '12px 14px', fontSize: '13px', fontWeight: '600', color: '#555' }}>IP Address</th>
                                                <th style={{ textAlign: 'center', padding: '12px 14px', width: '60px' }}></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sessions.length > 0 ? (
                                                sessions.map((session, index) => {
                                                    const deviceIcon = session.os_name?.toLowerCase().includes('android') || session.os_name?.toLowerCase().includes('ios') || session.browser_name?.toLowerCase().includes('mobile') ? '📱' : '💻';
                                                    const deviceDisplay = `${deviceIcon} ${session.device_name || session.browser_name || 'Device'} ${session.os_name ? `(${session.os_name} ${session.os_version || ''})`.trim() : ''} ${session.device_info?.appVersion ? `v${session.device_info.appVersion}` : ''}`.trim();
                                                    const locationDisplay = session.location?.country || session.location?.city || (typeof session.location === 'string' ? session.location : 'India');

                                                    return (
                                                        <tr key={session.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                                                            <td style={{ padding: '14px', fontSize: '13px', color: '#555' }}>{index + 1}</td>
                                                            <td style={{ padding: '14px', fontSize: '13px', color: '#333', fontWeight: '500' }}>{deviceDisplay}</td>
                                                            <td style={{ padding: '14px', fontSize: '13px', color: '#555' }}>{formatLastUsed(session.last_active || session.login_time || session.created_at)}</td>
                                                            <td style={{ padding: '14px', fontSize: '13px', color: '#555' }}>{locationDisplay}</td>
                                                            <td style={{ padding: '14px', fontSize: '13px' }}>
                                                                {session.ip_address && session.ip_address !== 'Unknown' ? (
                                                                    <a
                                                                        href={`https://whatismyipaddress.com/ip/${session.ip_address}`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        style={{ color: '#2563eb', textDecoration: 'none' }}
                                                                        onMouseEnter={(e) => e.target.style.textDecoration = 'underline'}
                                                                        onMouseLeave={(e) => e.target.style.textDecoration = 'none'}
                                                                    >
                                                                        {session.ip_address}
                                                                    </a>
                                                                ) : (
                                                                    <span style={{ color: '#888' }}>--</span>
                                                                )}
                                                            </td>
                                                            <td style={{ padding: '14px', textAlign: 'center' }}>
                                                                <button
                                                                    onClick={() => handleLogoutDevice(session.id)}
                                                                    style={{
                                                                        backgroundColor: '#c82333',
                                                                        border: 'none',
                                                                        borderRadius: '4px',
                                                                        padding: '6px 8px',
                                                                        color: 'white',
                                                                        cursor: 'pointer',
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        justifyContent: 'center',
                                                                        transition: 'background-color 0.2s'
                                                                    }}
                                                                    title="Logout this device"
                                                                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#a71d2a'}
                                                                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#c82333'}
                                                                >
                                                                    <Trash2 size={15} />
                                                                </button>
                                                            </td>
                                                        </tr>
                                                    );
                                                })
                                            ) : (
                                                <tr>
                                                    <td colSpan="6" style={{ textAlign: 'center', padding: '28px', color: '#777', fontSize: '14px' }}>
                                                        {loadingSessions ? 'Loading devices...' : 'No currently logged in devices'}
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

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
