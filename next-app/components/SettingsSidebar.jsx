'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
    Home, User, Shield, Building, CreditCard, DollarSign, Users, List,
    Image, Quote, MessageSquare, BarChart2, Tag, Globe, Download,
    Activity, Smartphone, Mail, Settings, Bell
} from 'lucide-react';

// NavLink Component
const NavLink = ({ to, children, icon: Icon }) => {
    const router = useRouter();
    const pathname = usePathname();
    const isActive = pathname === to;

    return (
        <a
            href={to}
            onClick={(e) => {
                e.preventDefault();
                router.push(to);
            }}
            className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200
                ${isActive
                    ? 'bg-blue-50 text-blue-700 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}
            `}
        >
            <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'} />
            {children}
        </a>
    );
};

const SettingsSidebar = () => {
    return (
        <aside className="w-64 border-r border-slate-200 bg-white h-full overflow-y-auto hidden lg:block scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            <div className="p-6">
                <div className="flex items-center gap-2 mb-6 px-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
                        <Settings size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                        Settings
                    </h3>
                </div>

                <nav className="space-y-1">
                    <NavLink to="/settings/home" icon={Home}>Home Page</NavLink>
                    <NavLink to="/settings/profile" icon={User}>Profile</NavLink>
                    <NavLink to="/settings/institute" icon={Building}>Institute</NavLink>

                    <div className="py-4 px-3">
                        <div className="h-px bg-slate-100"></div>
                    </div>

                    <NavLink to="/settings/subscription" icon={CreditCard}>Subscription</NavLink>
                    <NavLink to="/settings/sales" icon={DollarSign}>Sales</NavLink>
                    <NavLink to="/admin/marketing/influencers" icon={Users}>Influencers</NavLink>

                    <div className="py-4 px-3">
                        <div className="h-px bg-slate-100"></div>
                    </div>

                    <NavLink to="/settings/custom-fields" icon={List}>Custom Fields</NavLink>
                    <NavLink to="/settings/banner-ads" icon={Image}>Banner Ads</NavLink>
                    <NavLink to="/settings/quotes" icon={Quote}>Daily Quotes</NavLink>
                    <NavLink to="/settings/testimonials" icon={MessageSquare}>Testimonials</NavLink>
                    <NavLink to="/settings/email-templates" icon={Mail}>Email Templates</NavLink>

                    <div className="py-4 px-3">
                        <div className="h-px bg-slate-100"></div>
                    </div>

                    <NavLink to="/settings/statistics" icon={BarChart2}>Statistics</NavLink>
                    <NavLink to="/settings/user-sessions" icon={Shield}>User Sessions</NavLink>
                    <NavLink to="/settings/tags" icon={Tag}>Tags</NavLink>
                    <NavLink to="/settings/seo" icon={Globe}>SEO Settings</NavLink>
                    <NavLink to="/settings/integrations" icon={List}>App Integrations</NavLink>
                    <NavLink to="/settings/mobile-app" icon={Smartphone}>Mobile App</NavLink>
                    <NavLink to="/settings/notifications" icon={Bell}>Notifications</NavLink>

                    <div className="py-4 px-3">
                        <div className="h-px bg-slate-100"></div>
                    </div>

                    <NavLink to="/settings/import-data" icon={Download}>Import Data</NavLink>
                    <NavLink to="/settings/background-tasks" icon={Activity}>Background Tasks</NavLink>
                    <NavLink to="/settings/feature-flags" icon={List}>Feature Flags</NavLink>
                </nav>
            </div>
        </aside>
    );
};

export default SettingsSidebar;
