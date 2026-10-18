import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useInstitute } from '../context/InstituteContext';

const SEO = ({ title, description, keywords, name, type }) => {
    const { institute } = useInstitute();

    // Fallback to institute settings if props are not provided
    const siteTitle = title || institute?.seo_title || institute?.name || 'Edustacks';
    const metaDescription = description || institute?.meta_description || 'Online Learning Management System';
    const metaKeywords = keywords || institute?.keywords || 'education, lms, online learning';
    const robotsFollow = institute?.meta_robots_follow || 'Follow';
    const robotsIndex = institute?.meta_robots_index || 'Index';

    return (
        <Helmet>
            {/* Standard metadata tags */}
            <title>{siteTitle}</title>
            <meta name='description' content={metaDescription} />
            <meta name='keywords' content={metaKeywords} />
            <meta name='robots' content={`${robotsIndex}, ${robotsFollow}`} />
            <meta name='theme-color' content={institute?.theme_color || '#0088cc'} />
            <meta name='apple-mobile-web-app-title' content={institute?.name || 'Mahesh IES'} />

            {/* Open Graph tags */}
            <meta property="og:type" content={type || 'website'} />
            <meta property="og:title" content={siteTitle} />
            <meta property="og:description" content={metaDescription} />
            {/* <meta property="og:image" content={image} /> */}

            {/* Twitter tags */}
            <meta name="twitter:creator" content={name || institute?.name || ''} />
            <meta name="twitter:card" content={type || 'summary'} />
            <meta name="twitter:title" content={siteTitle} />
            <meta name="twitter:description" content={metaDescription} />
        </Helmet>
    );
}

export default SEO;
