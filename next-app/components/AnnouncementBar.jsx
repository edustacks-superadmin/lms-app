'use client';

import React, { useState, useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import { useHomeSettings } from '../context/HomeSettingsContext';

const AnnouncementBar = () => {
    const { settings } = useHomeSettings();
    const [dismissed, setDismissed] = useState(false);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Check if user has dismissed this announcement before
        const dismissedKey = `announcement_dismissed_${settings?.id}`;
        const wasDismissed = sessionStorage.getItem(dismissedKey);

        if (!wasDismissed && settings?.announcement_bar_enabled && settings?.announcement_bar_text) {
            setIsVisible(true);
        }
    }, [settings]);

    const handleDismiss = () => {
        const dismissedKey = `announcement_dismissed_${settings?.id}`;
        sessionStorage.setItem(dismissedKey, 'true');
        setDismissed(true);
        setTimeout(() => setIsVisible(false), 300);
    };

    if (!isVisible || !settings?.announcement_bar_enabled || !settings?.announcement_bar_text) {
        return null;
    }

    const bgColor = settings.announcement_bar_bg_color || '#3b82f6';
    const textColor = settings.announcement_bar_text_color || '#ffffff';
    const linkUrl = settings.announcement_bar_link;

    return (
        <div
            className={`relative transition-all duration-300 ${dismissed ? 'opacity-0 -translate-y-full' : 'opacity-100'}`}
            style={{ backgroundColor: bgColor, color: textColor }}
        >
            <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center justify-center gap-4">
                <p className="text-sm font-medium text-center flex-1">
                    {settings.announcement_bar_text}
                    {linkUrl && (
                        <Link
                            href={linkUrl}
                            className="inline-flex items-center gap-1 ml-2 underline underline-offset-2 hover:opacity-80 transition-opacity"
                            style={{ color: textColor }}
                        >
                            Learn more <ExternalLink size={14} />
                        </Link>
                    )}
                </p>
                <button
                    onClick={handleDismiss}
                    className="p-1 rounded hover:bg-white/20 transition-colors shrink-0"
                    aria-label="Dismiss announcement"
                    style={{ color: textColor }}
                >
                    <X size={18} />
                </button>
            </div>
        </div>
    );
};

export default AnnouncementBar;
