'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles } from 'lucide-react';
import { useHomeSettings } from '../context/HomeSettingsContext';

const CallToAction = () => {
    const { settings } = useHomeSettings();

    if (!settings?.show_cta_section) {
        return null;
    }

    const title = settings.cta_title || 'Ready to Start Your Learning Journey?';
    const subtitle = settings.cta_subtitle || 'Join thousands of students who have transformed their careers with our courses.';
    const buttonText = settings.cta_button_text || 'Get Started Now';
    const buttonLink = settings.cta_button_link || '/store';
    const bgColor = settings.cta_bg_color || 'from-blue-600 to-indigo-700';

    return (
        <section className={`relative py-20 overflow-hidden bg-gradient-to-r ${bgColor}`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
                <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="cta-pattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                            <circle cx="20" cy="20" r="2" fill="currentColor" className="text-white" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#cta-pattern)" />
                </svg>
            </div>

            {/* Decorative Blur Elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

            <div className="relative max-w-4xl mx-auto px-6 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white/90 text-sm font-medium mb-6 backdrop-blur-sm">
                    <Sparkles size={16} />
                    <span>Limited Time Offer</span>
                </div>

                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-6 leading-tight">
                    {title}
                </h2>
                <p className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
                    {subtitle}
                </p>

                <Link
                    href={buttonLink}
                    className="inline-flex items-center gap-3 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-lg"
                >
                    {buttonText}
                    <ArrowRight size={20} />
                </Link>

                {/* Trust Indicators */}
                <div className="mt-12 flex flex-wrap items-center justify-center gap-8 text-white/70 text-sm">
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>No credit card required</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Instant access</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <span>Cancel anytime</span>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default CallToAction;
