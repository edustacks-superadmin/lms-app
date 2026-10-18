'use client';

import React from 'react';

// Base skeleton with shimmer effect
const SkeletonBase = ({ className = '' }) => (
    <div className={`animate-pulse bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] rounded ${className}`} />
);

// Text line skeleton
export const SkeletonText = ({ width = 'w-full', height = 'h-4' }) => (
    <SkeletonBase className={`${width} ${height}`} />
);

// Paragraph skeleton (multiple lines)
export const SkeletonParagraph = ({ lines = 3 }) => (
    <div className="space-y-3">
        {Array.from({ length: lines }).map((_, i) => (
            <SkeletonBase
                key={i}
                className={`h-4 ${i === lines - 1 ? 'w-2/3' : 'w-full'}`}
            />
        ))}
    </div>
);

// Avatar/Circle skeleton
export const SkeletonAvatar = ({ size = 'w-12 h-12' }) => (
    <SkeletonBase className={`${size} rounded-full`} />
);

// Image/Card skeleton
export const SkeletonImage = ({ aspectRatio = 'aspect-video' }) => (
    <SkeletonBase className={`w-full ${aspectRatio}`} />
);

// Button skeleton
export const SkeletonButton = ({ width = 'w-24', height = 'h-10' }) => (
    <SkeletonBase className={`${width} ${height} rounded-lg`} />
);

// Product Card Skeleton
export const ProductCardSkeleton = () => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
        <SkeletonImage aspectRatio="aspect-[4/3]" />
        <div className="p-5 space-y-4">
            <SkeletonText width="w-3/4" height="h-5" />
            <SkeletonParagraph lines={2} />
            <div className="flex items-center justify-between">
                <SkeletonText width="w-20" height="h-6" />
                <SkeletonButton width="w-28" height="h-10" />
            </div>
        </div>
    </div>
);

// FAQ Skeleton
export const FAQSkeleton = ({ count = 5 }) => (
    <div className="space-y-4">
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-6">
                <div className="flex items-center justify-between">
                    <SkeletonText width="w-2/3" height="h-5" />
                    <SkeletonBase className="w-5 h-5" />
                </div>
            </div>
        ))}
    </div>
);

// Gallery Skeleton
export const GallerySkeleton = ({ count = 6, columns = 'grid-cols-2 md:grid-cols-3' }) => (
    <div className={`grid ${columns} gap-4`}>
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonImage key={i} aspectRatio="aspect-square" />
        ))}
    </div>
);

// Resource Card Skeleton
export const ResourceCardSkeleton = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <div className="flex items-start gap-4">
            <SkeletonBase className="w-12 h-12 rounded-lg" />
            <div className="flex-1 space-y-2">
                <SkeletonText width="w-3/4" height="h-5" />
                <SkeletonText width="w-1/2" height="h-3" />
            </div>
        </div>
        <SkeletonParagraph lines={2} />
        <div className="flex gap-2">
            <SkeletonButton width="w-20" height="h-8" />
            <SkeletonButton width="w-20" height="h-8" />
        </div>
    </div>
);

// Post Card Skeleton
export const PostCardSkeleton = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100">
        <SkeletonImage aspectRatio="aspect-[16/9]" />
        <div className="p-5 space-y-4">
            <div className="flex gap-2">
                <SkeletonText width="w-16" height="h-5" />
                <SkeletonText width="w-20" height="h-5" />
            </div>
            <SkeletonText width="w-full" height="h-6" />
            <SkeletonParagraph lines={2} />
            <div className="flex items-center gap-3">
                <SkeletonAvatar size="w-8 h-8" />
                <SkeletonText width="w-24" height="h-4" />
            </div>
        </div>
    </div>
);

// Testimonial Card Skeleton
export const TestimonialSkeleton = () => (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 space-y-4">
        <div className="flex items-center gap-4">
            <SkeletonAvatar size="w-14 h-14" />
            <div className="space-y-2">
                <SkeletonText width="w-32" height="h-4" />
                <SkeletonText width="w-24" height="h-3" />
            </div>
        </div>
        <SkeletonParagraph lines={3} />
        <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
                <SkeletonBase key={i} className="w-4 h-4" />
            ))}
        </div>
    </div>
);

// Stats Skeleton
export const StatsSkeleton = ({ count = 4 }) => (
    <div className={`grid grid-cols-2 md:grid-cols-${count} gap-8`}>
        {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="text-center space-y-3">
                <SkeletonBase className="w-14 h-14 rounded-2xl mx-auto" />
                <SkeletonText width="w-16" height="h-8" />
                <SkeletonText width="w-24" height="h-4" />
            </div>
        ))}
    </div>
);

// Page Header Skeleton
export const PageHeaderSkeleton = () => (
    <div className="text-center space-y-4 py-8">
        <SkeletonText width="w-48" height="h-10" />
        <SkeletonText width="w-96 max-w-full" height="h-5" />
    </div>
);

// Export default composite component
const Skeletons = {
    Text: SkeletonText,
    Paragraph: SkeletonParagraph,
    Avatar: SkeletonAvatar,
    Image: SkeletonImage,
    Button: SkeletonButton,
    ProductCard: ProductCardSkeleton,
    FAQ: FAQSkeleton,
    Gallery: GallerySkeleton,
    ResourceCard: ResourceCardSkeleton,
    PostCard: PostCardSkeleton,
    Testimonial: TestimonialSkeleton,
    Stats: StatsSkeleton,
    PageHeader: PageHeaderSkeleton,
};

export default Skeletons;
