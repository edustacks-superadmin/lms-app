'use client';

import React, { useEffect, useState } from 'react';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';

const PartnerLogos = () => {
    const { settings } = useHomeSettings();
    const { institute } = useInstitute();
    const [logos, setLogos] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (institute?.id && settings?.show_partner_logos) {
            fetchLogos();
        } else {
            setLoading(false);
        }
    }, [institute?.id, settings?.show_partner_logos]);

    const fetchLogos = async () => {
        try {
            const res = await fetch(`/api/admin/partners?instituteId=${institute.id}`);
            const data = await res.json();
            if (data.success) {
                setLogos(data.data || []);
            }
        } catch (error) {
            console.error('Error fetching partner logos:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!settings?.show_partner_logos || logos.length === 0) {
        return null;
    }

    return (
        <section className="py-12 bg-slate-50 border-y border-slate-100">
            <div className="max-w-7xl mx-auto px-6">
                <h3 className="text-center text-sm font-bold uppercase tracking-wider text-slate-400 mb-8">
                    {settings.partner_logos_title || 'Trusted By'}
                </h3>

                <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
                    {logos.map((logo) => (
                        <a
                            key={logo.id}
                            href={logo.website_url || '#'}
                            target={logo.website_url ? '_blank' : '_self'}
                            rel="noopener noreferrer"
                            className="group"
                            title={logo.name}
                        >
                            <img
                                src={logo.logo_url}
                                alt={logo.name}
                                className="h-12 md:h-16 w-auto object-contain opacity-60 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-300"
                            />
                        </a>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default PartnerLogos;
