'use client';

import React from 'react';
import { FileText, Download, ExternalLink, Calendar, Link as LinkIcon, AlertCircle } from 'lucide-react';

const ResourceList = ({ resources, loading, category }) => {
    if (loading) {
        return (
            <div className="space-y-4 p-4">
                {[1, 2, 3].map(i => (
                    <div key={i} className="h-20 bg-slate-100 rounded-xl animate-pulse"></div>
                ))}
            </div>
        );
    }

    if (!resources || resources.length === 0) {
        return (
            <div className="py-20 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                    <FileText size={32} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">No resources found</h3>
                <p className="text-slate-500 text-sm">Check back later for updates.</p>
            </div>
        );
    }

    const isNew = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays <= 7;
    };

    // Syllabus Table View for Syllabus Category
    if (category === 'Syllabus') {
        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Name of the Post</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden md:table-cell">Dept / Org</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Paper</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest hidden lg:table-cell w-32">Standard</th>
                            <th className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center w-24">Syllabus</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {(() => {
                            let lastTitle = null;
                            return resources.map((resource) => {
                                const meta = resource.metadata || {};
                                const associatedPosts = meta.posts || [];
                                const numRows = Math.max(1, associatedPosts.length);
                                const showHeader = resource.title !== lastTitle;
                                lastTitle = resource.title;

                                return (
                                    <React.Fragment key={resource.id}>
                                        {showHeader && (
                                            <tr className="bg-slate-900 border-b-2 border-slate-950">
                                                <td colSpan="5" className="px-6 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1 h-4 bg-blue-500 rounded-full"></div>
                                                        <span className="text-xs font-black text-white tracking-[0.15em] uppercase">
                                                            {resource.title}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {Array.from({ length: numRows }).map((_, pIdx) => {
                                            const post = associatedPosts[pIdx] || null;
                                            const isFirst = pIdx === 0;
                                            const isLast = pIdx === numRows - 1;

                                            return (
                                                <tr
                                                    key={`${resource.id}-${pIdx}`}
                                                    className={`
                                                        group hover:bg-blue-50/30 transition-colors 
                                                        ${isLast ? 'border-b-2 border-slate-200' : 'border-b border-slate-100'}
                                                    `}
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                                                                    {post ? post.name : resource.title}
                                                                </span>
                                                                {post && post.code && (
                                                                    <span className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200 shadow-sm">
                                                                        Code: {post.code}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            {isFirst && resource.description && (
                                                                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic border-l-2 border-blue-100 pl-3 py-0.5 mt-2 bg-slate-50/50 rounded-r-lg pr-2">
                                                                    {resource.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 hidden md:table-cell">
                                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                                                            {post ? (post.dept || '-') : (meta.department || '-')}
                                                        </span>
                                                    </td>
                                                    {isFirst && (
                                                        <>
                                                            <td rowSpan={numRows} className="px-6 py-4 hidden sm:table-cell align-top border-l border-slate-100 bg-slate-50/30">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-xs text-slate-700 font-bold">
                                                                        {meta.paper || '-'}
                                                                    </span>
                                                                    {meta.subject_code && (
                                                                        <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest">
                                                                            SUB CODE: {meta.subject_code}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td rowSpan={numRows} className="px-6 py-4 hidden lg:table-cell w-32 align-top border-l border-slate-100 bg-slate-50/30">
                                                                <span className="text-xs text-slate-600 font-extrabold uppercase tracking-tight">{meta.standard || '-'}</span>
                                                            </td>
                                                            <td rowSpan={numRows} className="px-6 py-4 w-24 align-top border-l border-slate-100 bg-slate-50/30">
                                                                <div className="flex justify-center">
                                                                    <a
                                                                        href={resource.file_url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="p-3 bg-white text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-md border border-slate-200 group/btn hover:scale-110 active:scale-95"
                                                                        title="Download Syllabus"
                                                                    >
                                                                        {resource.resource_type === 'link' ? <ExternalLink size={18} className="group-hover/btn:rotate-12 transition-transform" /> : <Download size={18} className="group-hover/btn:translate-y-0.5 transition-transform" />}
                                                                    </a>
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            );
                                        })}
                                    </React.Fragment>
                                );
                            });
                        })()}
                    </tbody>
                </table>
            </div>
        );
    }

    // Default List View for other categories
    return (
        <div className="divide-y divide-slate-100">
            {resources.map((resource) => (
                <div key={resource.id} className="group p-4 sm:p-6 hover:bg-slate-50 transition-colors flex items-center gap-4 sm:gap-6">
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        {resource.resource_type === 'link' ? <LinkIcon size={24} /> : <FileText size={24} />}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                                {resource.title}
                            </h3>
                            {isNew(resource.created_at) && (
                                <span className="bg-green-100 text-green-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide animate-pulse">
                                    New
                                </span>
                            )}
                        </div>
                        {resource.exam_name && (
                            <div className="mb-1.5">
                                <span className="inline-block bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                                    {resource.exam_name}
                                </span>
                            </div>
                        )}
                        <div className="flex items-center gap-4 text-xs text-slate-500">
                            {resource.description && (
                                <span className="hidden sm:inline-block text-slate-400 max-w-md truncate">
                                    {resource.description}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Action */}
                    <a
                        href={resource.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`
                            flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shrink-0
                            ${resource.resource_type === 'link'
                                ? 'bg-white text-slate-600 border border-slate-200 hover:border-blue-400 hover:text-blue-600'
                                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm hover:shadow-blue-200'
                            }
                        `}
                    >
                        {resource.resource_type === 'link' ? (
                            <>
                                <span>View</span>
                                <ExternalLink size={16} />
                            </>
                        ) : (
                            <>
                                <span className="hidden sm:inline">Download</span>
                                <Download size={16} />
                            </>
                        )}
                    </a>
                </div>
            ))}
        </div>
    );
};

export default ResourceList;
