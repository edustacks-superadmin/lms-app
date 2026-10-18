'use client';

import React from 'react';
import { useInstitute } from '../context/InstituteContext';
import { Youtube, Send, Globe, MessageCircle, Radio } from 'lucide-react';

const FloatingSocials = () => {
    const { institute } = useInstitute();

    if (!institute) return null;

    const socialLinks = [
        { icon: Youtube, url: institute.youtube_url, label: 'YouTube', color: 'bg-[#FF0000] hover:bg-red-700' },
        { icon: Send, url: institute.telegram_url, label: 'Telegram', color: 'bg-[#0088cc] hover:bg-sky-600' },
        { icon: Globe, url: institute.website || institute.blogger_url, label: 'Website', color: 'bg-blue-600 hover:bg-blue-700' },
        { icon: MessageCircle, url: institute.whatsapp_url, label: 'WhatsApp', color: 'bg-[#25D366] hover:bg-green-600' },
        { icon: Radio, url: institute.arattai_url, label: 'Arattai', color: 'bg-[#ff6600] hover:bg-orange-600' }
    ].filter(link => link.url);

    if (socialLinks.length === 0) return null;

    return (
        <div className="fixed right-0 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 p-2">
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
                        text-white shadow-lg 
                        transition-all duration-300 transform hover:scale-110 hover:-translate-x-1
                        ${color}
                    `}
                >
                    <Icon size={20} />
                </a>
            ))}
        </div>
    );
};

export default FloatingSocials;
