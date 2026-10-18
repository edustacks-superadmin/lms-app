import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBatches } from '../context/BatchContext';

const CreateBatch = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const { addBatch, updateBatch, batches } = useBatches();
    const [batchName, setBatchName] = useState('');

    useEffect(() => {
        if (id && batches.length > 0) {
            const batch = batches.find(b => b.id === id);
            if (batch) {
                setBatchName(batch.name);
            }
        }
    }, [id, batches]);

    const handleSubmit = async () => {
        if (batchName.trim()) {
            if (id) {
                await updateBatch(id, { name: batchName });
            } else {
                await addBatch({
                    name: batchName
                });
            }
            navigate('/batches');
        } else {
            alert('Please fill in all fields');
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
                    <div style={{
                        padding: '16px 0',
                        color: '#666',
                        fontWeight: '400',
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
                        USERS
                    </div>
                    <div style={{
                        padding: '16px 0',
                        borderBottom: '3px solid var(--primary-color)',
                        color: 'var(--primary-color)',
                        fontWeight: '600',
                        fontSize: '14px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                    }}>
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
                <h2 style={{ fontSize: '24px', fontWeight: '400', marginBottom: '30px' }}>Create Batch</h2>

                <div style={{ maxWidth: '400px' }}>
                    {/* Name Field */}
                    <div style={{ marginBottom: '20px' }}>
                        <label style={{ display: 'block', fontWeight: '500', marginBottom: '8px', fontSize: '14px' }}>
                            Batch Name:
                        </label>
                        <input
                            type="text"
                            value={batchName}
                            onChange={(e) => setBatchName(e.target.value)}
                            className="form-control"
                            style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
                            placeholder="e.g. Quick Revision Chart"
                        />
                    </div>



                    {/* Buttons */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                            className="btn"
                            style={{ backgroundColor: '#00bfa5', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
                            onClick={handleSubmit}
                        >
                            Create Batch
                        </button>
                        <button
                            className="btn"
                            style={{ backgroundColor: '#f5f5f5', color: '#333', border: '1px solid #ccc', padding: '10px 20px', borderRadius: '4px', cursor: 'pointer' }}
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
