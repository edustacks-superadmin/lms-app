
import React from 'react';
import { prisma } from '@/lib/prisma';
import { fetchInstituteServer } from '../../lib/server/institute';
import { notFound } from 'next/navigation';
import SearchableFAQ from '../../components/SearchableFAQ';
import FAQSchemaWrapper from '../../components/FAQSchemaWrapper';

export const metadata = {
    title: 'Frequently Asked Questions',
    description: 'Find answers to common questions about our platform and services.',
};

async function getFaqs() {
    const institute = await fetchInstituteServer();
    if (!institute) return [];

    if (institute.feature_flags?.faqEnabled === false) {
        notFound();
    }

    const faqs = await prisma.faqs.findMany({
        where: {
            institute_id: BigInt(institute.id),
            is_published: true,
        },
        orderBy: {
            display_order: 'asc',
        },
    });

    return JSON.parse(JSON.stringify(faqs, (key, value) =>
        typeof value === 'bigint' ? value.toString() : value
    ));
}

export default async function FaqPage() {
    const faqs = await getFaqs();

    return (
        <div className="min-h-screen bg-white">
            {/* FAQ Schema for SEO */}
            <FAQSchemaWrapper faqs={faqs} />

            <main className="max-w-4xl mx-auto px-6 py-12 lg:py-20">
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h1>
                    <p className="text-lg text-gray-600">Have questions? We're here to help.</p>
                </div>

                <SearchableFAQ faqs={faqs} />
            </main>
        </div>
    );
}
