
import React from 'react';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../lib/server/institute';
import { Users } from 'lucide-react';
import { notFound } from 'next/navigation';

export const metadata = {
    title: 'Our Instructors & Team',
    description: 'Meet the expert team behind our success.',
};

async function getTeamMembers() {
    const institute = await fetchInstituteServer();
    if (!institute) return [];

    if (institute.feature_flags?.instructorsEnabled === false) {
        notFound();
    }

    const members = await prisma.team_members.findMany({
        where: {
            institute_id: BigInt(institute.id),
            is_active: true,
        },
        orderBy: {
            display_order: 'asc',
        },
    });

    return JSON.parse(JSON.stringify(members, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export default async function InstructorsPage() {
    const members = await getTeamMembers();

    return (
        <div className="min-h-screen bg-white">
            <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Meet Our Team</h1>
                    <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                        Our dedicated team of expert instructors and staff are committed to your success.
                    </p>
                </div>

                {members.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {members.map((member) => (
                            <div key={member.id} className="group bg-white rounded-2xl overflow-hidden hover:shadow-xl transition-shadow border border-gray-100">
                                <div className="aspect-[4/3] bg-gray-100 relative overflow-hidden">
                                    {member.photo_url ? (
                                        <img
                                            src={member.photo_url}
                                            alt={member.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                                            <Users size={64} />
                                        </div>
                                    )}
                                </div>
                                <div className="p-6">
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h3>
                                    <p className="text-[var(--primary-color)] font-medium mb-4">{member.role}</p>
                                    {member.bio && (
                                        <p className="text-gray-600 leading-relaxed text-sm line-clamp-4">
                                            {member.bio}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 text-gray-500">
                        No team members to display yet.
                    </div>
                )}
            </main>
        </div>
    );
}
