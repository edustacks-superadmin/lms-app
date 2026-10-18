'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Share2, Copy, Mail, Facebook, Twitter, Linkedin, Send, MessageCircle, X } from 'lucide-react';

const PublicPostShare = ({ title }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const menuRef = useRef(null);
    const [url, setUrl] = useState('');

    useEffect(() => {
        setUrl(window.location.href);

        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const shareOptions = [
        {
            name: 'Copy link',
            icon: <Copy size={18} />,
            color: 'text-gray-600',
            action: () => {
                navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }
        },
        {
            name: 'WhatsApp',
            icon: <MessageCircle size={18} />,
            color: 'text-green-500',
            url: `https://api.whatsapp.com/send?text=${encodeURIComponent(title + ' ' + url)}`
        },
        {
            name: 'Telegram',
            icon: <Send size={18} />,
            color: 'text-blue-500',
            url: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
        },
        {
            name: 'Facebook',
            icon: <Facebook size={18} />,
            color: 'text-blue-600',
            url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
        },
        {
            name: 'Twitter',
            icon: <Twitter size={18} />,
            color: 'text-sky-500',
            url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`
        },
        {
            name: 'LinkedIn',
            icon: <Linkedin size={18} />,
            color: 'text-blue-700',
            url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`
        },
        {
            name: 'Email',
            icon: <Mail size={18} />,
            color: 'text-red-500',
            url: `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`
        },
    ];

    const toggleMenu = (e) => {
        e.preventDefault();
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative inline-block" ref={menuRef}>
            <button
                onClick={toggleMenu}
                className="flex items-center justify-center p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-blue-600"
                title="Share this post"
            >
                <Share2 size={18} />
            </button>

            {isOpen && (
                <div className="absolute left-0 sm:left-auto sm:right-0 mt-3 w-64 bg-white/95 backdrop-blur-sm rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-3 z-[100] animate-in fade-in zoom-in duration-200 origin-top-left sm:origin-top-right">
                    <div className="px-5 py-2 border-b border-gray-50 flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-gray-400 uppercase tracking-[0.1em]">Share this Article</span>
                        <button onClick={() => setIsOpen(false)} className="text-gray-300 hover:text-gray-500">
                            <X size={14} />
                        </button>
                    </div>
                    {shareOptions.map((option) => (
                        <div key={option.name}>
                            {option.url ? (
                                <a
                                    href={option.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 group"
                                    onClick={() => setIsOpen(false)}
                                >
                                    <span className={`${option.color} group-hover:scale-110 transition-transform`}>
                                        {option.icon}
                                    </span>
                                    {option.name}
                                </a>
                            ) : (
                                <button
                                    onClick={() => {
                                        option.action();
                                        if (option.name !== 'Copy link') setIsOpen(false);
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 group text-left"
                                >
                                    <span className={`${option.color} group-hover:scale-110 transition-transform`}>
                                        {option.icon}
                                    </span>
                                    <div className="flex-1">
                                        {option.name}
                                        {copied && option.name === 'Copy link' && (
                                            <span className="ml-2 text-[10px] text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Copied!</span>
                                        )}
                                    </div>
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PublicPostShare;
