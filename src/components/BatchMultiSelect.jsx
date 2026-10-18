import React, { useState } from 'react';
import { useBatches } from '../context/BatchContext';
import { Check, ChevronDown, X } from 'lucide-react';

const BatchMultiSelect = ({ selectedBatches = [], onChange }) => {
    const { batches } = useBatches();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    const toggleBatch = (batchId) => {
        const currentSelected = Array.isArray(selectedBatches) ? selectedBatches : [];
        if (currentSelected.includes(batchId)) {
            onChange(currentSelected.filter(id => id !== batchId));
        } else {
            onChange([...currentSelected, batchId]);
        }
    };

    const removeBatch = (e, batchId) => {
        e.stopPropagation();
        const currentSelected = Array.isArray(selectedBatches) ? selectedBatches : [];
        onChange(currentSelected.filter(id => id !== batchId));
    };

    const filteredBatches = batches.filter(batch =>
        batch.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const selectedBatchNames = (Array.isArray(selectedBatches) ? selectedBatches : [])
        .map(id => batches.find(b => b.id === id))
        .filter(Boolean);

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="form-control"
                style={{
                    minHeight: '42px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    height: 'auto',
                    padding: '8px 12px',
                    flexWrap: 'wrap',
                    gap: '8px'
                }}
            >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', flex: 1 }}>
                    {selectedBatchNames.length > 0 ? (
                        selectedBatchNames.map((batch) => (
                            <span
                                key={batch.id}
                                style={{
                                    fontSize: '12px',
                                    backgroundColor: '#e0f2f1',
                                    color: '#00695c',
                                    padding: '4px 8px',
                                    borderRadius: '16px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px'
                                }}
                            >
                                {batch.name}
                                <X
                                    size={12}
                                    style={{ cursor: 'pointer' }}
                                    onClick={(e) => removeBatch(e, batch.id)}
                                />
                            </span>
                        ))
                    ) : (
                        <span style={{ color: '#999' }}>Select batches...</span>
                    )}
                </div>
                <ChevronDown size={16} color="#666" />
            </div>

            {isOpen && (
                <>
                    <div
                        style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 999 }}
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="dropdown-menu" style={{
                        display: 'block',
                        width: '100%',
                        marginTop: '4px',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        position: 'absolute',
                        zIndex: 1000,
                        backgroundColor: 'white',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0'
                    }}>
                        <div style={{ padding: '8px', position: 'sticky', top: 0, backgroundColor: 'white', borderBottom: '1px solid #f0f0f0' }}>
                            <input
                                type="text"
                                placeholder="Search batches..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="form-control"
                                style={{ fontSize: '14px', padding: '8px', width: '100%' }}
                                autoFocus
                            />
                        </div>
                        {filteredBatches.map(batch => (
                            <div
                                key={batch.id}
                                onClick={() => toggleBatch(batch.id)}
                                className="dropdown-item"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '10px 12px',
                                    cursor: 'pointer',
                                    backgroundColor: (Array.isArray(selectedBatches) ? selectedBatches : []).includes(batch.id) ? '#f0f9ff' : 'transparent',
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = (Array.isArray(selectedBatches) ? selectedBatches : []).includes(batch.id) ? '#e0f7fa' : '#f5f5f5'}
                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = (Array.isArray(selectedBatches) ? selectedBatches : []).includes(batch.id) ? '#f0f9ff' : 'transparent'}
                            >
                                <span>{batch.name}</span>
                                {(Array.isArray(selectedBatches) ? selectedBatches : []).includes(batch.id) && <Check size={16} color="var(--primary-color)" />}
                            </div>
                        ))}
                        {filteredBatches.length === 0 && (
                            <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '14px' }}>
                                No batches found
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default BatchMultiSelect;
