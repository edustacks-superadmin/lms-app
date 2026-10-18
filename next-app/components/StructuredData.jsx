'use client';

import React from 'react';
import Script from 'next/script';
import { useInstitute } from '../context/InstituteContext';

// Organization Schema
export const OrganizationSchema = () => {
    const { institute } = useInstitute();

    if (!institute) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "EducationalOrganization",
        "name": institute.name || "Institute",
        "description": institute.description || "",
        "url": typeof window !== 'undefined' ? window.location.origin : '',
        "logo": institute.logo_url || "",
        "address": institute.address ? {
            "@type": "PostalAddress",
            "streetAddress": institute.address
        } : undefined,
        "telephone": institute.phone || undefined,
        "email": institute.email || undefined,
        "sameAs": [
            institute.facebook_url,
            institute.instagram_url,
            institute.youtube_url,
            institute.linkedin_url,
            institute.telegram_url,
        ].filter(Boolean)
    };

    return (
        <Script
            id="organization-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

// Course/Product Schema
export const CourseSchema = ({ course }) => {
    if (!course) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "Course",
        "name": course.title || course.name,
        "description": course.description || "",
        "provider": {
            "@type": "Organization",
            "name": course.provider_name || "Institute"
        },
        "image": course.thumbnail_url || course.image_url || "",
        "offers": course.price ? {
            "@type": "Offer",
            "price": course.price,
            "priceCurrency": "INR",
            "availability": "https://schema.org/InStock"
        } : undefined
    };

    return (
        <Script
            id={`course-schema-${course.id}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

// FAQ Schema
export const FAQSchema = ({ faqs }) => {
    if (!faqs || faqs.length === 0) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": faqs.map(faq => ({
            "@type": "Question",
            "name": faq.question,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
            }
        }))
    };

    return (
        <Script
            id="faq-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

// Breadcrumb Schema
export const BreadcrumbSchema = ({ items }) => {
    if (!items || items.length === 0) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": items.map((item, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "name": item.name,
            "item": item.url
        }))
    };

    return (
        <Script
            id="breadcrumb-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

// Article/Post Schema
export const ArticleSchema = ({ article }) => {
    if (!article) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "Article",
        "headline": article.title,
        "description": article.excerpt || article.description || "",
        "image": article.cover_image || article.thumbnail_url || "",
        "datePublished": article.created_at || article.published_at,
        "dateModified": article.updated_at || article.created_at,
        "author": article.author ? {
            "@type": "Person",
            "name": article.author.name || article.author
        } : undefined
    };

    return (
        <Script
            id={`article-schema-${article.id}`}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

// Website Schema (for homepage)
export const WebsiteSchema = () => {
    const { institute } = useInstitute();

    if (!institute) return null;

    const schema = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        "name": institute.name || "Institute",
        "url": typeof window !== 'undefined' ? window.location.origin : '',
        "potentialAction": {
            "@type": "SearchAction",
            "target": {
                "@type": "EntryPoint",
                "urlTemplate": typeof window !== 'undefined'
                    ? `${window.location.origin}/store?search={search_term_string}`
                    : ''
            },
            "query-input": "required name=search_term_string"
        }
    };

    return (
        <Script
            id="website-schema"
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />
    );
};

// Combined Structured Data component for HomePage
export const HomePageStructuredData = () => {
    return (
        <>
            <OrganizationSchema />
            <WebsiteSchema />
        </>
    );
};

export default {
    Organization: OrganizationSchema,
    Course: CourseSchema,
    FAQ: FAQSchema,
    Breadcrumb: BreadcrumbSchema,
    Article: ArticleSchema,
    Website: WebsiteSchema,
    HomePage: HomePageStructuredData
};
