import React, { useState } from 'react';
import { useTags } from '../context/TagContext';
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';

const TagManagement = () => {
    const { tags, loading, addTag, updateTag, deleteTag } = useTags();
    const [showForm, setShowForm] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        color: '#2196f3'
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingTag) {
                await updateTag(editingTag.id, formData);
            } else {
                await addTag(formData);
            }
            resetForm();
        } catch (error) {
            console.error('Error saving tag:', error);
        }
    };

    const handleEdit = (tag) => {
        setEditingTag(tag);
        setFormData({
            name: tag.name,
            color: tag.color
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this tag? This will remove it from all courses and exams.')) {
            await deleteTag(id);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', color: '#2196f3' });
        setEditingTag(null);
        setShowForm(false);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading tags...</div>;
    }

    return (
        <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '400' }}>Tag Management</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                    <Plus size={18} />
                    {showForm ? 'Cancel' : 'Add Tag'}
                </button>
            </div>

            {showForm && (
                <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #eee', marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '18px', marginBottom: '16px', marginTop: 0 }}>
                        {editingTag ? 'Edit Tag' : 'Create New Tag'}
                    </h2>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Tag Name *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter tag name"
                                    required
                                    style={{ width: '100%', padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>Color</label>
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    style={{ width: '100%', height: '42px', padding: '2px', border: '1px solid #ddd', borderRadius: '4px', cursor: 'pointer' }}
                                />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary">
                                {editingTag ? 'Update Tag' : 'Create Tag'}
                            </button>
                            {editingTag && (
                                <button type="button" onClick={resetForm} className="btn btn-outline">
                                    Cancel
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            )}

            <div style={{ background: 'white', borderRadius: '8px', border: '1px solid #eee' }}>
                {tags.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        No tags found. Create your first tag to get started.
                    </div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #eee', background: '#f9f9f9' }}>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Tag</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Color</th>
                                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '500' }}>Created</th>
                                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: '500' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tags.map((tag) => (
                                <tr key={tag.id} style={{ borderBottom: '1px solid #eee' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <TagIcon size={16} color={tag.color} />
                                            <span
                                                style={{
                                                    padding: '4px 12px',
                                                    borderRadius: '12px',
                                                    fontSize: '13px',
                                                    fontWeight: '500',
                                                    backgroundColor: tag.color + '20',
                                                    color: tag.color
                                                }}
                                            >
                                                {tag.name}
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '4px',
                                                    backgroundColor: tag.color,
                                                    border: '1px solid #ddd'
                                                }}
                                            />
                                            <span style={{ fontSize: '13px', color: '#666' }}>{tag.color}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: '14px', color: '#666' }}>
                                        {new Date(tag.created_at).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                            <button
                                                onClick={() => handleEdit(tag)}
                                                className="btn btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '13px' }}
                                                title="Edit"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(tag.id)}
                                                className="btn btn-outline"
                                                style={{ padding: '6px 12px', fontSize: '13px', color: '#ef4444', borderColor: '#fee2e2' }}
                                                title="Delete"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default TagManagement;
