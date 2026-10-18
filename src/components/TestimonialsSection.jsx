import React, { useEffect, useState } from 'react';
import { Star, Quote } from 'lucide-react';
import { supabase } from '../supabaseClient';

const TestimonialsSection = () => {
    const [testimonials, setTestimonials] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTestimonials();
    }, []);

    const fetchTestimonials = async () => {
        try {
            const { data, error } = await supabase
                .from('testimonials')
                .select('*')
                .eq('status', 'Active')
                .order('created_at', { ascending: false })
                .limit(10); // Fetch more for rolling effect

            if (error) throw error;
            setTestimonials(data || []);
        } catch (error) {
            console.error('Error fetching testimonials:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return null;
    if (testimonials.length === 0) return null;

    // Duplicate testimonials for seamless scrolling if we have enough items
    // If we have very few, we might need to duplicate multiple times to fill the screen
    const displayTestimonials = testimonials.length < 4
        ? [...testimonials, ...testimonials, ...testimonials, ...testimonials] // Quadruple if very few
        : [...testimonials, ...testimonials]; // Double usually enough

    return (
        <section style={{
            backgroundColor: '#f9fafb',
            padding: '80px 0', // Remove horizontal padding to allow full width scrolling
            overflow: 'hidden'
        }}>
            <style>
                {`
                    @keyframes scroll {
                        0% {
                            transform: translateX(0);
                        }
                        100% {
                            transform: translateX(-50%);
                        }
                    }
                    .testimonial-track {
                        display: flex;
                        gap: 30px;
                        width: fit-content;
                        animation: scroll 40s linear infinite;
                    }
                    .testimonial-track:hover {
                        animation-play-state: paused;
                    }
                `}
            </style>
            <div style={{
                maxWidth: '100%', // Full width
                margin: '0 auto',
            }}>
                <div style={{ textAlign: 'center', marginBottom: '50px', padding: '0 20px' }}>
                    <h2 style={{
                        fontSize: '32px',
                        fontWeight: 'bold',
                        color: '#111827',
                        marginBottom: '16px'
                    }}>
                        What Our Students Say
                    </h2>
                    <p style={{
                        fontSize: '18px',
                        color: '#6b7280',
                        maxWidth: '600px',
                        margin: '0 auto'
                    }}>
                        Hear from our community of learners about their experience.
                    </p>
                </div>

                <div className="testimonial-track" style={{ paddingLeft: '20px' }}>
                    {displayTestimonials.map((testimonial, index) => (
                        <div key={`${testimonial.id}-${index}`} style={{
                            backgroundColor: 'white',
                            borderRadius: '16px',
                            padding: '30px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            minWidth: '350px', // Fixed width for cards in scrolling row
                            maxWidth: '350px'
                        }}>
                            <Quote
                                size={40}
                                color="#e5e7eb"
                                style={{ position: 'absolute', top: '20px', right: '20px' }}
                            />

                            <div style={{ display: 'flex', gap: '4px', marginBottom: '20px' }}>
                                {[...Array(5)].map((_, i) => (
                                    <Star
                                        key={i}
                                        size={18}
                                        fill={i < testimonial.rating ? '#fbbf24' : 'none'}
                                        color={i < testimonial.rating ? '#fbbf24' : '#d1d5db'}
                                    />
                                ))}
                            </div>

                            <p style={{
                                fontSize: '16px',
                                lineHeight: '1.6',
                                color: '#374151',
                                marginBottom: '24px',
                                flex: 1,
                                fontStyle: 'italic'
                            }}>
                                "{testimonial.message}"
                            </p>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <img
                                    src={testimonial.image_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`}
                                    alt={testimonial.name}
                                    onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(testimonial.name)}&background=random`; }}
                                    style={{
                                        width: '56px',
                                        height: '56px',
                                        borderRadius: '50%',
                                        objectFit: 'cover',
                                        border: '2px solid #fff',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                    }}
                                />
                                <div>
                                    <h4 style={{
                                        fontSize: '16px',
                                        fontWeight: '700',
                                        color: '#111827',
                                        margin: 0
                                    }}>
                                        {testimonial.name}
                                    </h4>
                                    {testimonial.role && (
                                        <p style={{
                                            fontSize: '14px',
                                            color: '#6b7280',
                                            margin: '4px 0 0 0'
                                        }}>
                                            {testimonial.role}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
