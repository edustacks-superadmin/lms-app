'use client';

import React, { useState, useRef } from 'react';
import { X, Search, Image as ImageIcon, Upload, Check } from 'lucide-react';
import PRELOADED_ICONS from '../data/preloadedIcons.json';

const IconPicker = ({ isOpen, onClose, onSelect, currentIcon }) => {
    const categories = Object.keys(PRELOADED_ICONS || {});
    const [activeCategory, setActiveCategory] = useState(categories[0] || 'General');
    const [searchTerm, setSearchTerm] = useState('');
    const [customIcons, setCustomIcons] = useState([]);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const allCategoryIcons = {
        ...PRELOADED_ICONS,
        Custom: [...(PRELOADED_ICONS.Custom || []), ...customIcons]
    };

    let displayIcons = [];
    if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const allIcons = Object.values(allCategoryIcons).flat();
        const seen = new Set();
        displayIcons = allIcons.filter(icon => {
            if (seen.has(icon.url)) return false;
            seen.add(icon.url);
            return icon.name.toLowerCase().includes(query);
        });
    } else {
        displayIcons = allCategoryIcons[activeCategory] || [];
    }

    const handleUploadCustomIcon = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'icons/Custom');

            const res = await fetch('/api/admin/upload', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                if (data.url) {
                    const newIcon = {
                        name: file.name.replace(/\.[^/.]+$/, ''),
                        url: data.url
                    };
                    setCustomIcons(prev => [newIcon, ...prev]);
                    onSelect(data.url);
                    onClose();
                }
            } else {
                throw new Error('Upload failed');
            }
        } catch (err) {
            console.error('Error uploading custom icon:', err);
            alert('Failed to upload icon: ' + (err.message || 'Unknown error'));
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-[880px] max-w-[96%] h-[620px] max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="py-4 px-6 border-b border-gray-200 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
                            <ImageIcon size={18} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900">Select Course Icon</h3>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="relative w-[260px]">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search all icons..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-9 pr-3 py-1.5 w-full rounded-md border border-gray-300 text-sm focus:outline-none focus:border-blue-500"
                            />
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">
                    {/* Categories Sidebar */}
                    {!searchTerm.trim() && (
                        <div className="w-[200px] border-r border-gray-200 bg-gray-50 overflow-y-auto p-3">
                            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">Categories</div>
                            {categories.map(cat => {
                                const isActive = activeCategory === cat;
                                const count = (allCategoryIcons[cat] || []).length;
                                return (
                                    <div
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`py-2 px-3 rounded-md cursor-pointer text-sm mb-1 flex justify-between items-center transition-colors ${
                                            isActive
                                                ? 'bg-blue-600 text-white font-semibold'
                                                : 'text-gray-700 hover:bg-gray-200/60'
                                        }`}
                                    >
                                        <span>{cat}</span>
                                        <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${
                                            isActive ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-600'
                                        }`}>
                                            {count}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Main Grid */}
                    <div className="flex-1 p-5 overflow-y-auto bg-white">
                        {(activeCategory === 'Custom' || searchTerm.trim()) && (
                            <div className="mb-4 flex items-center gap-3">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleUploadCustomIcon}
                                />
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                >
                                    <Upload size={14} />
                                    {uploading ? 'Uploading...' : 'Upload Custom Icon'}
                                </button>
                                <span className="text-xs text-gray-500">PNG, JPG, or SVG up to 2MB</span>
                            </div>
                        )}

                        {displayIcons.length === 0 ? (
                            <div className="h-60 flex flex-col items-center justify-center text-gray-400">
                                <ImageIcon size={40} className="opacity-40 mb-2" />
                                <p className="text-sm">No icons found</p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setSearchTerm('')}
                                        className="mt-2 text-xs text-blue-600 hover:underline"
                                    >
                                        Clear search
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-3">
                                {displayIcons.map((icon, idx) => {
                                    const isSelected = currentIcon === icon.url;
                                    return (
                                        <div
                                            key={`${icon.url}-${idx}`}
                                            onClick={() => {
                                                onSelect(icon.url);
                                                onClose();
                                            }}
                                            className={`relative rounded-lg p-3 cursor-pointer flex flex-col items-center justify-center gap-2 border transition-all hover:shadow-md hover:border-blue-400 ${
                                                isSelected ? 'border-2 border-blue-600 bg-blue-50/50' : 'border-gray-200 bg-white'
                                            }`}
                                            title={icon.name}
                                        >
                                            {isSelected && (
                                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center">
                                                    <Check size={10} strokeWidth={3} />
                                                </div>
                                            )}
                                            <div className="w-11 h-11 flex items-center justify-center">
                                                <img
                                                    src={icon.url}
                                                    alt={icon.name}
                                                    loading="lazy"
                                                    className="max-w-full max-h-full object-contain"
                                                />
                                            </div>
                                            <span className="text-[11px] text-center text-gray-600 truncate w-full px-1">
                                                {icon.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="py-3 px-6 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                    <span className="text-xs text-gray-500">{displayIcons.length} icons available</span>
                    <button
                        onClick={onClose}
                        className="px-4 py-1.5 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default IconPicker;
