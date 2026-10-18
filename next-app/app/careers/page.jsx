
import React from 'react';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../lib/server/institute';
import { Briefcase, MapPin, Clock, ArrowRight, Sparkles, Building2, Heart } from 'lucide-react';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export const metadata = {
    title: 'Careers',
    description: 'Join our team and help shape the future of education.',
};

async function getCareers() {
    const institute = await fetchInstituteServer();
    if (!institute) return { jobs: [], instituteName: '' };

    if (institute.feature_flags?.careersEnabled === false) {
        notFound();
    }

    const jobs = await prisma.careers.findMany({
        where: {
            institute_id: BigInt(institute.id),
            is_active: true,
        },
        orderBy: {
            posted_date: 'desc',
        },
    });

    return {
        jobs: JSON.parse(JSON.stringify(jobs, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
        )),
        instituteName: institute.name || 'Our Team'
    };
}

export default async function CareersPage() {
    const { jobs, instituteName } = await getCareers();

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Hero Section with Gradient */}
            <section className="relative bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 text-white overflow-hidden">
                {/* Decorative Elements */}
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full blur-3xl" />
                    <div className="absolute bottom-10 right-20 w-96 h-96 bg-purple-400 rounded-full blur-3xl" />
                </div>

                <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-28">
                    <div className="text-center max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium mb-6 backdrop-blur-sm border border-white/10">
                            <Sparkles size={16} />
                            <span>We're Hiring!</span>
                        </div>
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                            Join Our Team at<br />
                            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                                {instituteName}
                            </span>
                        </h1>
                        <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed">
                            We're on a mission to transform education. Be part of a team that's making quality learning accessible to everyone.
                        </p>

                        <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm">
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg backdrop-blur-sm">
                                <Building2 size={18} className="text-blue-400" />
                                <span>{jobs.length} Open Positions</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg backdrop-blur-sm">
                                <MapPin size={18} className="text-green-400" />
                                <span>Remote Friendly</span>
                            </div>
                            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-lg backdrop-blur-sm">
                                <Heart size={18} className="text-red-400" />
                                <span>Great Benefits</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Wave Divider */}
                <div className="absolute bottom-0 left-0 right-0">
                    <svg viewBox="0 0 1440 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M0 50L60 45.7C120 41 240 33 360 37.2C480 41 600 58 720 62.5C840 67 960 58 1080 50C1200 42 1320 33 1380 29.2L1440 25V100H1380C1320 100 1200 100 1080 100C960 100 840 100 720 100C600 100 480 100 360 100C240 100 120 100 60 100H0V50Z" fill="#f8fafc" />
                    </svg>
                </div>
            </section>

            {/* Job Listings */}
            <section className="py-16 bg-white">
                <div className="max-w-5xl mx-auto px-6">
                    <div className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Open Positions</h2>
                        <p className="text-slate-600">Find your next opportunity and grow with us</p>
                    </div>

                    {jobs.length > 0 ? (
                        <div className="space-y-6">
                            {jobs.map((job, index) => (
                                <div
                                    key={job.id}
                                    className="group bg-white rounded-2xl border-2 border-slate-100 p-6 sm:p-8 hover:border-blue-500 hover:shadow-xl transition-all duration-300"
                                    style={{ animationDelay: `${index * 100}ms` }}
                                >
                                    <div className="flex flex-col lg:flex-row justify-between items-start gap-6">
                                        <div className="flex-1 space-y-4">
                                            {/* Job Number Badge */}
                                            <div className="flex items-center gap-3">
                                                <span className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center text-white text-sm font-bold">
                                                    {index + 1}
                                                </span>
                                                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                                                    {job.title}
                                                </h3>
                                            </div>

                                            {/* Tags */}
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                                                    <Briefcase size={14} />
                                                    {job.type}
                                                </span>
                                                {job.location && (
                                                    <span className="flex items-center gap-1.5 px-4 py-1.5 bg-green-50 text-green-700 rounded-full text-sm font-medium">
                                                        <MapPin size={14} />
                                                        {job.location}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 text-slate-600 rounded-full text-sm font-medium">
                                                    <Clock size={14} />
                                                    Posted {new Date(job.posted_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>

                                            {/* Description */}
                                            {job.description && (
                                                <p className="text-slate-600 leading-relaxed text-base">
                                                    {job.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Apply Button - Desktop */}
                                        <Link
                                            href={job.apply_url || `/careers/${job.id}`}
                                            className="hidden lg:flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 shrink-0"
                                        >
                                            Apply Now
                                            <ArrowRight size={18} />
                                        </Link>
                                    </div>

                                    {/* Apply Button - Mobile */}
                                    <Link
                                        href={job.apply_url || `/careers/${job.id}`}
                                        className="lg:hidden mt-6 w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all"
                                    >
                                        Apply Now
                                        <ArrowRight size={18} />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                            <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Briefcase className="text-slate-400" size={36} />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 mb-3">No Open Positions</h3>
                            <p className="text-slate-500 max-w-md mx-auto mb-8">
                                We don't have any job openings right now, but we're always interested in meeting talented people!
                            </p>
                            <Link
                                href="/contact-us"
                                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors"
                            >
                                Get in Touch
                                <ArrowRight size={18} />
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-16 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <div className="max-w-4xl mx-auto px-6 text-center">
                    <h2 className="text-3xl font-bold mb-4">Don't See the Right Role?</h2>
                    <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
                        We're always looking for talented individuals. Send us your resume and we'll keep you in mind for future opportunities.
                    </p>
                    <Link
                        href="/contact-us"
                        className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-600 rounded-xl font-bold hover:bg-blue-50 transition-colors shadow-lg"
                    >
                        Send Your Resume
                        <ArrowRight size={18} />
                    </Link>
                </div>
            </section>
        </div>
    );
}
