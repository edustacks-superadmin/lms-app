import React from 'react';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';
import { Facebook, Instagram, Linkedin, Youtube, Mail, Phone, MapPin, Send, Globe, MessageCircle, Radio } from 'lucide-react';

const PublicFooter = () => {
    const { settings } = useHomeSettings(); // For copyright, privacy, terms
    const { institute } = useInstitute(); // For contact, social, about

    const socialLinks = [
        { icon: Facebook, url: institute?.facebook_url, label: 'Facebook' },
        { icon: Instagram, url: institute?.instagram_url, label: 'Instagram' },
        { icon: Linkedin, url: institute?.linkedin_url, label: 'LinkedIn' },
        { icon: Youtube, url: institute?.youtube_url, label: 'YouTube' },
        { icon: Send, url: institute?.telegram_url, label: 'Telegram' },
        { icon: Globe, url: institute?.blogger_url, label: 'Blogger' },
        { icon: MessageCircle, url: institute?.whatsapp_url, label: 'WhatsApp' },
        { icon: Radio, url: institute?.arattai_url, label: 'Arattai' }
    ].filter(link => link.url);

    return (
        <footer style={{
            backgroundColor: '#1f2937',
            color: 'white',
            marginTop: 'auto'
        }}>
            {/* Main Footer Content */}
            <div style={{
                maxWidth: '1200px',
                margin: '0 auto',
                padding: '48px 20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '40px'
            }}>
                {/* About Column */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        color: 'white'
                    }}>
                        About Us
                    </h3>
                    <p style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#d1d5db',
                        marginBottom: '12px'
                    }}>
                        {institute?.description || (institute?.name ? `${institute.name} is dedicated to providing quality education and training to help students achieve their goals.` : '')}
                    </p>
                    {institute?.mission_text && (
                        <p style={{
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: '#d1d5db',
                            fontStyle: 'italic'
                        }}>
                            {institute.mission_text}
                        </p>
                    )}
                </div>

                {/* Quick Links Column */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        color: 'white'
                    }}>
                        Quick Links
                    </h3>
                    <ul style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0
                    }}>
                        <li style={{ marginBottom: '10px' }}>
                            <a href="/home" style={{
                                color: '#d1d5db',
                                textDecoration: 'none',
                                fontSize: '14px',
                                ':hover': { color: 'white' }
                            }}>
                                Home
                            </a>
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <a href="/home#products" style={{
                                color: '#d1d5db',
                                textDecoration: 'none',
                                fontSize: '14px'
                            }}>
                                Courses
                            </a>
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <a href="/login" style={{
                                color: '#d1d5db',
                                textDecoration: 'none',
                                fontSize: '14px'
                            }}>
                                Student Login
                            </a>
                        </li>
                        <li style={{ marginBottom: '10px' }}>
                            <a href="/student/signup" style={{
                                color: '#d1d5db',
                                textDecoration: 'none',
                                fontSize: '14px'
                            }}>
                                Sign Up
                            </a>
                        </li>
                    </ul>
                </div>

                {/* Contact Column */}
                <div>
                    <h3 style={{
                        fontSize: '18px',
                        fontWeight: '600',
                        marginBottom: '16px',
                        color: 'white'
                    }}>
                        Contact Us
                    </h3>
                    <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {institute?.address && (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                                <MapPin size={18} style={{ color: '#9ca3af', flexShrink: 0, marginTop: '2px' }} />
                                <span style={{
                                    fontSize: '14px',
                                    color: '#d1d5db',
                                    lineHeight: '1.6'
                                }}>
                                    {institute.address}
                                </span>
                            </div>
                        )}
                        {institute?.phone && (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Phone size={18} style={{ color: '#9ca3af' }} />
                                <a href={`tel:${institute.phone}`} style={{
                                    fontSize: '14px',
                                    color: '#d1d5db',
                                    textDecoration: 'none'
                                }}>
                                    {institute.phone}
                                </a>
                            </div>
                        )}
                        {institute?.email && (
                            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <Mail size={18} style={{ color: '#9ca3af' }} />
                                <a href={`mailto:${institute.email}`} style={{
                                    fontSize: '14px',
                                    color: '#d1d5db',
                                    textDecoration: 'none'
                                }}>
                                    {institute.email}
                                </a>
                            </div>
                        )}

                        {/* Social Media Icons */}
                        {socialLinks.length > 0 && (
                            <div style={{
                                display: 'flex',
                                gap: '12px',
                                marginTop: '12px'
                            }}>
                                {socialLinks.map(({ icon: Icon, url, label }) => (
                                    <a
                                        key={label}
                                        href={url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={label}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: '36px',
                                            height: '36px',
                                            borderRadius: '50%',
                                            backgroundColor: '#374151',
                                            color: '#d1d5db',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.backgroundColor = 'var(--primary-color)';
                                            e.currentTarget.style.color = 'white';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.backgroundColor = '#374151';
                                            e.currentTarget.style.color = '#d1d5db';
                                        }}
                                    >
                                        <Icon size={18} />
                                    </a>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div style={{
                borderTop: '1px solid #374151',
                padding: '20px',
                textAlign: 'center'
            }}>
                <div style={{
                    maxWidth: '1200px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    alignItems: 'center'
                }}>
                    <p style={{
                        fontSize: '14px',
                        color: '#9ca3af',
                        margin: 0
                    }}>
                        {settings?.copyright_text || `© ${new Date().getFullYear()} ${institute?.name || ''}. All rights reserved.`}
                    </p>
                    <div style={{
                        display: 'flex',
                        gap: '16px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                    }}>
                        <a href="/privacy-policy" style={{
                            fontSize: '14px',
                            color: '#9ca3af',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                            Privacy Policy
                        </a>
                        <a href="/terms-and-conditions" style={{
                            fontSize: '14px',
                            color: '#9ca3af',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                            Terms & Conditions
                        </a>
                        <a href="/shipping-policy" style={{
                            fontSize: '14px',
                            color: '#9ca3af',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                            Shipping Policy
                        </a>
                        <a href="/refund-policy" style={{
                            fontSize: '14px',
                            color: '#9ca3af',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                            Refund Policy
                        </a>
                        <a href="/contact-us" style={{
                            fontSize: '14px',
                            color: '#9ca3af',
                            textDecoration: 'none',
                            transition: 'color 0.2s'
                        }}
                            onMouseOver={(e) => e.currentTarget.style.color = 'white'}
                            onMouseOut={(e) => e.currentTarget.style.color = '#9ca3af'}
                        >
                            Contact Us
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default PublicFooter;
