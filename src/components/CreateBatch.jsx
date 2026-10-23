import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBatches } from '../context/BatchContext';
import { supabase } from '../supabaseClient';

const CreateBatch = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { addBatch, updateBatch, batches } = useBatches();
    const [batchName, setBatchName] = useState('');
    const [loading, setLoading] = useState(!!id);
    const [saving, setSaving] = useState(false);

    const isEditMode = Boolean(id);

    useEffect(() => {
        if (!id) return;

        // 1. Check in batches context first
        const found = (batches || []).find(b => String(b.id) === String(id));
        if (found) {
            setBatchName(found.name || '');
            setLoading(false);
            return;
        }

        // 2. Fetch directly from database if not in context yet
        const fetchBatchDirectly = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('batches')
                    .select('*')
                    .eq('id', id)
                    .maybeSingle();

                if (error) throw error;
                if (data) {
                    setBatchName(data.name || '');
                }
            } catch (err) {
                console.error('Error fetching batch:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBatchDirectly();
    }, [id, batches]);

    const handleSubmit = async () => {
        if (!batchName.trim()) {
            alert('Please enter a batch name');
            return;
        }

        setSaving(true);
        try {
            if (isEditMode) {
                await updateBatch(id, { name: batchName.trim() });
            } else {
                await addBatch({
                    name: batchName.trim()
                });
            }
            navigate('/batches');
        } catch (err) {
            console.error('Error saving batch:', err);
            alert('Failed to save batch: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const handleCancel = () => {
        navigate('/batches');
    };

    return (
        <div style={{ flex: 1 }}>
            {/* Tabs */}
            <div style={{ borderBottom: '1px solid #e0e0e0', padding: '0 40px' }}>
                <div style={{ display: 'flex', gap: '40px' }}>
                    <div
                        onClick={() => navigate('/members')}
                        style={{
                            padding: '16px 0',
                            color: '#666',
                            fontWeight: '400',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            cursor: 'pointer'
                        }}
                    >
                        USERS
                    </div>
                    <div
                        onClick={() => navigate('/batches')}
                        style={{
                            padding: '16px 0',
                            borderBottom: '3px solid var(--primary-color, #0088cc)',
                            color: 'var(--primary-color, #0088cc)',
                            fontWeight: '600',
                            fontSize: '14px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                            cursor: 'pointer'
                        }}
                    >
                        BATCHES
                    </div>
                    <div style={{
                        padding: '16px 0',
                        color: '#666',
                        fontWeight: '400',
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        ROLES
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div style={{ padding: '30px 40px' }}>
                <h2 style={{ fontSize: '24px', fontWeight: '500', marginBottom: '24px', color: '#1a1a1a' }}>
                    {isEditMode ? 'Edit Batch' : 'Create Batch'}
                </h2>

                <div style={{ maxWidth: '440px' }}>
                    {/* Name Field */}
                    <div style={{ marginBottom: '24px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', fontSize: '14px', color: '#333' }}>
                            Batch Name:
                        </label>
                        <input
                            type="text"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            disabled={loading || saving}
                            className="form-control"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                borderRadius: '4px',
                                border: '1px solid #ccc',
                                fontSize: '14px'
                            }}
                            placeholder={loading ? 'Loading batch...' : 'e.g. Quick Revision Chart'}
                            autoFocus
                        />
                        {loading && (
                            <span style={{ fontSize: '12px', color: '#888', marginTop: '4px', display: 'block' }}>
                                Fetching batch details...
                            </span>
                        )}
                    </div>

                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            className="btn"
                            disabled={loading || saving}
                            style={{
                                backgroundColor: '#00bfa5',
                                color: 'white',
                                border: 'none',
                                padding: '10px 24px',
                                borderRadius: '4px',
                                cursor: (loading || saving) ? 'not-allowed' : 'pointer',
                                fontWeight: '500',
                                fontSize: '14px'
                            }}
                            onClick={handleSubmit}
                        >
                            {saving ? 'Saving...' : (isEditMode ? 'Save Changes' : 'Create Batch')}
                        </button>
                        <button
                            className="btn"
                            disabled={saving}
                            style={{
                                backgroundColor: '#f5f5f5',
                                color: '#333',
                                border: '1px solid #ccc',
                                padding: '10px 20px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '14px'
                            }}
                            onClick={handleCancel}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateBatch;
