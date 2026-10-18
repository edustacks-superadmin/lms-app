'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Eye, Clock } from 'lucide-react';

const StudentPostCard = ({ post, onTagClick }) => {
    const router = useRouter();

    // Calculate read time
    const readTime = post.content
        ? Math.max(1, Math.ceil((post.content || '').replace(/<[^>]*>/g, '').trim().split(/\s+/).length / 200))
        : 1;

    // Check if post is new (last 48 hours)
    const isNew = post.publication_date && (new Date() - new Date(post.publication_date)) < (48 * 60 * 60 * 1000);

    const handleClick = () => {
        router.push(`/student/posts/${post.slug || post.id}`);
    };

    return (
        <div
            onClick={handleClick}
            className="group flex flex-col bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 hover:-translate-y-1 cursor-pointer h-full relative"
        >
            {/* New Badge */}
            {isNew && (
                <div className="absolute top-3 left-3 z-10">
                    <div className="bg-blue-600 text-white text-[10px] font-black px-2 py-1 rounded-md shadow-lg animate-pulse uppercase tracking-wider">
                        New
                    </div>
                </div>
            )}
            {/* Cover Image */}
            <div className="aspect-video w-full overflow-hidden bg-gray-100 relative">
                {post.cover_image || post.icon ? (
                    <img
                        src={post.cover_image || post.icon}
                        alt={post.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 bg-gray-50">
                        <span className="text-4xl">📄</span>
                    </div>
                )}

                {/* Featured Badge */}
                {post.is_featured && (
                    <div className="absolute top-3 right-3 bg-orange-500 text-white px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-lg">
                        <span>📌</span> Featured
                    </div>
                )}
            </div>

            {/* Card Content */}
            <div className="flex flex-col flex-grow p-5">
                {/* Metadata Row */}
                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3 font-medium">
                    {/* Category Badge */}
                    {post.categoryName && (
                        <span
                            onClick={(e) => {
                                e.stopPropagation();
                                if (onTagClick) onTagClick(post.category_id);
                            }}
                            className="px-2.5 py-1 rounded-lg text-xs font-bold text-white shadow-sm hover:scale-105 active:scale-95 transition-transform"
                            style={{ backgroundColor: post.categoryColor || '#2563eb' }}
                        >
                            {post.categoryName}
                        </span>
                    )}

                    {/* Date */}
                    {post.publication_date && (
                        <div className="flex items-center gap-1">
                            <Calendar size={12} />
                            <time dateTime={post.publication_date}>
                                {new Date(post.publication_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric'
                                })}
                            </time>
                        </div>
                    )}

                    {/* Views */}
                    <div className="flex items-center gap-1 ml-auto">
                        <Eye size={12} />
                        <span>{post.view_count || 0}</span>
                    </div>

                    {/* Read Time */}
                    <div className="flex items-center gap-1">
                        <Clock size={12} />
                        <span>{readTime}m</span>
                    </div>
                </div>

                {/* Title */}
                <h2 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-blue-600 transition-colors leading-tight">
                    {post.title}
                </h2>

                {/* Summary */}
                <p className="text-gray-600 text-sm mb-4 line-clamp-3 leading-relaxed">
                    {post.summary || post.description || 'Discover more about this topic by reading the full article...'}
                </p>

                {/* Read More Link */}
                <div className="mt-auto flex items-center text-blue-600 font-bold text-sm tracking-wide group-hover:gap-2 transition-all">
                    READ ARTICLE
                    <svg className="w-4 h-4 ml-1 group-hover:ml-0 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                </div>
            </div>
        </div>
    );
};

export default StudentPostCard;
