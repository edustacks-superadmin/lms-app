'use client';

import React, { useState, useEffect, useRef, use } from 'react';
import AdminLayout from '../../../../components/AdminLayout';
import { useRouter } from 'next/navigation';
import {
    Save, Users, ChevronLeft, Check, X,
    Search, Trash2, Plus, Info
} from 'lucide-react';
import { supabase } from '../../../../supabaseClient';



const PERMISSIONS = [
    { id: 'view', label: 'Can View' },
    { id: 'add', label: 'Can Add' },
    { id: 'change', label: 'Can Change' },
    { id: 'delete', label: 'Can Delete' },
];

const RESOURCES_GROUPS = [
    {
        name: 'Content Management',
        resources: [
            { id: 'courses', label: 'Exams & Courses' },
            { id: 'posts', label: 'Posts & Blog' },
        ]
    },
    {
        name: 'User & Batch Management',
        resources: [
            { id: 'users', label: 'Users' },
            { id: 'user_invitation', label: 'User Invitation' },
            { id: 'batch', label: 'Batch' },
            { id: 'batch_subscription', label: 'Batch Subscription' },
            { id: 'role', label: 'Roles & Permissions' },
        ]
    },
    {
        name: 'System Settings',
        resources: [
            { id: 'settings', label: 'Settings & Configuration' }
        ]
    }
];

