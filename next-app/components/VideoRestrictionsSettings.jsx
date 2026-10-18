'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function VideoRestrictionsSettings({ courseId }) {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [maxVideoViews, setMaxVideoViews] = useState('');
    const [watchTimeMultiplier, setWatchTimeMultiplier] = useState('');

    useEffect(() => {
        fetchSettings();
    }, [courseId]);

    const fetchSettings = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/admin/courses/${courseId}/video-restrictions`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (response.ok) {
                const data = await response.json();
                setMaxVideoViews(data.max_video_views || '');
                setWatchTimeMultiplier(data.watch_time_multiplier || '');
            }
        } catch (error) {
            console.error('Error fetching video restrictions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch(`/api/admin/courses/${courseId}/video-restrictions`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    maxVideoViews: maxVideoViews === '' ? null : parseInt(maxVideoViews),
                    watchTimeMultiplier: watchTimeMultiplier === '' ? null : parseFloat(watchTimeMultiplier)
                })
            });

            if (response.ok) {
                alert('Video restrictions updated successfully!');
            } else {
                const error = await response.json();
                alert('Error: ' + error.error);
            }
        } catch (error) {
            console.error('Error saving video restrictions:', error);
            alert('Failed to save restrictions');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="animate-pulse bg-gray-100 h-32 rounded-lg"></div>;
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Settings className="text-blue-600" size={20} />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-800">Video Restrictions</h3>
                    <p className="text-sm text-gray-500">
                        Restrict video watching based on views and duration. If both views and duration restrictions are enabled,
                        the video will be blocked if anyone of the limit is exhausted.
                    </p>
                </div>
            </div>

            <div className="space-y-6">
                {/* View Limit */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Set the number of times a student can watch a video
                    </label>
                    <input
                        type="number"
                        value={maxVideoViews}
                        onChange={(e) => setMaxVideoViews(e.target.value)}
                        placeholder="Leave blank for unlimited views"
                        className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                    />
                    <p className="text-xs text-gray-500 mt-1">Leave blank for unlimited views</p>
                </div>

                {/* Watch Time Multiplier */}
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Limit video based on watch minutes w.r.t course's total watch minutes
                    </label>
                    <select
                        value={watchTimeMultiplier}
                        onChange={(e) => setWatchTimeMultiplier(e.target.value)}
                        className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                        <option value="">Unlimited</option>
                        <option value="0.2">20% of the total watch minutes</option>
                        <option value="0.5">50% of the total watch minutes</option>
                        <option value="0.75">75% of the total watch minutes</option>
                        <option value="1">1 times the total watch minutes</option>
                        <option value="2">2 times the total watch minutes</option>
                        <option value="3">3 times the total watch minutes</option>
                        <option value="4">4 times the total watch minutes</option>
                        <option value="5">5 times the total watch minutes</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        E.g. Let's assume you have 10 videos in the course that amount to total 60 minutes of watch time.
                        If you select 2, users will be able to watch 120 minutes of video in the course.
                    </p>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-gray-200">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Save size={18} />
                        {saving ? 'Saving...' : 'Update Restrictions'}
                    </button>
                </div>
            </div>
        </div>
    );
}
