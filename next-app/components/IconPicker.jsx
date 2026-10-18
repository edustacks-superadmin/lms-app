
import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Image as ImageIcon, RefreshCw, Plus, Upload } from 'lucide-react';

const IconPicker = ({ isOpen, onClose, onSelect, currentIcon }) => {
    const [categories, setCategories] = useState([]);
    const [icons, setIcons] = useState({});
    const [activeCategory, setActiveCategory] = useState(null);
    const [loading, setLoading] = useState(false);
    const [categoryLoading, setCategoryLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchCategories();
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && activeCategory) {
            fetchIconsForCategory(activeCategory);
        }
    }, [isOpen, activeCategory]);

    const fetchCategories = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/storage/icons');
            if (res.ok) {
                const data = await res.json();
                setCategories(data.categories || []);
                if (data.categories && data.categories.length > 0 && !activeCategory) {
                    setActiveCategory(data.categories.includes('General') ? 'General' : data.categories[0]);
                }
            } else {
                setError('Failed to load categories');
            }
        } catch (err) {
            console.error('Error loading categories:', err);
            setError('Error loading categories');
        } finally {
            setLoading(false);
        }
    };

    const fetchIconsForCategory = async (category) => {
        if (icons[category] && icons[category].length > 0) return;

        setCategoryLoading(true);
        try {
            const res = await fetch(`/api/storage/icons?category=${encodeURIComponent(category)}`);
            if (res.ok) {
                const data = await res.json();
                setIcons(prev => ({
                    ...prev,
                    [category]: data.icons || []
                }));
            }
        } catch (err) {
            console.error(`Error loading icons for ${category}:`, err);
        } finally {
            setCategoryLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/storage/icons', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                const data = await res.json();
                const catRes = await fetch(`/api/storage/icons?category=Custom`);
                if (catRes.ok) {
                    const catData = await catRes.json();
                    setIcons(prev => ({
                        ...prev,
                        'Custom': catData.icons || []
                    }));
                }

                if (data.url) {
                    onSelect(data.url);
                }
            } else {
                console.error('Upload failed');
                setError('Failed to upload icon');
            }
        } catch (err) {
            console.error('Error uploading icon:', err);
            setError('Error uploading icon');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    if (!isOpen) return null;

    let displayIcons = [];

    if (searchTerm) {
        const allIcons = Object.values(icons).flat();
        displayIcons = allIcons.filter(icon =>
            icon.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    } else {
        displayIcons = icons[activeCategory] || [];
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[1100] flex items-center justify-center">
            <div className="bg-white rounded-xl w-[800px] max-w-[95%] h-[600px] flex flex-col overflow-hidden shadow-xl">
                {/* Header */}
                <div className="py-4 px-5 border-b border-gray-200 flex justify-between items-center bg-white">
                    <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2.5">
                        <ImageIcon size={20} className="text-blue-600" /> Select Icon
                    </h3>
                    <div className="flex gap-3">
                        <div className="relative w-[250px]">
                            <Search size={16} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search loaded icons..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-8 pr-2.5 py-2 w-full rounded-md border border-gray-300 text-sm"
                            />
                        </div>
                        <button onClick={onClose} className="bg-transparent border-none cursor-pointer text-gray-500 hover:text-gray-700">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex flex-1 overflow-hidden">

                    {/* Sidebar (Categories) */}
                    {!searchTerm && (
                        <div className="w-[200px] border-r border-gray-200 bg-gray-50 overflow-y-auto p-2.5">
                            <div className="text-xs font-semibold text-gray-500 mb-2.5 uppercase tracking-wide">Categories</div>
                            {loading ? (
                                <div className="p-2.5 text-center text-gray-400">Loading...</div>
                            ) : (
                                categories.map(cat => (
                                    <div
                                        key={cat}
                                        onClick={() => setActiveCategory(cat)}
                                        className={`py-2.5 px-3 rounded-md cursor-pointer text-sm mb-1 flex justify-between items-center transition-colors ${activeCategory === cat ? 'bg-blue-600 text-white font-semibold' : 'bg-transparent text-gray-700 hover:bg-gray-100'}`}
                                    >
                                        {cat}
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {/* Main Grid */}
                    <div className="flex-1 p-5 overflow-y-auto bg-white">
                        {loading ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500">
                                <RefreshCw size={32} className="animate-spin mb-4" />
                                <p>Loading...</p>
                            </div>
                        ) : error ? (
                            <div className="h-full flex flex-col items-center justify-center text-red-500">
                                <p>{error}</p>
                                <button onClick={fetchCategories} className="mt-3 text-blue-600 underline bg-transparent border-none cursor-pointer">Try Again</button>
                            </div>
                        ) : (
                            <div className="grid grid-cols-[repeat(auto-fill,minmax(100px,1fr))] gap-4">
                                {/* Upload Button for Custom Category */}
                                {activeCategory === 'Custom' && !searchTerm && (
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className="border-2 border-dashed border-gray-300 rounded-lg p-3 cursor-pointer flex flex-col items-center justify-center gap-2 bg-gray-50 text-gray-500 transition-all hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50"
                                    >
                                        <input
                                            type="file"
                                            hidden
                                            ref={fileInputRef}
                                            onChange={handleUpload}
                                            accept="image/svg+xml,image/png,image/jpeg"
                                        />
                                        {uploading ? (
                                            <RefreshCw size={24} className="animate-spin" />
                                        ) : (
                                            <Upload size={24} />
                                        )}
                                        <span className="text-xs font-medium">{uploading ? 'Uploading...' : 'Upload New'}</span>
                                    </div>
                                )}

                                {categoryLoading ? (
                                    <div className="col-span-full flex justify-center p-10 text-gray-500">
                                        <RefreshCw size={24} className="animate-spin" />
                                    </div>
                                ) : displayIcons.length > 0 ? (
                                    displayIcons.map((icon, idx) => (
                                        <div
                                            key={idx}
                                            onClick={() => onSelect(icon.url)}
                                            className={`rounded-lg p-3 cursor-pointer flex flex-col items-center justify-center gap-2 transition-all hover:shadow-md hover:border-blue-300 ${currentIcon === icon.url ? 'border-2 border-blue-600 bg-blue-50' : 'border border-gray-200 bg-white'}`}
                                        >
                                            <div className="w-12 h-12 flex items-center justify-center">
                                                <img src={icon.url} alt={icon.name} className="max-w-full max-h-full object-contain" loading="lazy" />
                                            </div>
                                            <span className="text-[11px] text-center text-gray-600 break-words leading-tight">
                                                {icon.name.replace(/\.[^/.]+$/, "")}
                                            </span>
                                        </div>
                                    ))
                                ) : activeCategory !== 'Custom' && (
                                    <div className="col-span-full flex flex-col items-center justify-center text-gray-400 p-10">
                                        <ImageIcon size={48} className="opacity-20 mb-4" />
                                        <p>No icons found in this category</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default IconPicker;
