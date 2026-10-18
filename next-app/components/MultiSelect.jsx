'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const MultiSelect = ({
    label,
    options = [],
    value = [], // Array of selected values
    onChange, // Callback(newValues[])
    placeholder = "Select...",
    searchable = true
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt =>
        opt.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const toggleOption = (val) => {
        if (value.includes(val)) {
            onChange(value.filter(v => v !== val));
        } else {
            onChange([...value, val]);
        }
    };

    const removeValue = (e, val) => {
        e.stopPropagation();
        onChange(value.filter(v => v !== val));
    };

    // Get labels for selected values (for display)
    // We try to find the label in options, or fallback to value if not found
    const getLabel = (val) => {
        const option = options.find(o => o.value === val);
        return option ? option.label : val;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {label && (
                <label className="block text-xs font-medium text-slate-700 mb-1">
                    {label}
                </label>
            )}

            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    w-full min-h-[38px] px-3 py-2 bg-white border rounded-lg cursor-pointer flex items-center justify-between gap-2
                    ${isOpen ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 hover:border-slate-300'}
                `}
            >
                <div className="flex flex-wrap gap-1.5 flex-1 overflow-hidden">
                    {value.length === 0 ? (
                        <span className="text-sm text-slate-400 truncate">{placeholder}</span>
                    ) : (
                        value.map(val => (
                            <span
                                key={val}
                                className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100 max-w-full"
                            >
                                <span className="truncate max-w-[100px]">{getLabel(val)}</span>
                                <button
                                    onClick={(e) => removeValue(e, val)}
                                    className="ml-1 hover:text-blue-900 focus:outline-none"
                                >
                                    <X size={12} />
                                </button>
                            </span>
                        ))
                    )}
                </div>
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-60 flex flex-col animate-in fade-in zoom-in-95 duration-100">

                    {/* Search Bar */}
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 sticky top-0 bg-white rounded-t-lg">
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Search..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {/* Options List */}
                    <div className="overflow-y-auto flex-1 p-1">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option) => {
                                const isSelected = value.includes(option.value);
                                return (
                                    <div
                                        key={option.value}
                                        onClick={() => toggleOption(option.value)}
                                        className={`
                                            flex items-center justify-between px-3 py-2 rounded-md cursor-pointer text-sm transition-colors
                                            ${isSelected
                                                ? 'bg-blue-50 text-blue-700 font-medium'
                                                : 'text-slate-700 hover:bg-slate-50'}
                                        `}
                                    >
                                        <span className="truncate mr-2">{option.label}</span>
                                        {isSelected && (
                                            <Check size={14} className="text-blue-600 shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        ) : (
                            <div className="px-3 py-4 text-center text-sm text-slate-500">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiSelect;
