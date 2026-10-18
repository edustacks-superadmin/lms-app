'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Smartphone, Monitor, ChevronRight, Apple } from 'lucide-react';

export default function MobileAppSettingsPage() {
    const router = useRouter();

    const sections = [
        {
            title: 'Android App',
            description: 'Configure your Android mobile application settings, styling, and feature toggles.',
            icon: Smartphone,
            color: '#10b981', // Emerald 500
            path: '/settings/mobile-app/android'
        },
        {
            title: 'iOS App',
            description: 'Configure your iOS mobile application settings, Face ID, and Apple Sign In.',
            icon: Apple,
            color: '#000000', // Apple Black
            path: '/settings/mobile-app/ios'
        },
        {
            title: 'Desktop App',
            description: 'Manage Windows and MacOS installer links and deep linking configurations.',
            icon: Monitor,
            color: '#3b82f6', // Blue 500
            path: '/settings/mobile-app/desktop'
        }
    ];

    return (
        <div style={{ padding: '24px', maxWidth: '800px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px', color: '#111827' }}>
                Mobile & Desktop App Configuration
            </h1>
            <p style={{ color: '#6b7280', marginBottom: '32px' }}>
                Manage the appearance, assets, and settings for your native applications.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
                {sections.map((section) => (
                    <div
                        key={section.title}
                        onClick={() => router.push(section.path)}
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            border: '1px solid #e5e7eb',
                            padding: '24px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'start',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-2px)';
                            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.05)';
                            e.currentTarget.style.borderColor = section.color;
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)';
                            e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                    >
                        <div style={{
                            padding: '12px',
                            borderRadius: '10px',
                            backgroundColor: `${section.color}15`, // Digits opacity
                            color: section.color,
                            marginBottom: '16px'
                        }}>
                            <section.icon size={32} />
                        </div>

                        <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '8px', color: '#1f2937' }}>
                            {section.title}
                        </h3>

                        <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5', marginBottom: '24px', flex: 1 }}>
                            {section.description}
                        </p>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            color: section.color,
                            fontWeight: '500',
                            fontSize: '14px',
                            marginTop: 'auto'
                        }}>
                            Configure <ChevronRight size={16} style={{ marginLeft: '4px' }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
