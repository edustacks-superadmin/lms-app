import React from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const ContactUs = () => {
    return (
        <div style={{ maxWidth: '1000px', margin: '10px auto', padding: '0 20 px', fontFamily: 'Inter, sans-serif' }}>
            <h1 style={{ fontSize: '32px', marginBottom: '10px', color: '#1a1a1a' }}>Contact Us</h1>
            <p style={{ color: '#666', marginBottom: '20px', lineHeight: '1.8' }}>
                Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                <div style={{ padding: '30px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <Mail size={24} color="#3399cc" />
                        <h3 style={{ fontSize: '18px', margin: 0, color: '#333' }}>Email</h3>
                    </div>
                    <p style={{ color: '#555', lineHeight: '1.6', margin: 0, wordBreak: 'break-word', overflowWrap: 'break-word' }}>
                        maheshiesacademy@gmail.com
                    </p>
                </div>

                <div style={{ padding: '30px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <Phone size={24} color="#3399cc" />
                        <h3 style={{ fontSize: '18px', margin: 0, color: '#333' }}>Phone</h3>
                    </div>
                    <p style={{ color: '#555', lineHeight: '1.6', margin: 0 }}>
                        +91 7658951142<br />
                        Mon-Fri: 9:00 AM - 6:00 PM IST
                    </p>
                </div>

                <div style={{ padding: '30px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '15px' }}>
                        <MapPin size={24} color="#3399cc" />
                        <h3 style={{ fontSize: '18px', margin: 0, color: '#333' }}>Address</h3>
                    </div>
                    <p style={{ color: '#555', lineHeight: '1.6', margin: 0 }}>
                        Mahesh IES Academy<br />
                        Chennai, Tamil Nadu<br />
                        India
                    </p>
                </div>
            </div>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>Business Hours</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    Monday - Friday: 9:00 AM - 6:00 PM IST<br />
                    Saturday: 10:00 AM - 4:00 PM IST<br />
                    Sunday: Closed
                </p>
            </section>

            <section style={{ marginBottom: '30px' }}>
                <h2 style={{ fontSize: '24px', marginBottom: '15px', color: '#333' }}>Support</h2>
                <p style={{ lineHeight: '1.8', color: '#555' }}>
                    For technical support or course-related queries, please email us at maheshiesacademy@gmail.com
                    with your query details, and our team will get back to you within 24-48 hours.
                </p>
            </section>
        </div>
    );
};

export default ContactUs;
