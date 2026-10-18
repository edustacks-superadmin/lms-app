'use client';

import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Loader2, ToggleLeft, MessageCircle, Trophy, BookOpen, Bookmark, Star, Users, FileText, Video, HelpCircle, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../../context/ToastContext';

export default function FeatureFlagsPage() {
    const router = useRouter();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    const [flags, setFlags] = useState({
        aiChatEnabled: true,
        leaderboardEnabled: true,
        hideLeaderboardNames: false,
        examModeEnabled: true,
        bookmarksEnabled: true,
        studentAnalyticsEnabled: true,
        postsEnabled: true,
        courseReviewsEnabled: true,
        discussionForumEnabled: true,
        liveClassesEnabled: true,
        dailyStreaksEnabled: true,
        achievementBadgesEnabled: true,
        referralProgramEnabled: true,
        // Public Pages
        aboutUsEnabled: true,
        contactUsEnabled: true,
        galleryEnabled: true,
        resourcesEnabled: true,
        careersEnabled: true,
        instructorsEnabled: true,
        faqEnabled: true
    });

    useEffect(() => {
        const fetchFlags = async () => {
            setLoading(true);
            try {
                const res = await fetch('/api/admin/settings/feature-flags');
                const data = await res.json();
                if (data.featureFlags && Object.keys(data.featureFlags).length > 0) {
                    setFlags(prev => ({ ...prev, ...data.featureFlags }));
                }
            } catch (error) {
                console.error('Error loading feature flags:', error);
                showToast('Failed to load feature flags', 'error');
            } finally {
                setLoading(false);
            }
        };
        fetchFlags();
    }, []);

    const handleSave = async (updatedFlags) => {
        setSaving(true);
        try {
            const res = await fetch('/api/admin/settings/feature-flags', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ featureFlags: updatedFlags })
            });
            if (!res.ok) throw new Error('Failed to save');
            showToast('Feature flag updated successfully!', 'success');
        } catch (error) {
            showToast('Error saving feature flags: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggle = async (name) => {
        const updatedFlags = { ...flags, [name]: !flags[name] };
        setFlags(updatedFlags);
        // Auto-save on toggle
        await handleSave(updatedFlags);
    };

    const featureGroups = [
        {
            title: '🎯 Core Features',
            description: 'Essential features that define your platform experience',
            features: [
                { key: 'aiChatEnabled', icon: MessageCircle, label: 'AI Chat Assistant', description: 'Gemini-powered chat for student queries' },
                { key: 'leaderboardEnabled', icon: Trophy, label: 'Leaderboard & Rankings', description: 'Show student rankings and scores' },
                { key: 'hideLeaderboardNames', icon: Users, label: 'Hide Leaderboard Names', description: 'Show "Student [ID]" instead of real names' },
                { key: 'examModeEnabled', icon: BookOpen, label: 'Exam Mode', description: 'Enable practice exams and assessments' },
                { key: 'bookmarksEnabled', icon: Bookmark, label: 'Bookmarks', description: 'Allow users to save content for later' },
                { key: 'studentAnalyticsEnabled', icon: Star, label: 'Student Analytics', description: 'Performance analytics dashboard for students' }
            ]
        },
        {
            title: '📚 Content Features',
            description: 'Features related to content delivery and engagement',
            features: [
                { key: 'postsEnabled', icon: FileText, label: 'Blog Posts', description: 'Public blog/article section' },
                { key: 'courseReviewsEnabled', icon: Star, label: 'Course Reviews', description: 'Allow students to rate and review courses' },
                { key: 'discussionForumEnabled', icon: Users, label: 'Discussion Forum', description: 'Community discussion boards' },
                { key: 'liveClassesEnabled', icon: Video, label: 'Live Classes', description: 'Zoom/Meet integration for live sessions' }
            ]
        },
        {
            title: '🏆 Engagement Features',
            description: 'Gamification and engagement tools',
            features: [
                { key: 'dailyStreaksEnabled', icon: Star, label: 'Daily Streaks', description: 'Track consecutive learning days' },
                { key: 'achievementBadgesEnabled', icon: Trophy, label: 'Achievement Badges', description: 'Award badges for milestones' },
                { key: 'referralProgramEnabled', icon: Users, label: 'Referral Program', description: 'Refer friends and earn rewards' }
            ]
        },
        {
            title: '🌐 Public Pages',
            description: 'Control visibility of public-facing pages',
            features: [
                { key: 'aboutUsEnabled', icon: FileText, label: 'About Us', description: 'Show About Us page link' },
                { key: 'contactUsEnabled', icon: MessageCircle, label: 'Contact Us', description: 'Show Contact Us page link' },
                { key: 'galleryEnabled', icon: ImageIcon, label: 'Gallery', description: 'Show Photos & Videos gallery' },
                { key: 'resourcesEnabled', icon: BookOpen, label: 'Free Resources', description: 'Show Free Resources section' },
                { key: 'careersEnabled', icon: Users, label: 'Careers', description: 'Show Careers/Jobs page' },
                { key: 'instructorsEnabled', icon: Users, label: 'Instructors', description: 'Show Instructors/Team page' },
                { key: 'faqEnabled', icon: HelpCircle, label: 'FAQ', description: 'Show Frequently Asked Questions' }
            ]
        }
    ];

    const enabledCount = Object.values(flags).filter(Boolean).length;
    const totalCount = Object.keys(flags).length;

    return (
        <div className="p-8 max-w-[900px] mx-auto">
            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-500 bg-transparent border-none cursor-pointer mb-6 hover:text-gray-700">
                <ArrowLeft size={16} /> Back
            </button>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                        <ToggleLeft size={28} />
                        Feature Flags
                    </h1>
                    <p className="text-gray-500 mt-2">
                        Enable or disable features across all platforms (Web, Mobile, Desktop)
                    </p>
                </div>
                <div className="flex items-center gap-4">
                    <div className="bg-green-50 border border-green-200 py-2 px-4 rounded-full text-sm text-green-800 font-medium">
                        {enabledCount} / {totalCount} enabled
                    </div>
                </div>
            </div>

            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                <HelpCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="font-semibold text-blue-800 mb-1">Universal Feature Flags</h4>
                    <p className="text-sm text-blue-600 leading-relaxed">
                        These settings apply to <strong>all platforms</strong> (Web, Android, iOS, Desktop).
                        For mobile-specific settings like Dark Mode or Offline Mode, go to <a href="/settings/mobile-app/android" className="underline">Mobile App Settings</a>.
                    </p>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-16 text-gray-400">
                    <Loader2 size={32} className="animate-spin mx-auto mb-4" />
                    Loading feature flags...
                </div>
            ) : (
                featureGroups.map((group, groupIndex) => (
                    <div key={groupIndex} className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
                        <div className="p-5 border-b border-gray-100">
                            <h2 className="text-lg font-semibold text-gray-900">{group.title}</h2>
                            <p className="text-sm text-gray-500 mt-1">{group.description}</p>
                        </div>
                        <div>
                            {group.features.map((feature, index) => (
                                <FeatureRow
                                    key={feature.key}
                                    icon={feature.icon}
                                    label={feature.label}
                                    description={feature.description}
                                    enabled={flags[feature.key]}
                                    onToggle={() => handleToggle(feature.key)}
                                    disabled={saving}
                                    isLast={index === group.features.length - 1}
                                />
                            ))}
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

const FeatureRow = ({ icon: Icon, label, description, enabled, onToggle, isLast, disabled }) => (
    <div className={`flex items-center justify-between py-4 px-5 ${isLast ? '' : 'border-b border-gray-100'} ${enabled ? 'bg-gray-50' : 'bg-white'}`}>
        <div className="flex items-center gap-3.5">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${enabled ? 'bg-green-100' : 'bg-gray-100'}`}>
                <Icon size={20} className={enabled ? 'text-green-500' : 'text-gray-400'} />
            </div>
            <div>
                <div className={`font-medium ${enabled ? 'text-gray-900' : 'text-gray-500'}`}>{label}</div>
                <div className="text-sm text-gray-400">{description}</div>
            </div>
        </div>
        <button
            onClick={onToggle}
            disabled={disabled}
            className={`w-[50px] h-7 rounded-full border-none cursor-not-allowed relative transition-colors ${enabled ? 'bg-green-500' : 'bg-gray-200'} ${disabled ? 'opacity-50' : 'cursor-pointer'}`}
        >
            <span className={`absolute w-[22px] h-[22px] rounded-full bg-white top-[3px] shadow transition-all ${enabled ? 'left-[25px]' : 'left-[3px]'}`} />
        </button>
    </div>
);
