
import React from 'react';
import { Video } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../lib/server/institute';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function VideosGalleryPage() {
    const institute = await fetchInstituteServer();

    if (institute?.feature_flags?.galleryEnabled === false) {
        notFound();
    }

    let videos = [];
    if (institute) {
        videos = await prisma.gallery_items.findMany({
            where: {
                institute_id: BigInt(institute.id),
                type: 'video',
                is_active: true
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    const safeVideos = JSON.parse(JSON.stringify(videos, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

    return (
        <div className="max-w-[1200px] mx-auto py-12 px-5">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <Video className="text-[var(--primary-color)]" size={32} />
                Video Gallery
            </h1>

            {safeVideos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <Video className="mx-auto text-gray-300 mb-3" size={48} />
                    <h3 className="text-lg font-medium text-gray-900">No videos yet</h3>
                    <p className="text-gray-500">Check back later for updates.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
                    {safeVideos.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            <a href={item.url} target="_blank" rel="noopener noreferrer" className="block relative aspect-video bg-gray-900 overflow-hidden">
                                {item.thumbnail_url ? (
                                    <img
                                        src={item.thumbnail_url}
                                        alt={item.title}
                                        className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gray-800 flex items-center justify-center">
                                        <Video className="text-gray-600" size={48} />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[20px] border-l-white border-b-[10px] border-b-transparent ml-1"></div>
                                    </div>
                                </div>
                            </a>
                            <div className="p-4">
                                {/* <h3 className="font-semibold text-lg text-gray-900 mb-2 line-clamp-1">{item.title}</h3> */}
                                {item.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2">
                                        {item.description}
                                    </p>
                                )}
                                {item.created_at && (
                                    <div className="mt-3 text-xs text-gray-400">
                                        Added on {new Date(item.created_at).toLocaleDateString()}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
