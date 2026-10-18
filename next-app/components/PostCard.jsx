import React from 'react';
import Image from 'next/image';
import { Calendar, Eye } from 'lucide-react';

const PostCard = ({ post }) => {
    return (
        <a
            href={`/posts/${post.slug || post.id}`}
            className="group block bg-white rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 hover:border-blue-100"
        >
            <div className="w-full aspect-video bg-gray-100 rounded-t-lg overflow-hidden relative border-b border-gray-50 mb-3">
                <Image
                    src={post.cover_image || '/images/default-post.png'}
                    alt={post.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                    sizes="(max-width: 768px) 100vw, 280px"
                />
            </div>
            <div className="px-3 pb-3">
                <h4 className="text-sm font-bold text-gray-800 line-clamp-2 leading-snug group-hover:text-blue-600 mb-2">
                    {post.title}
                </h4>
                <div className="flex items-center gap-3 text-xs text-gray-400 font-medium">
                    <div className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        <time>
                            {new Date(post.publication_date || post.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric'
                            })}
                        </time>
                    </div>
                    {post.view_count > 0 && (
                        <div className="flex items-center gap-1.5">
                            <Eye size={12} />
                            <span>{post.view_count || 0}</span>
                        </div>
                    )}
                </div>
            </div>
        </a>
    );
};

export default PostCard;
