import React, { useState, useEffect } from 'react';
import { useTags } from '../context/TagContext';
import { Plus, Edit, Trash2, Tag as TagIcon } from 'lucide-react';

const TagManagement = () => {
    const { tags, loading, addTag, updateTag, deleteTag, fetchTags } = useTags();

    useEffect(() => {
        fetchTags();
    }, []);

    const [showForm, setShowForm] = useState(false);
    const [editingTag, setEditingTag] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        color: '#2196f3',
        type: 'all'
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
            color: tag.color,
            type: tag.type || 'all'
        });
        setShowForm(true);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this tag? This will remove it from all courses and exams.')) {
            await deleteTag(id);
        }
    };

    const resetForm = () => {
        setFormData({ name: '', color: '#2196f3', type: 'all' });
        setEditingTag(null);
        setShowForm(false);
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading tags...</div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto min-h-screen bg-slate-50/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tag Management</h1>
                    <p className="mt-1 text-sm text-slate-500 font-medium tracking-tight">
                        Create and manage tags to organize your courses, products, exams, and posts.
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all active:scale-95 shadow-lg ${showForm ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/25'}`}
                >
                    {showForm ? 'Cancel' : <><Plus size={18} strokeWidth={3} /> Add Tag</>}
                </button>
            </div>

            {showForm && (
                <div className="bg-white p-6 rounded-2xl shadow-xl border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-300">
                    <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
                        <TagIcon size={20} className="text-blue-500" />
                        {editingTag ? 'Modify Tag Properties' : 'Create a New Tag'}
                    </h2>
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                                    Tag Name
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Bestseller, Post-Draft"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">
                                    Entity Assignment
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                                    {['all', 'course', 'product', 'exam', 'question', 'post'].map(typeVal => {
                                        const currentTypes = formData.type ? formData.type.split(',') : ['all'];
                                        const isChecked = currentTypes.includes(typeVal);
                                        return (
                                            <label key={typeVal} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer text-xs font-bold transition-colors ${isChecked ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-100 text-slate-400'}`}>
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={() => {
                                                        if (typeVal === 'all') {
                                                            setFormData({ ...formData, type: 'all' });
                                                            return;
                                                        }
                                                        let newTypes = currentTypes.includes('all') ? [] : [...currentTypes];
                                                        if (newTypes.includes(typeVal)) {
                                                            newTypes = newTypes.filter(t => t !== typeVal);
                                                        } else {
                                                            newTypes.push(typeVal);
                                                        }
                                                        if (newTypes.length === 0) newTypes = ['all'];
                                                        setFormData({ ...formData, type: newTypes.join(',') });
                                                    }}
                                                    className="hidden"
                                                />
                                                <span className="capitalize">{typeVal}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 pt-2">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest ml-1">Color Palette</label>
                            <div className="flex flex-wrap gap-2.5">
                                {[
                                    { color: '#ef4444', name: 'Red' },
                                    { color: '#f97316', name: 'Orange' },
                                    { color: '#f59e0b', name: 'Amber' },
                                    { color: '#eab308', name: 'Yellow' },
                                    { color: '#84cc16', name: 'Lime' },
                                    { color: '#22c55e', name: 'Green' },
                                    { color: '#14b8a6', name: 'Teal' },
                                    { color: '#06b6d4', name: 'Cyan' },
                                    { color: '#3b82f6', name: 'Blue' },
                                    { color: '#6366f1', name: 'Indigo' },
                                    { color: '#8b5cf6', name: 'Violet' },
                                    { color: '#ec4899', name: 'Pink' },
                                    { color: '#64748b', name: 'Slate' },
                                ].map(preset => (
                                    <button
                                        key={preset.color}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, color: preset.color })}
                                        title={preset.name}
                                        className={`w-8 h-8 rounded-lg transition-all active:scale-90 ${formData.color === preset.color ? 'ring-4 ring-slate-900 ring-offset-2' : 'hover:scale-110'}`}
                                        style={{ backgroundColor: preset.color }}
                                    />
                                ))}
                                <div className="flex items-center gap-2 pl-2 ml-auto border-l border-slate-200">
                                    <input
                                        type="color"
                                        value={formData.color}
                                        onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                        className="w-10 h-8 p-0 border-none bg-transparent cursor-pointer rounded overflow-hidden"
                                    />
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Custom</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                            <button type="submit" className="flex-1 md:flex-none px-8 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 active:scale-95 shadow-lg shadow-blue-500/20 transition-all">
                                {editingTag ? 'Update Tag' : 'Create Tag'}
                            </button>
                            <button type="button" onClick={resetForm} className="flex-1 md:flex-none px-8 py-3 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 active:scale-95 transition-all">
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {tags.length === 0 ? (
                    <div className="p-20 text-center bg-slate-50/20">
                        <TagIcon size={40} className="mx-auto text-slate-300 opacity-50 mb-4" />
                        <h3 className="text-slate-900 font-bold text-lg">No tags found</h3>
                        <p className="text-slate-500 text-sm mt-1 mb-8">Create your first tag to start organizing content.</p>
                        <button onClick={() => setShowForm(true)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                            Add First Tag
                        </button>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tag Identity</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Types</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Color Hex</th>
                                    <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tags.map((tag) => (
                                    <tr key={tag.id} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: tag.color }} />
                                                <span
                                                    className="px-3 py-1 rounded-lg text-xs font-bold leading-none flex items-center shadow-sm"
                                                    style={{
                                                        backgroundColor: tag.color + '10',
                                                        color: tag.color,
                                                        border: `1px solid ${tag.color}25`
                                                    }}
                                                >
                                                    {tag.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex flex-wrap gap-1.5">
                                                {(tag.type || 'all').split(',').map(t => (
                                                    <span key={t} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 border border-slate-200 capitalize">
                                                        {t}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <code className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded uppercase tracking-wider">{tag.color}</code>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(tag)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                    title="Edit Properties"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(tag.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    title="Remove Tag"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TagManagement;
