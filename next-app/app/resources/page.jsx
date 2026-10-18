'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useInstitute } from '../../context/InstituteContext';
import { useSearchParams, useRouter } from 'next/navigation';
import ResourceTabs from '../../components/ResourceTabs';
import ResourceList from '../../components/ResourceList';
import { Search, Loader2 } from 'lucide-react';

function ResourcesContent() {
    const { institute } = useInstitute();
    const searchParams = useSearchParams();
    const router = useRouter();

    const [resources, setResources] = useState([]);
    const [settings, setSettings] = useState({});
    const [loading, setLoading] = useState(true);
    const [settingsLoading, setSettingsLoading] = useState(true);

    // Feature Flag Check
    useEffect(() => {
        if (institute && institute.feature_flags?.resourcesEnabled === false) {
            router.push('/');
        }
    }, [institute, router]);

    // Params
    const category = searchParams.get('category') || 'Syllabus';
    const search = searchParams.get('search') || '';
    const [searchTerm, setSearchTerm] = useState(search);

    // Debounce search update
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            const params = new URLSearchParams(searchParams);
            if (searchTerm) params.set('search', searchTerm);
            else params.delete('search');

            // Only push if changed
            if (searchTerm !== search) {
                router.push(`/resources?${params.toString()}`);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Fetch Settings (Labels)
    useEffect(() => {
        if (institute?.id) {
            fetchSettings();
        }
    }, [institute?.id]);

    const fetchSettings = async () => {
        try {
            setSettingsLoading(true);
            const res = await fetch(`/api/admin/resources/settings?institute_id=${institute.id}`);
            const data = await res.json();
            if (data && !data.error) {
                setSettings(data);
            }
        } catch (error) {
            console.error('Error fetching settings:', error);
        } finally {
            setSettingsLoading(false);
        }
    };

    // Fetch Resources
    useEffect(() => {
        if (institute?.id) {
            fetchResources();
        }
    }, [institute?.id, category, search]); // fetch when URL params or institute changes

    const fetchResources = async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                institute_id: institute.id,
                category: category,
                ...(search && { search })
            });

            const res = await fetch(`/api/resources?${params}`);
            const data = await res.json();

            if (data.resources) {
                setResources(data.resources);
            } else {
                setResources([]);
            }
        } catch (error) {
            console.error('Error fetching resources:', error);
        } finally {
            setLoading(false);
        }
    };


    if (!institute) { // Loading institute or error
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 pb-20">
            {/* Header / Hero */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
                <div className="w-[90%] max-w-[1600px] mx-auto px-4 md:px-0 pt-6 pb-2">
                    <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
                        {settings.label_resource_page_title || 'Free Resources'}
                    </h1>
                    <p className="text-slate-500 text-sm md:text-base mb-6">
                        Access study materials, papers, and important updates.
                    </p>

                    {/* Search Bar */}
                    <div className="relative max-w-lg mb-4">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Search size={18} />
                        </div>
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder={`Search in ${category}...`}
                            className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        />
                    </div>
                </div>

                {/* Tabs */}
                <div className="w-[90%] max-w-[1600px] mx-auto">
                    <ResourceTabs labels={settings} />
                </div>
            </div>

            {/* Content List */}
            <div className="w-[90%] max-w-[1600px] mx-auto px-4 md:px-0 py-6">
                <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden min-h-[400px]">
                    <ResourceList resources={resources} loading={loading} category={category} />
                </div>
            </div>
        </div>
    );
}

export default function ResourcesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="animate-spin text-blue-600" size={32} />
            </div>
        }>
            <ResourcesContent />
        </Suspense>
    );
}
