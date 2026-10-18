import React, { useEffect, useState } from 'react';
import { Star, Quote, Play, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useInstitute } from '../context/InstituteContext';

const TestimonialsSection = () => {
    const { institute } = useInstitute();
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVideo, setActiveVideo] = useState(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [itemsToShow, setItemsToShow] = useState(3);

    useEffect(() => {
        if (institute?.id) {
            fetchTestimonials();
        }
    }, [institute?.id]);

    // Responsive items count
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth >= 1280) setItemsToShow(3);
            else if (window.innerWidth >= 768) setItemsToShow(2);
            else setItemsToShow(1);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Auto-play logic
    useEffect(() => {
        if (testimonials.length <= itemsToShow || isPaused || activeVideo) return;

        const interval = setInterval(() => {
            nextSlide();
        }, 5000);

        return () => clearInterval(interval);
    }, [testimonials.length, isPaused, activeVideo, itemsToShow, currentIndex]);

    const fetchTestimonials = async () => {
        try {
            // First attempt to fetch with new columns
            let { data, error } = await supabase
                .from('testimonials')
                .select('id, name, role, message, image_url, rating, status, created_at, is_featured, video_url')
                .eq('institute_id', institute.id)
                .eq('status', 'Active')
                .order('is_featured', { ascending: false })
                .order('created_at', { ascending: false });

            // If it fails because columns don't exist, fallback to basic columns
            if (error && (error.code === 'PGRST204' || error.message?.includes('column'))) {
                const fallback = await supabase
                    .from('testimonials')
                    .select('id, name, role, message, image_url, rating, status, created_at')
                    .eq('institute_id', institute.id)
                    .eq('status', 'Active')
                    .order('created_at', { ascending: false });

                if (fallback.error) throw fallback.error;
                data = fallback.data;
            } else if (error) {
                throw error;
            }

            setTestimonials(data || []);
        } catch (error) {
            console.error('Error fetching testimonials:', error);
        } finally {
            setLoading(false);
        }
    };

    const nextSlide = () => {
        if (testimonials.length <= itemsToShow) return;
        setCurrentIndex((prev) => (prev + 1) >= testimonials.length ? 0 : prev + 1);
    };

    const prevSlide = () => {
        if (testimonials.length <= itemsToShow) return;
        setCurrentIndex((prev) => (prev - 1 < 0) ? testimonials.length - 1 : prev - 1);
    };

    if (loading) return (
        <div className="py-20 bg-slate-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );

    if (testimonials.length === 0) return null;

    // Helper to get embed URL for YouTube/Vimeo
    const getEmbedUrl = (url) => {
        if (!url) return null;
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
            const id = url.includes('v=') ? url.split('v=')[1]?.split('&')[0] : url.split('/').pop();
            return `https://www.youtube.com/embed/${id}?autoplay=1`;
        }
        if (url.includes('vimeo.com')) {
            const id = url.split('/').pop();
            return `https://player.vimeo.com/video/${id}?autoplay=1`;
        }
        return url;
    };

    return (
        <section className="py-20 bg-white overflow-hidden relative">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-20 left-10 w-64 h-64 bg-blue-50 rounded-full blur-3xl opacity-60"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-slate-50 rounded-full blur-3xl opacity-60"></div>
            </div>

            <div className="max-w-7xl mx-auto px-6 relative">
                <div className="text-center mb-16">
                    <span className="inline-block px-4 py-1.5 bg-blue-50 text-blue-600 text-sm font-semibold rounded-full mb-4">
                        Success Stories
                    </span>
                    <h2 className="text-4xl font-bold text-slate-900 mb-4 tracking-tight">
                        What Our Students Say
                    </h2>
                    <p className="text-lg text-slate-600 max-w-2xl mx-auto">
                        Join thousands of students who have transformed their careers with our comprehensive learning platform.
                    </p>
                </div>

                {/* Testimonial Carousel/Grid */}
                <div
                    className="relative overflow-hidden"
                    onMouseEnter={() => setIsPaused(true)}
                    onMouseLeave={() => setIsPaused(false)}
                >
                    <div
                        className="flex transition-transform duration-700 ease-in-out py-12 px-2"
                        style={{
                            transform: `translateX(-${currentIndex * (100 / itemsToShow)}%)`,
                        }}
                    >
                        {testimonials.map((testimonial) => (
                            <div
                                key={testimonial.id}
                                className="flex-none px-3"
                                style={{ width: `${100 / itemsToShow}%` }}
                            >
                                <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col h-full group relative">
                                    {testimonial.is_featured && (
                                        <div className="absolute -top-3 left-8 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold uppercase rounded-full shadow-sm z-10">
                                            Featured Story
                                        </div>
                                    )}

                                    <div className="relative mb-6">
                                        <Quote className="text-blue-100 absolute -top-4 -left-4" size={56} />
                                        <div className="flex gap-1 relative z-10">
                                            {[...Array(5)].map((_, i) => (
                                                <Star
                                                    key={i}
                                                    size={16}
                                                    fill={i < testimonial.rating ? '#FBBF24' : 'none'}
                                                    className={i < testimonial.rating ? 'text-amber-400' : 'text-slate-200'}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex-1 mb-6">
                                        <p className="text-slate-700 leading-relaxed italic relative z-10 text-sm sm:text-base">
                                            "{testimonial.message}"
                                        </p>
                                    </div>

                                    <div className="flex items-center justify-between mt-auto pt-6 border-t border-slate-50">
                                        <div className="flex items-center gap-4">
                                            <div className="relative">
                                                <img
                                                    src={testimonial.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`}
                                                    alt={testimonial.name}
                                                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-white shadow-sm"
                                                />
                                                {testimonial.video_url && (
                                                    <button
                                                        onClick={() => setActiveVideo(testimonial.video_url)}
                                                        className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-lg hover:scale-110 transition-transform"
                                                        title="Watch Video Success Story"
                                                    >
                                                        <Play size={12} fill="currentColor" />
                                                    </button>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900 text-sm sm:text-base group-hover:text-blue-600 transition-colors">
                                                    {testimonial.name}
                                                </h4>
                                                {testimonial.role && (
                                                    <p className="text-[10px] sm:text-xs text-slate-500 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]">
                                                        {testimonial.role}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    {testimonials.length > itemsToShow && (
                        <div className="flex justify-center gap-4 mt-8">
                            <button
                                onClick={prevSlide}
                                className="w-12 h-12 rounded-full border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-blue-300 text-slate-600 transition-all shadow-sm"
                            >
                                <ChevronLeft size={24} />
                            </button>
                            <button
                                onClick={nextSlide}
                                className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center hover:bg-blue-600 text-white transition-all shadow-md"
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Video Modal */}
            {activeVideo && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-300">
                    <div
                        className="absolute inset-0 bg-slate-900/90 backdrop-blur-sm"
                        onClick={() => setActiveVideo(null)}
                    ></div>
                    <div className="relative w-full max-w-5xl aspect-video bg-black rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                        <button
                            className="absolute top-4 right-4 z-10 w-10 h-10 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white transition-colors"
                            onClick={() => setActiveVideo(null)}
                        >
                            <X size={24} />
                        </button>
                        <iframe
                            src={getEmbedUrl(activeVideo)}
                            className="w-full h-full"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                        ></iframe>
                    </div>
                </div>
            )}
        </section>
    );
};

export default TestimonialsSection;