const RoleDetails = ({ params }) => {
    const { id } = use(params);
    const router = useRouter();

    const [role, setRole] = useState(null);
    const [permissions, setPermissions] = useState({});
    const [roleUsers, setRoleUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // User assignment state
    const [userSearchQuery, setUserSearchQuery] = useState('');
    const [userSearchResults, setUserSearchResults] = useState([]);
    const [showUserSearch, setShowUserSearch] = useState(false);

    useEffect(() => {
        fetchRoleData();
    }, [id]);

    const fetchRoleData = async () => {
        setLoading(true);
        try {
            // Fetch Role Details
            const roleRes = await fetch(`/api/admin/roles/${id}`);
            const roleData = await roleRes.json();

            if (roleData.role) {
                setRole(roleData.role);
                setPermissions(roleData.role.permissions || {});
            }

            // Fetch Role Users
            const usersRes = await fetch(`/api/admin/roles/${id}/users`);
            const usersData = await usersRes.json();
            if (usersData.users) {
                setRoleUsers(usersData.users);
            }
        } catch (error) {
            console.error('Error details:', error);
        } finally {
            setLoading(false);
        }
    };

    const handlePermissionChange = (resourceId, permissionId) => {
        setPermissions(prev => ({
            ...prev,
            [resourceId]: {
                ...prev[resourceId],
                [permissionId]: !prev[resourceId]?.[permissionId]
            }
        }));
    };

    const toggleRow = (resourceId, shouldSelect) => {
        setPermissions(prev => {
            const newPerms = { ...prev };
            const resourcePerms = {};
            PERMISSIONS.forEach(p => {
                resourcePerms[p.id] = shouldSelect;
            });
            newPerms[resourceId] = resourcePerms;
            return newPerms;
        });
    };

    const isRowFullySelected = (resourceId) => {
        return PERMISSIONS.every(p => permissions[resourceId]?.[p.id]);
    };

    const toggleColumn = (permissionId, shouldSelect) => {
        setPermissions(prev => {
            const newPerms = { ...prev };
            RESOURCES_GROUPS.forEach(group => {
                group.resources.forEach(resource => {
                    if (!newPerms[resource.id]) newPerms[resource.id] = {};
                    newPerms[resource.id][permissionId] = shouldSelect;
                });
            });
            return newPerms;
        });
    };

    const isColumnFullySelected = (permissionId) => {
        // Check if every resource in every group has this permission set to true
        return RESOURCES_GROUPS.every(group =>
            group.resources.every(resource => permissions[resource.id]?.[permissionId])
        );
    };

    const saveRole = async () => {
        setSaving(true);
        try {
            const response = await fetch(`/api/admin/roles/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    permissions
                })
            });

            if (response.ok) {
                // Show success toast or feedback
                const data = await response.json();
                setRole(data.role); // Update local state
            }
        } catch (error) {
            console.error('Error saving role:', error);
            alert('Failed to save changes');
        } finally {
            setSaving(false);
        }
    };

    // --- User Assignment Logic ---
    useEffect(() => {
        if (userSearchQuery.length > 2) {
            const timer = setTimeout(() => searchUsers(), 300);
            return () => clearTimeout(timer);
        } else {
            setUserSearchResults([]);
        }
    }, [userSearchQuery]);

    const searchUsers = async () => {
        try {
            // Search via Members API
            const response = await fetch(`/api/members?search=${userSearchQuery}`);
            const data = await response.json();
            if (data.members) {
                // Filter out users already in this role
                const existingIds = new Set(roleUsers.map(u => u.id));
                setUserSearchResults(data.members.filter(m => !existingIds.has(m.id)));
            }
        } catch (error) {
            console.error('Error searching users:', error);
        }
    };

    const assignUser = async (user) => {
        try {
            const res = await fetch(`/api/admin/roles/${id}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id })
            });

            if (res.ok) {
                setRoleUsers([...roleUsers, {
                    id: user.id,
                    display_name: user.displayName,
                    email: user.email,
                    photo_url: user.photo_url
                }]);
                setUserSearchQuery('');
                setUserSearchResults([]);
                setShowUserSearch(false);
            }
        } catch (error) {
            console.error('Failed to assign user:', error);
        }
    };

    const removeUser = async (userId) => {
        if (!confirm('Are you sure you want to remove this user from the role?')) return;

        try {
            const res = await fetch(`/api/admin/roles/${id}/users?userId=${userId}`, {
                method: 'DELETE'
            });

            if (res.ok) {
                setRoleUsers(roleUsers.filter(u => u.id !== userId));
            }
        } catch (error) {
            console.error('Failed to remove user:', error);
        }
    };

    if (loading) return <AdminLayout>Loading...</AdminLayout>;
    if (!role) return <AdminLayout>Role not found</AdminLayout>;

    return (
        <AdminLayout>
            <div className="container" style={{ padding: '40px 20px', maxWidth: '1400px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <button onClick={() => router.back()} style={{ border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                            <ChevronLeft size={24} color="#666" />
                        </button>
                        <div>
                            <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px', color: '#1a1a1a' }}>{role.name}</h1>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#666', fontSize: '14px' }}>
                                <Users size={14} />
                                <span>{roleUsers.length} Users</span>
                                <span>•</span>
                                <span>Last modified {role.updated_at ? new Date(role.updated_at).toLocaleDateString() : 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={saveRole}
                        disabled={saving}
                        style={{
                            backgroundColor: '#059669', color: 'white', border: 'none', padding: '10px 24px',
                            borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: saving ? 'wait' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        {saving ? 'Saving...' : <><Save size={18} /> Save Changes</>}
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(300px, 1fr)', gap: '24px' }}>




                    <div className="card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '24px' }}>
                        <div style={{ marginBottom: '24px' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>Manage Role Permissions</h2>
                            <p style={{ fontSize: '14px', color: '#6b7280' }}>Specify permissions granted to users in this role.</p>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ borderBottom: '1px solid #e5e7eb' }}>
                                        <th style={{ textAlign: 'left', padding: '12px 0', fontSize: '14px', fontWeight: '600', color: '#374151' }}>Resource Name</th>
                                        {PERMISSIONS.map(p => {
                                            const isColSelected = isColumnFullySelected(p.id);
                                            return (
                                                <th key={p.id} style={{ textAlign: 'center', padding: '12px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                                                        <span>{p.label}</span>
                                                        <button
                                                            onClick={() => toggleColumn(p.id, !isColSelected)}
                                                            style={{
                                                                fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                                                                border: '1px solid #d1d5db', background: isColSelected ? '#ecfdf5' : 'white',
                                                                color: isColSelected ? '#059669' : '#6b7280', cursor: 'pointer', fontWeight: 'normal'
                                                            }}
                                                        >
                                                            {isColSelected ? 'None' : 'All'}
                                                        </button>
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {RESOURCES_GROUPS.map((group, gIndex) => (
                                        <React.Fragment key={group.name}>
                                            <tr style={{ backgroundColor: '#f9fafb' }}>
                                                <td colSpan={PERMISSIONS.length + 1} style={{ padding: '8px 12px', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    {group.name}
                                                </td>
                                            </tr>
                                            {group.resources.map(resource => {
                                                const allSelected = isRowFullySelected(resource.id);
                                                return (
                                                    <tr key={resource.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                                        <td style={{ padding: '16px 0', fontSize: '14px', fontWeight: '500', color: '#111827' }}>
                                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                <span>{resource.label}</span>
                                                                <button
                                                                    onClick={() => toggleRow(resource.id, !allSelected)}
                                                                    style={{
                                                                        fontSize: '11px', padding: '2px 6px', borderRadius: '4px',
                                                                        border: '1px solid #d1d5db', background: allSelected ? '#ecfdf5' : 'white',
                                                                        color: allSelected ? '#059669' : '#6b7280', cursor: 'pointer'
                                                                    }}
                                                                >
                                                                    {allSelected ? 'All' : 'Select All'}
                                                                </button>
                                                            </div>
                                                        </td>
                                                        {PERMISSIONS.map(perm => {
                                                            const isChecked = permissions[resource.id]?.[perm.id] || false;
                                                            return (
                                                                <td key={perm.id} style={{ textAlign: 'center', padding: '16px' }}>
                                                                    <div
                                                                        onClick={() => handlePermissionChange(resource.id, perm.id)}
                                                                        style={{
                                                                            width: '44px', height: '24px', borderRadius: '999px',
                                                                            backgroundColor: isChecked ? '#10b981' : '#e5e7eb',
                                                                            position: 'relative', cursor: 'pointer', margin: '0 auto',
                                                                            transition: 'background-color 0.2s'
                                                                        }}
                                                                    >
                                                                        <div style={{
                                                                            width: '20px', height: '20px', borderRadius: '50%',
                                                                            backgroundColor: 'white', position: 'absolute',
                                                                            top: '2px', left: isChecked ? '22px' : '2px',
                                                                            transition: 'left 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                                                                        }} />
                                                                    </div>
                                                                </td>
                                                            );
                                                        })}
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Sidebar: Assign Users */}
                    <div className="card" style={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 style={{ fontSize: '16px', fontWeight: '600', color: '#111827', margin: 0 }}>Assign Users</h2>
                            <button
                                onClick={() => setShowUserSearch(!showUserSearch)}
                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#059669' }}
                            >
                                <Plus size={20} />
                            </button>
                        </div>

                        <div style={{ padding: '20px', flex: 1 }}>
                            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '16px' }}>Users who inherit this role and its permissions.</p>

                            {showUserSearch && (
                                <div style={{ marginBottom: '16px', position: 'relative' }}>
                                    <div style={{ position: 'relative' }}>
                                        <input
                                            type="text"
                                            placeholder="Search users..."
                                            value={userSearchQuery}
                                            onChange={(e) => setUserSearchQuery(e.target.value)}
                                            style={{
                                                width: '100%', padding: '8px 32px 8px 12px', borderRadius: '6px',
                                                border: '1px solid #d1d5db', fontSize: '14px', outline: 'none'
                                            }}
                                            autoFocus
                                        />
                                        <Search size={16} style={{ position: 'absolute', right: '10px', top: '10px', color: '#9ca3af' }} />
                                    </div>

                                    {userSearchResults.length > 0 && (
                                        <div style={{
                                            position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                                            backgroundColor: 'white', border: '1px solid #e5e7eb', borderRadius: '6px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', maxHeight: '200px', overflowY: 'auto',
                                            marginTop: '4px'
                                        }}>
                                            {userSearchResults.map(user => (
                                                <div
                                                    key={user.id}
                                                    onClick={() => assignUser(user)}
                                                    style={{
                                                        padding: '8px 12px', cursor: 'pointer', fontSize: '14px',
                                                        borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px',
                                                        ':hover': { backgroundColor: '#f9fafb' } // Pseudo-style, effectively active via JS hover if needed but keeping simple
                                                    }}
                                                >
                                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#eee', overflow: 'hidden' }}>
                                                        {user.photo_url ? (
                                                            <img src={user.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                        ) : (
                                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '10px' }}>
                                                                {user.displayName?.charAt(0)}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {user.displayName}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {roleUsers.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '20px', fontStyle: 'italic', color: '#9ca3af', fontSize: '13px' }}>
                                        No users assigned
                                    </div>
                                ) : (
                                    roleUsers.map(user => (
                                        <div key={user.id} style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '8px 12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#e5e7eb', flexShrink: 0, overflow: 'hidden' }}>
                                                    {user.photo_url ? (
                                                        <img src={user.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', fontSize: '12px', color: '#6b7280' }}>
                                                            {user.display_name?.charAt(0).toUpperCase() || '?'}
                                                        </div>
                                                    )}
                                                </div>
                                                <div style={{ minWidth: 0 }}>
                                                    <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {user.display_name || 'User'}
                                                    </div>
                                                    <div style={{ fontSize: '12px', color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => removeUser(user.id)}
                                                title="Remove user from role"
                                                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', padding: '4px' }}
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
};

export default RoleDetails;
