
import React from 'react';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../lib/server/institute';
import { notFound } from 'next/navigation';

export async function generateMetadata() {
    const institute = await fetchInstituteServer();
    return {
        title: `About Us | ${institute?.name || 'Academy'}`,
        description: institute?.slogan || 'Premier coaching institute for competitive exams.',
    };
}

export default async function AboutUsPage() {
    // We still fetch institute data to ensure the page is enabled
    const institute = await fetchInstituteServer();
    if (!institute) return null;

    if (institute.feature_flags?.aboutUsEnabled === false) {
        notFound();
    }

    // Default content validation and fallback
    const defaultContent = {
        badge: "IIT & NIT Alumni Initiative",
        left_panel: {
            title: "Dedicated to <br class='hidden lg:block' />Engineering Excellence",
            description: `Welcome to Chennai&apos;s premier coaching institute for technical competitive exams. Founded by IIT and NIT alumni, <strong class="text-[#0a2e5c]">${institute.name}</strong> provides a strategic roadmap for aspirants targeting:`
        },
        tags: ['TNPSC AE', 'JDO', 'SSC-JE', 'GATE'],
        middle_highlight: "bilingual explanations (English + Tamil)",
        right_panel: {
            title: "Why Choose Us?",
            items: [
                { title: '500+ Selections', desc: 'Proven track record in TNPCB, JDO, and TNHB exams.' },
                { title: 'Official Learning App', desc: 'Access E-Notes, Mind Maps, and Mock Tests on the go.' },
                { title: 'State Rank Holders', desc: 'Home to top rankers, including State Rank 9 in TNPCB.' },
            ]
        },
        stats: [
            { value: "30K+", label: "YouTube Family" },
            { value: "10,000+", label: "App Downloads" },
            { value: "500+", label: "Govt. Selections" }
        ]
    };

    // Merge DB config with default content
    const config = institute.about_us_config || {};
    const content = { ...defaultContent, ...config };

    return (
        <div className="min-h-screen bg-white font-sans text-slate-700">
            <main className="max-w-7xl mx-auto px-6 py-12 lg:py-20">

                {/* Hero Section */}
                <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0a2e5c] via-[#1a4a7d] to-[#0a2e5c] px-8 py-20 text-center text-white shadow-2xl mb-12">
                    {/* Decorative Background Element */}
                    <div className="pointer-events-none absolute -left-1/4 -top-1/2 h-[200%] w-[50%] bg-[radial-gradient(circle,rgba(247,148,29,0.1)_0%,transparent_50%)]"></div>

                    <div className="relative z-10">
                        <div className="inline-block rounded-full bg-[#f7941d] px-6 py-2 mb-6">
                            <span className="text-xs font-bold uppercase tracking-[0.15em] text-white">{content.badge}</span>
                        </div>
                        <h1 className="mb-4 text-5xl font-extrabold tracking-tight text-white lg:text-6xl">
                            {institute.name}
                        </h1>
                        <p className="text-xl font-light text-white/90 lg:text-2xl">
                            {institute.slogan}
                        </p>
                        <div className="mx-auto mt-8 h-1.5 w-24 rounded-full bg-gradient-to-r from-[#f7941d] to-[#ffb84d]"></div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid gap-8 lg:grid-cols-2 mb-12">

                    {/* Left Column: About Panel */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg lg:p-10">
                        <h2 className="mb-6 text-3xl font-bold leading-tight text-[#0a2e5c]" dangerouslySetInnerHTML={{ __html: content.left_panel.title }}>
                        </h2>
                        <p className="mb-6 text-lg leading-relaxed text-slate-600" dangerouslySetInnerHTML={{ __html: content.left_panel.description }}>
                        </p>

                        <div className="mb-8 flex flex-wrap gap-3">
                            {content.tags?.map((tag) => (
                                <span key={tag} className="rounded-lg bg-[#0a2e5c] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <p className="text-lg leading-relaxed text-slate-600">
                            We pride ourselves on making technical concepts accessible through <strong className="text-[#f7941d]">{content.middle_highlight}</strong>, ensuring every student has the tools to succeed in the public sector.
                        </p>
                    </div>

                    {/* Right Column: Why Choose Us */}
                    <div className="rounded-3xl border-2 border-[#f7941d] bg-gradient-to-br from-slate-50 to-white p-8 shadow-lg lg:p-10">
                        <h3 className="mb-8 flex items-center gap-3 text-2xl font-bold text-[#0a2e5c]">
                            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#f7941d] to-[#ffb84d] text-white shadow-md">★</span>
                            {content.right_panel.title}
                        </h3>

                        <div className="space-y-4">
                            {content.right_panel.items?.map((item, idx) => (
                                <div key={idx} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm transition-shadow hover:shadow-md border border-slate-100">
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-xs font-bold text-white shadow-sm">
                                        ✓
                                    </div>
                                    <div>
                                        <strong className="block text-lg text-[#0a2e5c]">{item.title}</strong>
                                        <span className="text-slate-500">{item.desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stats Section */}
                <div className="rounded-3xl bg-[#0a2e5c] px-6 py-12 text-center text-white shadow-2xl lg:px-12">
                    <div className="grid gap-8 sm:grid-cols-3">
                        {content.stats?.map((stat, idx) => (
                            <div key={idx} className={`space-y-2 ${idx === 1 ? 'border-slate-700 sm:border-l sm:border-r' : ''}`}>
                                <div className="text-5xl font-extrabold text-[#f7941d]">{stat.value}</div>
                                <div className="text-lg font-medium text-white/80">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

            </main>
        </div>
    );
}
