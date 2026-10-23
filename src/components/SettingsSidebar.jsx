import React from 'react';
import { NavLink } from 'react-router-dom';
import { User, Building, CreditCard, DollarSign, List, Image, BarChart2, Home, MessageSquare, Tag, Quote, Globe, Download, Smartphone } from 'lucide-react';

const SettingsSidebar = () => {
    const getLinkStyle = ({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '10px 15px',
        color: isActive ? 'var(--primary-color)' : 'var(--text-color)',
        backgroundColor: isActive ? 'var(--primary-light)' : 'transparent',
        borderRadius: '6px',
        textDecoration: 'none',
        fontSize: '14px',
        fontWeight: isActive ? '500' : '400',
        marginBottom: '4px',
        transition: 'all 0.2s ease'
    });

    return (
        <aside style={{ width: '250px', padding: '20px', borderRight: '1px solid var(--border-color)', height: 'calc(100vh - var(--header-height))', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--text-light)', marginBottom: '16px', fontWeight: '600', letterSpacing: '0.5px' }}>
                Settings
            </h3>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
                <NavLink to="/settings/home" style={getLinkStyle}>
                    <Home size={18} /> Home Page
                </NavLink>
                <NavLink to="/settings/profile" style={getLinkStyle}>
                    <User size={18} /> Profile
                </NavLink>
                <NavLink to="/settings/institute" style={getLinkStyle}>
                    <Building size={18} /> Institute
                </NavLink>
                <NavLink to="/settings/subscription" style={getLinkStyle}>
                    <CreditCard size={18} /> Subscription
                </NavLink>
                <NavLink to="/settings/sales" style={getLinkStyle}>
                    <DollarSign size={18} /> Sales
                </NavLink>
                <NavLink to="/settings/custom-fields" style={getLinkStyle}>
                    <List size={18} /> Custom Fields
                </NavLink>
                <NavLink to="/settings/banner-ads" style={getLinkStyle}>
                    <Image size={18} /> Banner Ads
                </NavLink>
                <NavLink to="/settings/quotes" style={getLinkStyle}>
                    <Quote size={18} /> Daily Quotes
                </NavLink>
                <NavLink to="/settings/testimonials" style={getLinkStyle}>
                    <MessageSquare size={18} /> Testimonials
                </NavLink>
                <NavLink to="/settings/statistics" style={getLinkStyle}>
                    <BarChart2 size={18} /> Statistics
                </NavLink>
                <NavLink to="/settings/tags" style={getLinkStyle}>
                    <Tag size={18} /> Tags
                </NavLink>
                <NavLink to="/settings/seo" style={getLinkStyle}>
                    <Globe size={18} /> SEO Settings
                </NavLink>
                <NavLink to="/settings/integrations" style={getLinkStyle}>
                    <List size={18} /> App Integrations
                </NavLink>
                <NavLink to="/settings/mobile-app" style={getLinkStyle}>
                    <Smartphone size={18} /> Mobile App & Security
                </NavLink>
                <NavLink to="/settings/import-data" style={getLinkStyle}>
                    <Download size={18} /> Import Data
                </NavLink>
            </nav>
        </aside>
    );
};

export default SettingsSidebar;
