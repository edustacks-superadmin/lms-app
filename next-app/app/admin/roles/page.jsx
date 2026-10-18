'use client';

import React, { useState, useEffect } from 'react';
import AdminLayout from '../../../components/AdminLayout';
import { Search, Plus, MoreVertical, Users, Edit, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

const RolesList = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Create State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newRoleName, setNewRoleName] = useState('');

    // Actions State
    const [renameRoleState, setRenameRoleState] = useState({ show: false, role: null, newName: '' });
    const [deleteRoleState, setDeleteRoleState] = useState({ show: false, role: null });

    const router = useRouter();

    useEffect(() => {
        fetchRoles();
    }, []);

    const fetchRoles = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/admin/roles');
            const data = await response.json();
            if (data.roles) {
                setRoles(data.roles);
            }
        } catch (error) {
            console.error('Error fetching roles:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRole = async (e) => {
        e.preventDefault();
        if (!newRoleName.trim()) return;

        try {
            const response = await fetch('/api/admin/roles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newRoleName })
            });
            const data = await response.json();

            if (data.role) {
                setRoles([data.role, ...roles]);
                setShowCreateModal(false);
                setNewRoleName('');
            } else if (data.error) {
                alert('Error creating role: ' + data.error);
            }
        } catch (error) {
            console.error('Error creating role:', error);
        }
    };

    const handleRename = async (e) => {
        e.preventDefault();
        const { role, newName } = renameRoleState;
        if (!role || !newName.trim()) return;

        try {
            const response = await fetch(`/api/admin/roles/${role.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newName, permissions: role.permissions, description: role.description })
            });

            if (response.ok) {
                setRoles(roles.map(r => r.id === role.id ? { ...r, name: newName } : r));
                setRenameRoleState({ show: false, role: null, newName: '' });
            } else {
                const data = await response.json();
                alert('Failed to rename role: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error renaming role:', error);
        }
    };

    const handleDelete = async () => {
        const { role } = deleteRoleState;
        if (!role) return;

        try {
            const response = await fetch(`/api/admin/roles/${role.id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                setRoles(roles.filter(r => r.id !== role.id));
                setDeleteRoleState({ show: false, role: null });
            } else {
                const data = await response.json();
                alert('Failed to delete role: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting role:', error);
        }
    };



    const openRename = (role) => {
        setRenameRoleState({ show: true, role, newName: role.name });
        setActiveDropdown(null);
    };

    const openDelete = (role) => {
        setDeleteRoleState({ show: true, role });
        setActiveDropdown(null);
    };

    const filteredRoles = roles.filter(role =>
        role.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <AdminLayout>
            <div className="container" style={{ padding: '40px 20px', maxWidth: '1200px', margin: '0 auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                    <div>
                        <h1 style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px', color: '#1a1a1a' }}>Roles</h1>
                        <p style={{ color: '#666', fontSize: '16px' }}>Manage user roles and access permissions.</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        style={{
                            backgroundColor: '#059669', color: 'white', border: 'none', padding: '10px 20px',
                            borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '8px'
                        }}
                    >
                        <Plus size={18} />
                        Create
                    </button>
                </div>

                <div className="card" style={{ backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb', padding: '20px' }}>
                    {loading ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>Loading roles...</div>
                    ) : filteredRoles.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>No roles found. Create one to get started.</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {filteredRoles.map(role => (
                                <div key={role.id} style={{
                                    backgroundColor: 'white', padding: '20px', borderRadius: '8px',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <h3 style={{ margin: '0 0 4px 0', fontSize: '16px', fontWeight: '600', color: '#111827' }}>{role.name}</h3>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#6b7280', fontSize: '13px' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <Users size={14} /> {role.userCount || 0} users
                                            </span>
                                            <span>•</span>
                                            <span>Last modified {role.updated_at ? new Date(role.updated_at).toLocaleDateString() : 'recently'}</span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                        <button
                                            onClick={() => router.push(`/admin/roles/${role.id}`)}
                                            style={{
                                                padding: '6px 12px', borderRadius: '6px', border: '1px solid #d1d5db',
                                                backgroundColor: 'white', color: '#374151', fontSize: '13px', fontWeight: '500',
                                                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px'
                                            }}
                                            title="Manage Permissions & Users"
                                        >
                                            <Users size={14} /> Permissions
                                        </button>

                                        <button
                                            onClick={() => openRename(role)}
                                            style={{
                                                padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db',
                                                backgroundColor: 'white', color: '#374151', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                            title="Rename Role"
                                        >
                                            <Edit size={14} />
                                        </button>

                                        <button
                                            onClick={() => openDelete(role)}
                                            style={{
                                                padding: '6px', borderRadius: '6px', border: '1px solid #d1d5db',
                                                backgroundColor: 'white', color: '#ef4444', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                                            }}
                                            title="Delete Role"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Create Role Modal */}
                {showCreateModal && (
                    <div className="modal-overlay" style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '500px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>Create a new role</h2>
                            <form onSubmit={handleCreateRole}>
                                <div style={{ marginBottom: '24px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Name</label>
                                    <input
                                        type="text"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }}
                                        required autoFocus
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button type="button" onClick={() => setShowCreateModal(false)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: 'white', color: 'black', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#059669', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Submit</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Rename Role Modal */}
                {renameRoleState.show && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Rename Role</h2>
                            <form onSubmit={handleRename}>
                                <div style={{ marginBottom: '20px' }}>
                                    <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '6px' }}>Name</label>
                                    <input
                                        type="text"
                                        value={renameRoleState.newName}
                                        onChange={(e) => setRenameRoleState({ ...renameRoleState, newName: e.target.value })}
                                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', outline: 'none', fontSize: '14px' }}
                                        required autoFocus
                                    />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                    <button type="button" onClick={() => setRenameRoleState({ show: false, role: null, newName: '' })} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: 'white', color: 'black', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                                    <button type="submit" style={{ padding: '8px 24px', borderRadius: '6px', border: 'none', backgroundColor: '#3b82f6', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Save</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* Delete Role Confirmation */}
                {deleteRoleState.show && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                    }}>
                        <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '400px', width: '100%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
                            <h2 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#ef4444' }}>Delete Role?</h2>
                            <p style={{ color: '#4b5563', marginBottom: '24px', fontSize: '14px' }}>
                                Are you sure you want to delete the role <strong>"{deleteRoleState.role?.name}"</strong>? This user action cannot be undone.
                            </p>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                                <button onClick={() => setDeleteRoleState({ show: false, role: null })} style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #e5e7eb', backgroundColor: 'white', color: '#374151', cursor: 'pointer', fontWeight: '500' }}>Cancel</button>
                                <button onClick={handleDelete} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#ef4444', color: 'white', cursor: 'pointer', fontWeight: '500' }}>Delete</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
};

export default RolesList;
