import React from 'react';

export const SkeletonCard = () => (
    <div className="bg-white rounded-xl p-5 border border-gray-200 animate-pulse">
        <div className="h-5 bg-gray-200 rounded mb-3 w-3/5" />
        <div className="h-4 bg-gray-100 rounded mb-2" />
        <div className="h-4 bg-gray-100 rounded w-4/5" />
    </div>
);

export const SkeletonStats = () => (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5">
        {[1, 2, 3].map(i => (
            <div
                key={i}
                className="bg-white rounded-xl p-6 border border-gray-200 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
            >
                <div className="w-10 h-10 bg-gray-200 rounded-lg mb-3" />
                <div className="h-8 bg-gray-200 rounded mb-2 w-1/2" />
                <div className="h-3.5 bg-gray-100 rounded w-[70%]" />
            </div>
        ))}
    </div>
);

export const SkeletonList = ({ count = 3 }) => (
    <div className="flex flex-col gap-4">
        {Array.from({ length: count }).map((_, i) => (
            <div
                key={i}
                className="bg-white rounded-lg p-4 border border-gray-200 flex gap-4 animate-pulse"
                style={{ animationDelay: `${i * 0.1}s` }}
            >
                <div className="w-[60px] h-[60px] bg-gray-200 rounded-lg shrink-0" />
                <div className="flex-1">
                    <div className="h-[18px] bg-gray-200 rounded mb-2 w-[70%]" />
                    <div className="h-3.5 bg-gray-100 rounded mb-1.5" />
                    <div className="h-3.5 bg-gray-100 rounded w-1/2" />
                </div>
            </div>
        ))}
    </div>
);

export const SkeletonTable = ({ rows = 5 }) => (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {Array.from({ length: rows }).map((_, i) => (
            <div
                key={i}
                className={`p-4 flex gap-4 animate-pulse ${i < rows - 1 ? 'border-b border-gray-200' : ''}`}
                style={{ animationDelay: `${i * 0.1}s` }}
            >
                <div className="w-10 h-10 bg-gray-200 rounded-full shrink-0" />
                <div className="flex-1 flex flex-col gap-2">
                    <div className="h-4 bg-gray-200 rounded w-2/5" />
                    <div className="h-3.5 bg-gray-100 rounded w-3/5" />
                </div>
            </div>
        ))}
    </div>
);
