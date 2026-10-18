
import React from 'react';
import { Image as ImageIcon } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../../lib/server/institute';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PhotosGalleryPage() {
    const institute = await fetchInstituteServer();

    if (institute?.feature_flags?.galleryEnabled === false) {
        notFound();
    }

    let photos = [];
    if (institute) {
        photos = await prisma.gallery_items.findMany({
            where: {
                institute_id: BigInt(institute.id),
                type: 'image',
                is_active: true
            },
            orderBy: {
                created_at: 'desc'
            }
        });
    }

    // Serialize BigInt
    const safePhotos = JSON.parse(JSON.stringify(photos, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));

    return (
        <div className="max-w-[1200px] mx-auto py-12 px-5">
            <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
                <ImageIcon className="text-[var(--primary-color)]" size={32} />
                Photo Gallery
            </h1>

            {safePhotos.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                    <ImageIcon className="mx-auto text-gray-300 mb-3" size={48} />
                    <h3 className="text-lg font-medium text-gray-900">No photos yet</h3>
                    <p className="text-gray-500">Check back later for updates.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {safePhotos.map((item) => (
                        <div key={item.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                            <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                <img
                                    src={item.url}
                                    alt={item.title}
                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                    loading="lazy"
                                />
                            </div>
                            <div className="p-4">
                                {/* <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">{item.title}</h3> */}
                                {item.description && (
                                    <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
