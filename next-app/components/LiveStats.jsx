import React, { useState, useEffect, useRef } from 'react';
import { Users, BookOpen, Trophy, Star, Award, CheckCircle } from 'lucide-react';

const iconMap = {
    users: Users,
    book: BookOpen,
    trophy: Trophy,
    star: Star,
    award: Award,
    check: CheckCircle,
};

const CountUpNumber = ({ endValue, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const domRef = useRef();

    // Setup Intersection Observer
    useEffect(() => {
        const observer = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting) {
                setIsVisible(true);
                observer.unobserve(domRef.current);
            }
        }, { threshold: 0.1 });

        const currentRef = domRef.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, []);

    // Animation logic
    useEffect(() => {
        if (!isVisible) return;

        // Parse numeric part and suffix
        const numericMatch = endValue.toString().match(/(\d+)/);
        const suffixMatch = endValue.toString().match(/[^\d]+/);

        if (!numericMatch) {
            setCount(endValue);
            return;
        }

        const target = parseInt(numericMatch[0]);
        const suffix = suffixMatch ? suffixMatch[0] : '';
        const start = 0;
        const frameRate = 1000 / 60; // 60 FPS
        const totalFrames = Math.round(duration / frameRate);
        const increment = target / totalFrames;

        let frame = 0;
        const timer = setInterval(() => {
            frame++;
            const currentCount = Math.min(Math.floor(increment * frame), target);
            setCount(`${currentCount}${suffix}`);

            if (frame === totalFrames) {
                clearInterval(timer);
                setCount(endValue); // Ensure we land exactly on the target
            }
        }, frameRate);

        return () => clearInterval(timer);
    }, [isVisible, endValue, duration]);

    return <span ref={domRef}>{count || (isVisible ? '0' : '')}</span>;
};

const LiveStats = ({ stats = [] }) => {
    // Filter out empty stats
    const validStats = stats.filter(stat => stat.value && stat.label);

    if (validStats.length === 0) return null;

    return (
        <section className="py-12 bg-white border-y border-slate-100">
            <div className="max-w-7xl mx-auto px-6">
                <div className={`grid grid-cols-2 md:grid-cols-${Math.min(validStats.length, 4)} gap-8`}>
                    {validStats.map((stat, index) => {
                        const IconComponent = iconMap[stat.icon] || Users;

                        return (
                            <div
                                key={index}
                                className="text-center group"
                            >
                                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 mb-4 group-hover:scale-110 group-hover:bg-blue-100 transition-all duration-300">
                                    <IconComponent size={28} strokeWidth={1.5} />
                                </div>
                                <div className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-1 tracking-tight">
                                    <CountUpNumber endValue={stat.value} />
                                </div>
                                <div className="text-sm text-slate-500 font-medium">
                                    {stat.label}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default LiveStats;
