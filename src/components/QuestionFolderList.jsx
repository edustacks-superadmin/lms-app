import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, MoreVertical, Search, Folder } from 'lucide-react';
import { useQuestionFolders } from '../context/QuestionFolderContext';

const QuestionFolderList = () => {
    const navigate = useNavigate();
    const { folders, fetchFolders, deleteFolder, loading } = useQuestionFolders();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingFolder, setEditingFolder] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchFolders();
    }, []);

    const handleDelete = async (id) => {
        if (window.confirm('Are you sure you want to delete this folder? Questions will remain in the question bank.')) {
            const result = await deleteFolder(id);
            if (result.success) {
                setOpenMenuId(null);
            }
        }
    };

    const handleEdit = (folder) => {
        setEditingFolder(folder);
        setShowCreateModal(true);
        setOpenMenuId(null);
    };

    const filteredFolders = folders.filter(folder =>
        folder.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div style={{ flex: 1, padding: '0', marginTop: '20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
                <h1 style={{ fontSize: '32px', fontWeight: '400', margin: 0, color: '#1a1a1a' }}>
                    Question Folders
                </h1>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#666' }} />
                        <input
                            type="text"
                            placeholder="Search folders"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{
                                padding: '8px 12px 8px 40px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                width: '250px'
                            }}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setEditingFolder(null);
                            setShowCreateModal(true);
                        }}
                        className="btn btn-success"
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
                    >
                        <Plus size={18} />
                        Create Folder
                    </button>
                </div>
            </div>

            {/* Folders List */}
            {loading && <p>Loading folders...</p>}

            <div style={{ background: 'white', borderRadius: '4px', border: '1px solid #e0e0e0' }}>
                {filteredFolders.map((folder, index) => (
                    <div
                        key={folder.id}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '16px 24px',
                            borderBottom: index < filteredFolders.length - 1 ? '1px solid #f0f0f0' : 'none',
                            cursor: 'pointer'
                        }}
                        onClick={() => navigate(`/questions/folders/${folder.id}`)}
                        onMouseOver={(e) => e.currentTarget.style.background = '#f9f9f9'}
                        onMouseOut={(e) => e.currentTarget.style.background = 'white'}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                            <Folder size={20} color="#ffa726" />
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: '16px', fontWeight: '500', color: '#333' }}>
                                    {folder.name}
                                </span>
                                {folder.description && (
                                    <div style={{ fontSize: '13px', color: '#999', marginTop: '2px' }}>
                                        {folder.description}
                                    </div>
                                )}
                            </div>
                            <span
                                style={{
                                    fontSize: '14px',
                                    color: '#666',
                                    backgroundColor: '#f5f5f5',
                                    padding: '4px 12px',
                                    borderRadius: '12px'
                                }}
                            >
                                {folder.questionCount} questions
                            </span>
                        </div>

                        <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                            <button
                                onClick={() => setOpenMenuId(openMenuId === folder.id ? null : folder.id)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center'
                                }}
                            >
                                <MoreVertical size={20} color="#666" />
                            </button>

                            {openMenuId === folder.id && (
                                <div
                                    style={{
                                        position: 'absolute',
                                        right: 0,
                                        top: '100%',
                                        background: 'white',
                                        border: '1px solid #e0e0e0',
                                        borderRadius: '4px',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                        zIndex: 10,
                                        minWidth: '120px'
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <button
                                        onClick={() => handleEdit(folder)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            background: 'none',
                                            border: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#f5f5f5'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        Edit
                                    </button>
                                    <button
                                        onClick={() => handleDelete(folder.id)}
                                        style={{
                                            width: '100%',
                                            padding: '10px 16px',
                                            background: 'none',
                                            border: 'none',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            fontSize: '14px',
                                            color: '#d32f2f'
                                        }}
                                        onMouseOver={(e) => e.currentTarget.style.background = '#ffebee'}
                                        onMouseOut={(e) => e.currentTarget.style.background = 'none'}
                                    >
                                        Delete
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {!loading && filteredFolders.length === 0 && (
                    <div style={{ padding: '40px', textAlign: 'center', color: '#666' }}>
                        {searchTerm ? 'No folders found matching your search.' : 'No folders found. Create your first folder!'}
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <CreateFolderModal
                    folder={editingFolder}
                    onClose={() => {
                        setShowCreateModal(false);
                        setEditingFolder(null);
                    }}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        setEditingFolder(null);
                        fetchFolders();
                    }}
                />
            )}
        </div>
    );
};

const CreateFolderModal = ({ folder, onClose, onSuccess }) => {
    const { addFolder, updateFolder } = useQuestionFolders();
    const [formData, setFormData] = useState({
        name: folder?.name || '',
        description: folder?.description || ''
    });
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        const result = folder
            ? await updateFolder(folder.id, formData)
            : await addFolder(formData);

        if (result.success) {
            onSuccess();
        } else {
            setError(result.error);
        }
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000
            }}
            onClick={onClose}
        >
            <div
                style={{
                    background: 'white',
                    borderRadius: '8px',
                    padding: '24px',
                    width: '90%',
                    maxWidth: '500px'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <h2 style={{ margin: '0 0 20px 0', fontSize: '20px' }}>
                    {folder ? 'Edit Folder' : 'Create Folder'}
                </h2>

                {error && (
                    <div style={{ padding: '10px', marginBottom: '16px', backgroundColor: '#ffebee', color: '#c62828', borderRadius: '4px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Folder Name *
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            required
                            placeholder="e.g., JEE Mains 2024"
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px'
                            }}
                        />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                            Description (Optional)
                        </label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={3}
                            placeholder="Brief description of this folder..."
                            style={{
                                width: '100%',
                                padding: '10px',
                                border: '1px solid #ddd',
                                borderRadius: '4px',
                                fontSize: '14px',
                                resize: 'vertical'
                            }}
                        />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                border: '1px solid #ddd',
                                background: 'white',
                                borderRadius: '4px',
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="btn btn-success"
                            style={{ padding: '10px 20px' }}
                        >
                            {folder ? 'Update' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default QuestionFolderList;
