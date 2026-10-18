'use client';

import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Laptop, CheckCircle2, Info } from 'lucide-react';

const PLATFORMS = [
    { id: 'web', name: 'Web Browser', icon: Monitor, description: 'Desktop/Laptop browsers' },
    { id: 'mobile', name: 'Mobile App', icon: Smartphone, description: 'Android & iOS apps' },
    { id: 'desktop', name: 'Desktop App', icon: Laptop, description: 'Windows/Mac applications' }
];

/**
 * Platform Selector Component
 * 
 * Multi-select checkbox interface for choosing which platforms
 * can access a course/content.
 * 
 * @param {Array<string>} value - Currently selected platforms
 * @param {Function} onChange - Callback when selection changes
 */
export default function PlatformSelector({ value = ['web', 'mobile', 'desktop'], onChange }) {
    const [selectedPlatforms, setSelectedPlatforms] = useState(value);

    // Sync state with prop when data fetches from DB
    useEffect(() => {
        if (value) {
            setSelectedPlatforms(value);
        }
    }, [value]);

    const handleToggle = (platformId) => {
        let newSelection;

        if (selectedPlatforms.includes(platformId)) {
            // Remove platform (but keep at least one selected)
            newSelection = selectedPlatforms.filter(p => p !== platformId);
            if (newSelection.length === 0) {
                alert('At least one platform must be selected');
                return;
            }
        } else {
            // Add platform
            newSelection = [...selectedPlatforms, platformId];
        }

        setSelectedPlatforms(newSelection);
        onChange(newSelection);
    };

    return (
        <div className="platform-selector">
            <label className="block text-sm font-semibold text-slate-700 mb-2">
                Allowed Platforms
                <span className="text-xs font-normal text-slate-500 ml-2">
                    (Select where students can access this content)
                </span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {PLATFORMS.map(platform => {
                    const isSelected = selectedPlatforms.includes(platform.id);

                    return (
                        <div
                            key={platform.id}
                            onClick={() => handleToggle(platform.id)}
                            className={`
                relative flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all
                ${isSelected
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-gray-200 bg-white hover:border-gray-300'
                                }
              `}
                        >
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => { }} // Handled by parent div click
                                className="mt-1 h-4 w-4 text-blue-600 rounded focus:ring-blue-500"
                            />

                            <div className="ml-3 flex-1">
                                <div className="flex items-center gap-2">
                                    {React.createElement(platform.icon, {
                                        size: 18,
                                        color: isSelected ? '#2563EB' : '#64748b'
                                    })}
                                    <span className={`font-medium ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {platform.name}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 mt-1">
                                    {platform.description}
                                </p>
                            </div>

                            {isSelected && (
                                <CheckCircle2
                                    size={20}
                                    color="#2563EB"
                                    className="absolute top-2 right-2"
                                />
                            )}
                        </div>
                    );
                })}
            </div>


            <div className="mt-2 text-xs text-slate-600 flex items-start gap-2">
                <Info size={16} color="#64748b" />
                <span>
                    Students will only see this content on selected platforms.
                    Content accessed from other platforms will show an access denied message.
                </span>
            </div>
        </div>
    );
}
