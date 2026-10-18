'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';

const PublicPostSearch = ({ initialQuery = '' }) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [query, setQuery] = useState(initialQuery);

    useEffect(() => {
        setQuery(initialQuery);
    }, [initialQuery]);

    const handleSearch = (e) => {
        e.preventDefault();
        const params = new URLSearchParams(searchParams.toString());
        if (query.trim()) {
            params.set('q', query.trim());
        } else {
            params.delete('q');
        }
        router.push(`/posts?${params.toString()}`);
    };

    const clearSearch = () => {
        setQuery('');
        const params = new URLSearchParams(searchParams.toString());
        params.delete('q');
        router.push(`/posts?${params.toString()}`);
    };

    return (
        <form
            onSubmit={handleSearch}
            className="relative max-w-md mx-auto mb-10"
        >
            <div className="relative flex items-center">
                <div className="absolute left-4 text-gray-400">
                    <Search size={20} />
                </div>
                <input
                    type="text"
                    placeholder="Search articles, news..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-white border border-gray-200 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-gray-700"
                />
                {query && (
                    <button
                        type="button"
                        onClick={clearSearch}
                        className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={18} />
                    </button>
                )}
            </div>
            <button type="submit" className="hidden">Search</button>
        </form>
    );
};

export default PublicPostSearch;
