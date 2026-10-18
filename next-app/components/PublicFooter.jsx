'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';
import { Facebook, Instagram, Linkedin, Youtube, Mail, Phone, MapPin, Send, Globe, MessageCircle, Radio, Loader, CheckCircle } from 'lucide-react';

const PublicFooter = () => {
    const { settings } = useHomeSettings(); // For copyright, privacy, terms
    const { institute } = useInstitute(); // For contact, social, about

    // Newsletter state
    const [email, setEmail] = useState('');
    const [newsletterStatus, setNewsletterStatus] = useState('idle'); // idle, loading, success, error
    const [newsletterMessage, setNewsletterMessage] = useState('');

    const handleNewsletterSubmit = async (e) => {
        e.preventDefault();
        if (!email || !institute?.id) return;

        setNewsletterStatus('loading');
        try {
            const res = await fetch('/api/newsletter/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, instituteId: institute.id })
            });
            const data = await res.json();

            if (res.ok) {
                setNewsletterStatus('success');
                setNewsletterMessage(data.message || 'Successfully subscribed!');
                setEmail('');
            } else {
                setNewsletterStatus('error');
                setNewsletterMessage(data.error || 'Failed to subscribe');
            }
        } catch (error) {
            setNewsletterStatus('error');
            setNewsletterMessage('Something went wrong. Please try again.');
        }

        // Reset status after 5 seconds
        setTimeout(() => {
            setNewsletterStatus('idle');
            setNewsletterMessage('');
        }, 5000);
    };

    const flags = institute?.feature_flags || {};
    const showAbout = flags.aboutUsEnabled !== false;
    const showContact = flags.contactUsEnabled !== false;
    const showInstructors = flags.instructorsEnabled !== false;
    const showCareers = flags.careersEnabled !== false;
    const showFaq = flags.faqEnabled !== false;
    const showCompanyColumn = showAbout || showInstructors || showCareers || showContact;

    // Colorful Social Links consistent with FloatingSidebar
    const socialLinks = [
        { icon: Youtube, url: institute?.youtube_url, label: 'YouTube', color: 'bg-red-600 hover:bg-red-700' },
        { icon: Send, url: institute?.telegram_url, label: 'Telegram', color: 'bg-sky-500 hover:bg-sky-600' },
        { icon: Globe, url: institute?.blogger_url, label: 'Blogger', color: 'bg-orange-500 hover:bg-orange-600' },
        { icon: MessageCircle, url: institute?.whatsapp_url, label: 'WhatsApp', color: 'bg-green-500 hover:bg-green-600' },
        { icon: Radio, url: institute?.arattai_url, label: 'Arattai', color: 'bg-orange-600 hover:bg-orange-700' },
        // Fallbacks for standard ones if needed, though usually mapped above
        { icon: Facebook, url: institute?.facebook_url, label: 'Facebook', color: 'bg-blue-600 hover:bg-blue-700' },
        { icon: Instagram, url: institute?.instagram_url, label: 'Instagram', color: 'bg-pink-600 hover:bg-pink-700' },
        { icon: Linkedin, url: institute?.linkedin_url, label: 'LinkedIn', color: 'bg-blue-700 hover:bg-blue-800' },
    ].filter(link => link.url);

    return (
        <footer className="bg-gradient-to-b from-slate-900 to-slate-950 text-white mt-auto border-t border-slate-800/50">
            {/* Main Footer Content */}
            <div className="w-full max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                {/* About Column */}
                <div className="space-y-6">
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">About Us</h3>
                        <div className="w-12 h-1 bg-blue-500 rounded-full mb-6"></div>
                    </div>
                    <p className="text-sm leading-7 text-slate-400">
                        {institute?.description || 'Edustacks is dedicated to providing quality education and training to help students achieve their goals.'}
                    </p>
                    {institute?.mission_text && (
                        <p className="text-sm leading-relaxed text-slate-500 italic border-l-2 border-slate-800 pl-4">
                            "{institute.mission_text}"
                        </p>
                    )}
                </div>

                {/* Quick Links Column */}
                <div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Quick Links</h3>
                        <div className="w-12 h-1 bg-blue-500 rounded-full mb-6"></div>
                    </div>
                    <ul className="space-y-3">
                        {[
                            { href: '/', label: 'Home' },
                            { href: '/store', label: 'Store' },
                            ...(flags.galleryEnabled !== false ? [{ href: '/gallery', label: 'Gallery' }] : []),
                            ...(flags.resourcesEnabled !== false ? [{ href: '/resources', label: 'Resources' }] : []),
                            { href: '/student/signup', label: 'Sign Up' },
                            ...(showFaq ? [{ href: '/faq', label: 'FAQs' }] : []),
                            { href: '/login', label: 'Student Login' },
                            { href: '/affiliate-program', label: 'Become an Affiliate' }
                        ].map((link) => (
                            <li key={link.href}>
                                <Link
                                    href={link.href}
                                    className="text-sm text-slate-400 hover:text-white transition-all duration-300 flex items-center hover:translate-x-1"
                                >
                                    <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 opacity-0 hover:opacity-100 transition-opacity"></span>
                                    {link.label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Company Column - NEW */}
                {showCompanyColumn && (
                    <div>
                        <div>
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Company</h3>
                            <div className="w-12 h-1 bg-blue-500 rounded-full mb-6"></div>
                        </div>
                        <ul className="space-y-3">
                            {[
                                ...(showAbout ? [{ href: '/about-us', label: 'About Us' }] : []),
                                ...(showInstructors ? [{ href: '/instructors', label: 'Our Instructors' }] : []),
                                ...(showCareers ? [{ href: '/careers', label: 'Careers' }] : []),
                                ...(showContact ? [{ href: '/contact-us', label: 'Contact Us' }] : [])
                            ].map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-sm text-slate-400 hover:text-white transition-all duration-300 flex items-center hover:translate-x-1"
                                    >
                                        <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2 opacity-0 hover:opacity-100 transition-opacity"></span>
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Contact Column */}
                <div>
                    <div>
                        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">Contact Us</h3>
                        <div className="w-12 h-1 bg-blue-500 rounded-full mb-6"></div>
                    </div>
                    <div className="flex flex-col gap-5">
                        {institute?.address && (
                            <div className="flex gap-4 items-start group">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <MapPin size={16} />
                                </div>
                                <span className="text-sm leading-relaxed text-slate-400 group-hover:text-slate-200 transition-colors">
                                    {institute.address}
                                </span>
                            </div>
                        )}
                        {institute?.phone && (
                            <div className="flex gap-4 items-center group">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <Phone size={16} />
                                </div>
                                <a href={`tel:${institute.phone}`} className="text-sm text-slate-400 hover:text-white transition-colors">
                                    {institute.phone}
                                </a>
                            </div>
                        )}
                        {institute?.email && (
                            <div className="flex gap-4 items-center group">
                                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-blue-500 shrink-0 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                    <Mail size={16} />
                                </div>
                                <a href={`mailto:${institute.email}`} className="text-sm text-slate-400 hover:text-white transition-colors">
                                    {institute.email}
                                </a>
                            </div>
                        )}

                        {/* Social Media Icons */}
                        {socialLinks.length > 0 && (
                            <div className="pt-4">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Connect With Us</p>
                                <div className="flex gap-3 flex-wrap">
                                    {socialLinks.map(({ icon: Icon, url, label, color }) => (
                                        <a
                                            key={label}
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            aria-label={label}
                                            title={label}
                                            className={`
                                                w-10 h-10 flex items-center justify-center rounded-full 
                                                bg-slate-800 text-slate-400 shadow-lg 
                                                transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl hover:text-white
                                                ${color.split(' ').filter(c => c.startsWith('hover:')).join(' ')}
                                            `}
                                        >
                                            <Icon size={18} />
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Newsletter Section */}
            {
                settings?.show_newsletter && (
                    <div className="border-t border-slate-800 py-12 bg-gradient-to-r from-slate-900 to-slate-950">
                        <div className="max-w-4xl mx-auto px-6 text-center">
                            <h3 className="text-xl md:text-2xl font-bold text-white mb-2">
                                {settings.newsletter_title || 'Subscribe to Our Newsletter'}
                            </h3>
                            <p className="text-slate-400 text-sm mb-6">
                                {settings.newsletter_subtitle || 'Stay updated with latest courses and offers'}
                            </p>

                            <form onSubmit={handleNewsletterSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
                                <div className="flex-1 relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Enter your email address"
                                        className="w-full pl-11 pr-4 py-3.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                        required
                                        disabled={newsletterStatus === 'loading'}
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={newsletterStatus === 'loading'}
                                    className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {newsletterStatus === 'loading' ? (
                                        <>
                                            <Loader className="animate-spin" size={18} />
                                            Subscribing...
                                        </>
                                    ) : (
                                        <>
                                            <Send size={18} />
                                            Subscribe
                                        </>
                                    )}
                                </button>
                            </form>

                            {newsletterMessage && (
                                <div className={`mt-4 flex items-center justify-center gap-2 text-sm ${newsletterStatus === 'success' ? 'text-green-400' : 'text-red-400'
                                    }`}>
                                    {newsletterStatus === 'success' && <CheckCircle size={16} />}
                                    {newsletterMessage}
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Bottom Bar */}
            <div className="border-t border-slate-800 bg-slate-950 py-8">
                <div className="w-full max-w-7xl mx-auto px-6 flex flex-col md:flex-row gap-6 items-center justify-between">
                    <p className="text-xs text-slate-500 m-0 text-center md:text-left">
                        {settings?.copyright_text || (
                            <>
                                © {new Date().getFullYear()} <a href="http://edustacks.co.in/" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors font-medium">Edustacks</a>. All rights reserved.
                            </>
                        )}
                    </p>
                    <div className="flex flex-wrap gap-6 justify-center md:justify-end">
                        {[
                            { href: '/privacy-policy', label: 'Privacy Policy' },
                            { href: '/terms', label: 'Terms of Service' },
                            { href: '/delete-account', label: 'Delete Account' },
                            { href: '/shipping-policy', label: 'Shipping' },
                            { href: '/refund-policy', label: 'Refunds' },
                            ...(showContact ? [{ href: '/contact-us', label: 'Contact Us' }] : [])
                        ].map(link => (
                            <Link
                                key={link.href}
                                href={link.href}
                                className="text-xs font-medium text-slate-500 hover:text-blue-400 transition-colors"
                            >
                                {link.label}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </footer >
    );
};

export default PublicFooter;
