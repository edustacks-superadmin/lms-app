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
        <div className="relative w-full">
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="min-h-[42px] flex items-center justify-between cursor-pointer border border-slate-300 rounded-lg px-3 py-2 bg-white hover:border-blue-500 transition-colors flex-wrap gap-2"
            >
                <div className="flex flex-wrap gap-2 flex-1">
                    {selectedBatchNames.length > 0 ? (
                        selectedBatchNames.map((batch) => (
                            <span
                                key={batch.id}
                                className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 px-2 py-1 rounded-full border border-emerald-100"
                            >
                                {batch.name}
                                <X
                                    size={12}
                                    className="cursor-pointer hover:text-emerald-900"
                                    onClick={(e) => removeBatch(e, batch.id)}
                                />
                            </span>
                        ))
                    ) : (
                        <span className="text-slate-400 text-sm">Select batches...</span>
                    )}
                </div>
                <ChevronDown size={16} className="text-slate-400" />
            </div>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-[999]"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute top-full left-0 w-full mt-1 max-h-[300px] overflow-y-auto bg-white border border-slate-200 shadow-xl rounded-lg z-[1000] animate-in fade-in zoom-in-95 duration-100">
                        <div className="sticky top-0 bg-white border-b border-slate-100 p-2 z-10">
                            <input
                                type="text"
                                placeholder="Search batches..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full text-sm px-3 py-2 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                autoFocus
                            />
                        </div>
                        {filteredBatches.map(batch => {
                            const isSelected = (Array.isArray(selectedBatches) ? selectedBatches : []).includes(batch.id);
                            return (
                                <div
                                    key={batch.id}
                                    onClick={() => toggleBatch(batch.id)}
                                    className={`flex items-center justify-between px-3 py-2.5 cursor-pointer text-sm transition-colors ${isSelected
                                        ? 'bg-blue-50/60 text-blue-700'
                                        : 'hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <span>{batch.name}</span>
                                    {isSelected && <Check size={16} className="text-blue-600" />}
                                </div>
                            );
                        })}
                        {filteredBatches.length === 0 && (
                            <div className="p-4 text-center text-slate-400 text-sm">
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
