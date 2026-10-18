'use client';

import React, { useEffect, useState } from 'react';
import { Book, Users, Archive, CheckCircle, Activity } from 'lucide-react';
import { useInstitute } from '../context/InstituteContext';

const StatCard = ({ title, value, icon: Icon, color, loading, subtitle }) => (
    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group hover:shadow-md transition-all duration-300">
        <div className="flex-1">
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-1.5">{title}</p>
            {loading ? (
                <div className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse" />
            ) : (
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">{value}</h3>
                    {subtitle && <span className="text-[10px] font-bold text-slate-400 uppercase">{subtitle}</span>}
                </div>
            )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 duration-300 ${color}`}>
            <Icon size={24} strokeWidth={2.5} />
        </div>
    </div>
);

const CourseStats = () => {
    const { institute } = useInstitute();
    const [stats, setStats] = useState({
        totalCourses: 0,
        activeCourses: 0,
        archivedCourses: 0,
        totalLearners: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            if (!institute?.id) return;

            try {
                const response = await fetch(`/api/admin/courses/stats?institute_id=${institute.id}`);
                if (response.ok) {
                    const data = await response.json();
                    setStats(data);
                }
            } catch (error) {
                console.error('Error fetching course stats:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [institute?.id]);

    if (!institute) return null;

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
                title="Total Courses"
                value={stats.totalCourses}
                icon={Book}
                color="bg-blue-50 text-blue-600"
                loading={loading}
                subtitle="Items"
            />
            <StatCard
                title="Active Now"
                value={stats.activeCourses}
                icon={CheckCircle}
                color="bg-emerald-50 text-emerald-600"
                loading={loading}
                subtitle="Live"
            />
            <StatCard
                title="Community"
                value={stats.totalLearners}
                icon={Users}
                color="bg-violet-50 text-violet-600"
                loading={loading}
                subtitle="Students"
            />
            <StatCard
                title="Archived"
                value={stats.archivedCourses}
                icon={Archive}
                color="bg-slate-50 text-slate-400"
                loading={loading}
                subtitle="Stored"
            />
        </div>
    );
};

export default CourseStats;
