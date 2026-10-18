import React, { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Calendar, User, Layers } from 'lucide-react';
import { useUsers } from '../context/UserContext';
import { useBatches } from '../context/BatchContext';
import { supabase } from '../supabaseClient';

const SettingsSubscription = () => {
    const [view, setView] = useState('list'); // 'list' or 'create'
    const [subscriptions, setSubscriptions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeDropdown, setActiveDropdown] = useState(null);

    // Context Data
    const { users } = useUsers();
    const { batches } = useBatches();

    // Form State
    const [formData, setFormData] = useState({
        member_id: '',
        batch_id: '',
        expires_on: ''
    });

    useEffect(() => {
        fetchSubscriptions();
    }, []);

    const fetchSubscriptions = async () => {
        setLoading(true);
        try {
            console.log('Fetching subscriptions...');

            // Fetch subscriptions with batch info
            const { data, error } = await supabase
                .from('subscriptions')
                .select(`
                    *,
                    batch:batches(id, name)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Supabase error:', error);
                throw error;
            }

            console.log('Subscriptions fetched:', data);

            // Fetch member details separately for each subscription
            if (data && data.length > 0) {
                const subsWithMembers = await Promise.all(
                    data.map(async (sub) => {
                        if (sub.member_id) {
                            const { data: memberData } = await supabase
                                .from('members')
                                .select('id, display_name, email, photo_url, first_name, last_name')
                                .eq('id', sub.member_id)
                                .single();

                            return { ...sub, member: memberData };
                        }
                        return sub;
                    })
                );
                setSubscriptions(subsWithMembers);
            } else {
                setSubscriptions(data || []);
            }
        } catch (error) {
            console.error('Error fetching subscriptions:', error);
            alert('Error loading subscriptions: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const { error } = await supabase
                .from('subscriptions')
                .insert([formData]);

            if (error) throw error;

            await fetchSubscriptions();
            setView('list');
            setFormData({ member_id: '', batch_id: '', expires_on: '' });
            alert('Subscription created successfully!');
        } catch (error) {
            console.error('Error creating subscription:', error);
            alert('Error creating subscription: ' + error.message);
        }
    };

    const handleUnsubscribe = async (id) => {
        if (!window.confirm('Are you sure you want to unsubscribe this user?')) return;
        try {
            const { error } = await supabase
                .from('subscriptions')
                .update({ status: 'Inactive' })
                .eq('id', id);

            if (error) throw error;
            fetchSubscriptions();
            setActiveDropdown(null);
        } catch (error) {
            console.error('Error unsubscribing:', error);
        }
    };

    const getUserName = (userId) => {
        // userId here can be Auth ID or Member ID
        // We need to find the member who has this user_id or id
        const user = users.find(u => u.user_id === userId || u.id == userId);
        return user ? (user.name || user.display_name || user.email) : userId; // Fallback to ID if name not found
    };

    const filteredSubscriptions = subscriptions.filter(sub => {
        // Get user name safely - use member data if available, otherwise fetch from context
        const memberName = sub.member?.display_name || sub.member?.email || '';
        const userName = memberName || (sub.member_id ? (getUserName(sub.member_id) || '') : '');
        const batchName = sub.batch?.name || '';
        const query = searchQuery.toLowerCase();

        // Safe toLowerCase with fallback to empty string
        const userNameLower = (userName || '').toLowerCase();
        const batchNameLower = (batchName || '').toLowerCase();

        return userNameLower.includes(query) || batchNameLower.includes(query);
    });

    if (view === 'create') {
        return (
            <div className="settings-page">
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                    <button
                        onClick={() => setView('list')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', marginRight: '10px', fontSize: '18px' }}
                    >
                        ←
                    </button>
                    <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Create Subscription</h2>
                </div>

                <div style={{ backgroundColor: 'white', padding: '30px', borderRadius: '8px', border: '1px solid #eee', maxWidth: '600px' }}>
                    <form onSubmit={handleSubmit}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>User</label>
                            <div className="input-group">
                                <User size={18} style={{ marginLeft: '10px', color: '#666' }} />
                                <select
                                    name="member_id"
                                    value={formData.member_id}
                                    onChange={handleInputChange}
                                    style={{ border: 'none', width: '100%', padding: '10px', outline: 'none' }}
                                    required
                                >
                                    <option value="">Select User</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name || user.display_name || user.email} ({user.email})</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Batches</label>
                            <div className="input-group">
                                <Layers size={18} style={{ marginLeft: '10px', color: '#666' }} />
                                <select
                                    name="batch_id"
                                    value={formData.batch_id}
                                    onChange={handleInputChange}
                                    style={{ border: 'none', width: '100%', padding: '10px', outline: 'none' }}
                                    required
                                >
                                    <option value="">Select Batch</option>
                                    {batches.map(batch => (
                                        <option key={batch.id} value={batch.id}>{batch.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Expires on</label>
                            <div className="input-group">
                                <Calendar size={18} style={{ marginLeft: '10px', color: '#666' }} />
                                <input
                                    type="date"
                                    name="expires_on"
                                    value={formData.expires_on}
                                    onChange={handleInputChange}
                                    style={{ border: 'none', width: '100%', padding: '10px', outline: 'none' }}
                                    required
                                />
                            </div>
                        </div>

                        <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                            Create Subscription
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '600', margin: 0 }}>Subscriptions</h2>
                <button className="btn btn-primary" onClick={() => setView('create')}>
                    <Plus size={18} /> Create Subscription
                </button>
            </div>

            <div style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #eee', overflow: 'hidden' }}>
                <div style={{ padding: '15px', borderBottom: '1px solid #eee' }}>
                    <div className="input-group" style={{ maxWidth: '300px' }}>
                        <Search size={18} style={{ marginLeft: '10px', color: '#666' }} />
                        <input
                            type="text"
                            placeholder="Search subscriptions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: 'none', padding: '8px 10px', width: '100%', outline: 'none' }}
                        />
                    </div>
                </div>

                <table className="modern-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Batch</th>
                            <th>Expires on</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>Loading...</td></tr>
                        ) : filteredSubscriptions.length === 0 ? (
                            <tr><td colSpan="5" style={{ textAlign: 'center', padding: '20px' }}>No subscriptions found</td></tr>
                        ) : (
                            filteredSubscriptions.map(sub => (
                                <tr key={sub.id}>
                                    <td>
                                        <div style={{ fontWeight: '500' }}>
                                            {sub.member?.display_name || (sub.member_id ? getUserName(sub.member_id) : 'Unknown User')}
                                        </div>
                                        <div style={{ fontSize: '12px', color: '#666' }}>
                                            {sub.member?.email || ''}
                                        </div>
                                    </td>
                                    <td>{sub.batch?.name || 'Unknown Batch'}</td>
                                    <td>
                                        {sub.member?.expiry_date
                                            ? new Date(sub.member.expiry_date).toLocaleDateString()
                                            : new Date(sub.expires_on).toLocaleDateString()
                                        }
                                    </td>
                                    <td>
                                        <span className={`badge ${sub.status === 'Active' ? 'badge-success' : 'badge-gray'}`}>
                                            {sub.status}
                                        </span>
                                    </td>
                                    <td style={{ position: 'relative' }}>
                                        <button
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '5px' }}
                                            onClick={() => setActiveDropdown(activeDropdown === sub.id ? null : sub.id)}
                                        >
                                            <MoreVertical size={18} color="#666" />
                                        </button>
                                        {activeDropdown === sub.id && (
                                            <div className="dropdown-menu" style={{ right: '0', top: '100%' }}>
                                                <div
                                                    className="dropdown-item danger"
                                                    onClick={() => handleUnsubscribe(sub.id)}
                                                >
                                                    Unsubscribe
                                                </div>
                                                <div className="dropdown-item">Extend Expiry Date</div>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SettingsSubscription;
