'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronDown, Flame, Pin, LayoutGrid, Search, X } from 'lucide-react';

export default function PublicPostFilters({ categories }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [query, setQuery] = useState(searchParams.get('q') || '');

    useEffect(() => {
        setQuery(searchParams.get('q') || '');
    }, [searchParams]);

    const currentCategory = searchParams.get('category');
    const currentFilter = searchParams.get('filter');

    const handleFilterChange = (key, value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.delete('page'); // Reset pagination on filter change
        router.push(`/posts?${params.toString()}`);
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) {
            params.set('q', query.trim());
        } else {
            params.delete('q');
        }
        params.delete('page'); // Reset pagination on search
        router.push(`/posts?${params.toString()}`);
    };

    const clearSearch = () => {
        setQuery('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        params.delete('page');
        router.push(`/posts?${params.toString()}`);
    };

    const onCategoryChange = (e) => {
        handleFilterChange('category', e.target.value);
    };

    const toggleFilter = (val) => {
        if (currentFilter === val) {
            handleFilterChange('filter', null);
        } else {
            handleFilterChange('filter', val);
        }
    };

    return (
        <div className="mt-6 md:mt-8 flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100 flex-wrap">


            {/* Filter Chips (Popular / Featured) */}
            <div className="flex items-center gap-2 md:gap-3 flex-shrink-0 w-full md:w-auto justify-center overflow-x-auto md:overflow-x-visible pb-1 md:pb-0 scrollbar-hide">
                <button
                    onClick={() => handleFilterChange('filter', null)}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[13px] md:text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${!currentFilter
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    <LayoutGrid size={14} /> Only Latest
                </button>

                <button
                    onClick={() => toggleFilter('popular')}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[13px] md:text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${currentFilter === 'popular'
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    <Flame size={14} className={currentFilter === 'popular' ? 'text-orange-400' : 'text-orange-500'} />
                    Popular
                </button>

                <button
                    onClick={() => toggleFilter('featured')}
                    className={`px-3 py-1.5 md:px-4 md:py-2 rounded-full text-[13px] md:text-sm font-medium transition-all duration-200 border flex items-center gap-1.5 md:gap-2 whitespace-nowrap ${currentFilter === 'featured'
                        ? 'bg-gray-900 text-white border-gray-900 shadow-md transform scale-105'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                >
                    <Pin size={14} className={currentFilter === 'featured' ? 'text-emerald-400' : 'text-emerald-500'} />
                    Featured
                </button>
            </div>

            {/* Category Dropdown */}
            {categories.length > 0 && (
                <div className="relative group w-full md:w-auto px-4 md:px-0">
                    <select
                        value={currentCategory || ''}
                        onChange={onCategoryChange}
                        className="appearance-none w-full md:w-auto bg-white border border-gray-200 text-gray-700 py-2 pl-4 pr-10 rounded-full text-[13px] md:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm hover:border-gray-300 cursor-pointer md:min-w-[180px]"
                    >
                        <option value="">All Categories</option>
                        {categories.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                                {cat.name} ({cat.count})
                            </option>
                        ))}
                    </select>
                    <div className="absolute inset-y-0 right-4 md:right-0 flex items-center px-3 pointer-events-none text-gray-500">
                        <ChevronDown size={16} />
                    </div>
                </div>
            )}

            <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-64 px-4 md:px-0">
                <div className="relative flex items-center">
                    <div className="absolute left-4 md:left-3 text-gray-400">
                        <Search size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder="Search..."
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full pl-10 md:pl-9 pr-8 py-2 bg-white border border-gray-200 rounded-full text-[13px] md:text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10 focus:border-gray-900 transition-all text-gray-700 shadow-sm hover:border-gray-300"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={clearSearch}
                            className="absolute right-4 md:right-3 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    )}
                </div>
            </form>
        </div>
    );
}
