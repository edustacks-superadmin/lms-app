'use client';

import React from 'react';
import { Facebook, Instagram, Linkedin, Youtube, Send, Globe, MessageCircle, Radio } from 'lucide-react';

const PublicPostFollow = ({ settings }) => {
    if (!settings) return null;

    const socialLinks = [
        { icon: Facebook, url: settings.facebook_url, label: 'Facebook', color: 'hover:text-blue-600' },
        { icon: Instagram, url: settings.instagram_url, label: 'Instagram', color: 'hover:text-pink-600' },
        { icon: Linkedin, url: settings.linkedin_url, label: 'LinkedIn', color: 'hover:text-blue-700' },
        { icon: Youtube, url: settings.youtube_url, label: 'YouTube', color: 'hover:text-red-600' },
        { icon: Send, url: settings.telegram_url, label: 'Telegram', color: 'hover:text-blue-500' },
        { icon: Globe, url: settings.blogger_url, label: 'Blogger', color: 'hover:text-orange-500' },
        { icon: MessageCircle, url: settings.whatsapp_url, label: 'WhatsApp', color: 'hover:text-green-500' },
        { icon: Radio, url: settings.arattai_url, label: 'Arattai', color: 'hover:text-indigo-500' }
    ].filter(link => link.url);

    if (socialLinks.length === 0) return null;

    return (
        <div className="flex items-center gap-3 ml-4 border-l border-gray-200 pl-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                Follow us:
            </span>
            <div className="flex items-center gap-2">
                {socialLinks.map(({ icon: Icon, url, label, color }) => (
                    <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-gray-400 transition-all duration-200 hover:scale-110 ${color}`}
                        title={`Follow us on ${label}`}
                    >
                        <Icon size={16} />
                    </a>
                ))}
            </div>
        </div>
    );
};

export default PublicPostFollow;
