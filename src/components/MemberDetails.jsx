import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useUsers } from '../context/UserContext';
import { supabase } from '../supabaseClient';
import { ChevronLeft, Edit, Mail, Phone, MapPin, Calendar, User, Shield, Layers, Plus } from 'lucide-react';
import { getStateName } from '../utils/indianStates';

const MemberDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { users, loading: contextLoading } = useUsers();
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [subscriptions, setSubscriptions] = useState([]);

    useEffect(() => {
        if (contextLoading) return;

        // Use loose equality to handle string/number ID mismatch
        const foundUser = users.find(u => String(u.id) === String(id));
        setUser(foundUser);
        setLoading(false);
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
        <div className="app-container">
            <div className="main-content">
                <div className="content-area">
                    <div className="container">
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
                            <button
                                className="btn btn-primary"
                                onClick={() => navigate(`/edit-user/${id}`)}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Edit size={16} /> Edit Member
                            </button>
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
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberDetails;
