'use client';

import React, { useState, useMemo } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableFAQ = ({ faqs }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [openIds, setOpenIds] = useState(new Set());

    const filteredFaqs = useMemo(() => {
        if (!searchQuery.trim()) return faqs;

        const query = searchQuery.toLowerCase();
        return faqs.filter(faq =>
            faq.question.toLowerCase().includes(query) ||
            faq.answer.toLowerCase().includes(query)
        );
    }, [faqs, searchQuery]);

    const toggleFaq = (id) => {
        setOpenIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const expandAll = () => {
        setOpenIds(new Set(filteredFaqs.map(faq => faq.id)));
    };

    const collapseAll = () => {
        setOpenIds(new Set());
    };

    return (
        <div>
            {/* Search Bar */}
            <div className="mb-8">
                <div className="relative max-w-xl mx-auto">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search FAQs..."
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Filter Info & Controls */}
                <div className="flex items-center justify-between max-w-xl mx-auto mt-4">
                    <p className="text-sm text-slate-500">
                        {searchQuery ? (
                            <>Showing {filteredFaqs.length} of {faqs.length} FAQs</>
                        ) : (
                            <>{faqs.length} FAQs available</>
                        )}
                    </p>
                    <div className="flex gap-3">
                        <button
                            onClick={expandAll}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            Expand All
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                            onClick={collapseAll}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            Collapse All
                        </button>
                    </div>
                </div>
            </div>

            {/* FAQ List */}
            {filteredFaqs.length > 0 ? (
                <div className="space-y-4">
                    {filteredFaqs.map((faq) => (
                        <div
                            key={faq.id}
                            className="bg-slate-50 rounded-xl overflow-hidden border border-slate-100 hover:border-slate-200 transition-colors"
                        >
                            <button
                                onClick={() => toggleFaq(faq.id)}
                                className="w-full flex items-center justify-between p-6 text-left font-medium text-slate-900 hover:text-blue-600 transition-colors"
                            >
                                <span className="text-lg pr-4">{faq.question}</span>
                                <ChevronDown
                                    className={`shrink-0 transform transition-transform duration-200 ${openIds.has(faq.id) ? 'rotate-180' : ''
                                        }`}
                                    size={20}
                                />
                            </button>
                            <div
                                className={`overflow-hidden transition-all duration-300 ${openIds.has(faq.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                                    }`}
                            >
                                <div className="px-6 pb-6 text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                                    {faq.answer}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-16">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="text-slate-400" size={24} />
                    </div>
                    <p className="text-slate-500 text-lg">
                        {searchQuery ? (
                            <>No FAQs found matching "<span className="font-medium text-slate-700">{searchQuery}</span>"</>
                        ) : (
                            'No FAQs available at the moment.'
                        )}
                    </p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors"
                        >
                            Clear search
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchableFAQ;
