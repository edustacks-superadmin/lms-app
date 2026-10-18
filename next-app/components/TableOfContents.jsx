'use client';

import React, { useEffect, useState } from 'react';
import { AlignLeft } from 'lucide-react';

const TableOfContents = ({ headings = [], inline = false }) => {
    const [activeId, setActiveId] = useState('');

    useEffect(() => {
        if (!headings.length) return;

        // --- Intersection Observer for Active State ---
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveId(entry.target.id);
                    }
                });
            },
            { rootMargin: '-100px 0px -60% 0px' }
        );

        // Function to start observing elements
        const observeElements = () => {
            let observedCount = 0;
            headings.forEach(({ id }) => {
                const element = document.getElementById(id);
                if (element) {
                    observer.observe(element);
                    observedCount++;
                }
            });
            // If we didn't find any elements, maybe try again quickly (for hydration/paint timing)
            return observedCount > 0;
        };

        // Try immediately
        if (!observeElements()) {
            // Retry after short delay if elements weren't found
            setTimeout(observeElements, 500);
        }

        return () => observer.disconnect();
    }, [headings]);

    if (headings.length < 2) return null;

    const handleScroll = (e, id) => {
        e.preventDefault();
        const element = document.getElementById(id);
        if (element) {
            // Offset for sticky headers (approx 80px)
            const yOffset = -100;
            const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;

            window.scrollTo({ top: y, behavior: 'smooth' });
            setActiveId(id);
        }
    };

    return (
        <div className={inline ? "w-full mb-8 not-prose" : "w-full max-w-[280px] shrink-0"}>
            <div className={inline ? "" : "sticky top-28 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 custom-scrollbar"}>
                <div className={inline ? "bg-gray-50 rounded-xl p-5 border border-gray-100" : "mb-6"}>
                    <h4 className={`flex items-center gap-2 font-bold uppercase tracking-widest mb-4 ${inline ? "text-gray-700 text-sm" : "text-gray-400 text-xs"}`}>
                        <AlignLeft size={inline ? 16 : 14} />
                        {inline ? "Table of Contents" : "On this page"}
                    </h4>
                    <nav className={`relative flex flex-col ${inline ? "gap-1" : ""}`}>
                        {/* Decorative track line - only for sidebar mode */}
                        {!inline && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-100 rounded-full" />}

                        {headings.map((heading) => (
                            <a
                                key={heading.id}
                                href={`#${heading.id}`}
                                onClick={(e) => handleScroll(e, heading.id)}
                                className={`
                                    relative transition-all duration-300 block
                                    hover:text-emerald-600
                                    ${inline
                                        ? 'py-1.5 pl-2 text-sm text-gray-600 hover:bg-white hover:shadow-sm rounded-md'
                                        : `pl-4 py-2 text-sm border-l-2 -ml-[1px] ${activeId === heading.id
                                            ? 'border-emerald-500 text-emerald-700 font-semibold bg-emerald-50/50 rounded-r-lg'
                                            : 'border-transparent text-gray-500 hover:border-gray-200'}`
                                    }
                                    ${heading.level === 'h3' ? (inline ? 'ml-4 text-xs' : 'ml-3 text-xs pl-6') : ''}
                                `}
                            >
                                {heading.text}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default TableOfContents;
