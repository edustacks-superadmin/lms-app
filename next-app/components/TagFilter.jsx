'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Tag, Search, ChevronDown, Check, X } from 'lucide-react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useInstitute } from '../context/InstituteContext';

const TagFilter = ({ type = ['exam', 'all'], paramName = 'tags' }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { institute } = useInstitute();

    // Dropdown State
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Data State
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Derived state
    const currentParam = searchParams.get(paramName);
    const selectedTagIds = useMemo(() => {
        if (!currentParam) return [];
        return currentParam.split(',').map(id => parseInt(id)).filter(Boolean);
    }, [currentParam]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch tags
    useEffect(() => {
        const fetchTags = async () => {
            if (!institute?.id) return;
            setLoading(true);
            try {
                const response = await fetch(`/api/admin/tags?institute_id=${institute.id}`);
                const data = await response.json();

                console.log('API Response:', data);

                if (data.tags) {
                    console.log('All Tags:', data.tags);
                    // Filter for Exam tags or 'all'
                    // Tags types are stored as csv string e.g. "exam,course"
                    const examTags = data.tags.filter(tag => {
                        if (!tag.type) return true;
                        const types = tag.type ? tag.type.split(',') : [];
                        // Check if any of the requested types match (e.g. ['course', 'all'])
                        const requestedTypes = Array.isArray(type) ? type : [type];
                        return requestedTypes.some(t => types.includes(t));
                    });
                    console.log(`Filtered Tags (${type}):`, examTags);
                    setTags(examTags);
                } else {
                    console.error('Failed to load tags:', data);
                }
            } catch (error) {
                console.error('Error fetching tags:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchTags();
    }, [institute?.id]);

    const filteredTags = useMemo(() => {
        if (!searchTerm) return tags;
        return tags.filter(tag =>
            tag.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [tags, searchTerm]);

    const handleTagToggle = (tagId) => {
        const params = new URLSearchParams(searchParams);

        let newIds;
        if (selectedTagIds.includes(tagId)) {
            newIds = selectedTagIds.filter(id => id !== tagId);
        } else {
            newIds = [...selectedTagIds, tagId];
        }

        if (newIds.length === 0) {
            params.delete(paramName);
        } else {
            params.set(paramName, newIds.join(','));
        }

        // Reset page to 1
        params.set('page', '1');

        router.push(`${pathname}?${params.toString()}`);
    };

    const clearTags = (e) => {
        e.stopPropagation();
        const params = new URLSearchParams(searchParams);
        params.delete(paramName);
        params.set('page', '1');
        router.push(`${pathname}?${params.toString()}`);
    }

    const selectedCount = selectedTagIds.length;
    const label = selectedCount === 0
        ? 'All Tags'
        : selectedCount === 1
            ? tags.find(t => t.id === selectedTagIds[0])?.name || '1 Tag'
            : `${selectedCount} Tags`;

    return (
        <div className="mt-4" ref={containerRef}>
            <div className="flex items-center gap-2 mb-2 px-1">
                <Tag size={14} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Filter by Tags</span>
                {selectedCount > 0 && (
                    <button
                        onClick={clearTags}
                        className="ml-auto text-[10px] text-red-500 hover:bg-red-50 px-1.5 py-0.5 rounded transition-colors"
                    >
                        Clear
                    </button>
                )}
            </div>

            <div className="relative">
                {/* Trigger Button */}
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className={`
                        w-full flex items-center justify-between px-3 py-2.5 bg-white border rounded-xl text-sm transition-all duration-200
                        ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-slate-200 hover:border-slate-300'}
                        ${selectedCount > 0 ? 'text-blue-700 bg-blue-50/50 border-blue-200' : 'text-slate-600'}
                    `}
                >
                    <span className="truncate font-medium">
                        {label}
                    </span>
                    <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdown Menu */}
                {isOpen && (
                    <div className="absolute z-50 bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-xl shadow-xl shadow-slate-200/50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-bottom">

                        {/* Search Input */}
                        <div className="p-2 border-b border-slate-100">
                            <div className="relative">
                                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    placeholder="Search tags..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
                                />
                            </div>
                        </div>

                        {/* List */}
                        <div className="max-h-[220px] overflow-y-auto p-1 custom-scrollbar">
                            <style jsx>{`
                                .custom-scrollbar::-webkit-scrollbar { width: 4px; }
                                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                                .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #cbd5e1; border-radius: 4px; }
                            `}</style>

                            {loading ? (
                                <div className="text-xs text-center py-4 text-slate-400">Loading tags...</div>
                            ) : filteredTags.length === 0 ? (
                                <div className="text-xs text-center py-4 text-slate-400">No tags found</div>
                            ) : (
                                filteredTags.map(tag => {
                                    const isSelected = selectedTagIds.includes(tag.id);
                                    return (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleTagToggle(tag.id)}
                                            className={`
                                                w-full text-left px-3 py-2 rounded-lg text-sm flex items-center justify-between hover:bg-slate-50 transition-colors mb-0.5
                                                ${isSelected ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-600'}
                                            `}
                                        >
                                            <span className="truncate">{tag.name}</span>
                                            {isSelected && <Check size={14} />}
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TagFilter;
