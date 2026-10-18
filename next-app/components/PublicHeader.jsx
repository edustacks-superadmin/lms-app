'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useHomeSettings } from '../context/HomeSettingsContext';
import { useInstitute } from '../context/InstituteContext';
import { Menu, X, ChevronDown, Search, Smartphone, ShoppingCart } from 'lucide-react';
import { useCart } from '../context/CartContext';

const PublicHeader = () => {
    const router = useRouter();
    const pathname = usePathname();
    const { settings } = useHomeSettings();
    const { institute } = useInstitute();
    const { cartCount } = useCart();
    const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

    const flags = institute?.feature_flags || {};
    // Default to true if undefined for backward compatibility, unless explicitly false
    const showGallery = flags.galleryEnabled !== false;
    const showResources = flags.resourcesEnabled !== false;
    const showAbout = flags.aboutUsEnabled !== false;
    const showInstructors = flags.instructorsEnabled !== false;
    const showCareers = flags.careersEnabled !== false;
    const showFaq = flags.faqEnabled !== false;
    const showCompany = showAbout || showInstructors || showCareers || showFaq;

    // Dropdown states
    const [galleryDropdownOpen, setGalleryDropdownOpen] = React.useState(false);
    const [resourcesDropdownOpen, setResourcesDropdownOpen] = React.useState(false);
    const [companyDropdownOpen, setCompanyDropdownOpen] = React.useState(false);
    const [successDropdownOpen, setSuccessDropdownOpen] = React.useState(false);

    // Dynamic Resource Labels
    const labelSyllabus = institute?.label_resource_syllabus || 'Syllabus';
    const labelPYQ = institute?.label_resource_pyq || 'Previous Year Papers';
    const labelNotifications = institute?.label_resource_notifications || 'Notifications';

    // Helpers for active state
    const isActive = (path) => pathname === path;
    const isChildActive = (paths) => paths.some(p => pathname.startsWith(p));

    const NavItem = ({ href, children }) => (
        <button
            onClick={() => router.push(href)}
            className={`py-2 px-3 bg-transparent border-none text-sm font-medium cursor-pointer transition-colors ${isActive(href) ? 'text-[var(--primary-color)] font-bold' : 'text-gray-700 hover:text-gray-900'
                }`}
        >
            {children}
        </button>
    );

    const MobileNavItem = ({ href, children, icon: Icon }) => (
        <button
            onClick={() => {
                router.push(href);
                setMobileMenuOpen(false);
            }}
            className={`p-3 bg-transparent border border-gray-100 rounded-lg text-sm font-medium cursor-pointer w-full flex items-center gap-3 transition-all ${isActive(href) ? 'bg-blue-50 text-[var(--primary-color)] border-blue-100' : 'text-gray-700 hover:bg-gray-50'
                }`}
        >
            {Icon && <Icon size={18} className="opacity-70" />}
            {children}
        </button>
    );

    return (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-[1000] shadow-sm">
            <div className="w-full mx-auto py-3 px-5 flex items-center justify-between">
                {/* Logo + Institute Name */}
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => router.push('/')}
                >
                    {institute?.logo_url ? (
                        <img
                            src={institute.logo_url}
                            alt="Logo"
                            className="h-10 w-auto"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-lg bg-[var(--primary-color)] flex items-center justify-center text-white font-bold text-xl">
                            {(institute?.name || 'Edustacks').charAt(0)}
                        </div>
                    )}
                    <div>
                        <div className="text-xl font-bold m-0 text-gray-900 block leading-tight">
                            {institute?.name || 'Edustacks'}
                        </div>
                        {institute?.slogan && (
                            <p className="text-xs text-gray-500 m-0">
                                {institute.slogan}
                            </p>
                        )}
                    </div>
                </div>

                {/* Desktop Navigation */}
                <div className="flex items-center gap-2 desktop-nav">
                    <NavItem href="/">Home</NavItem>
                    <NavItem href="/store">Store</NavItem>
                    <NavItem href="/posts">Posts</NavItem>

                    {/* Success Stories Dropdown */}
                    <div
                        className="relative"
                        onMouseEnter={() => setSuccessDropdownOpen(true)}
                        onMouseLeave={() => setSuccessDropdownOpen(false)}
                    >
                        <button
                            className={`py-2 px-3 bg-transparent border-none text-sm font-medium cursor-pointer flex items-center gap-1 transition-colors ${isChildActive(['/achievers', '/results']) ? 'text-[var(--primary-color)] font-bold' : 'text-gray-700 hover:text-gray-900'
                                }`}
                        >
                            Success Stories <ChevronDown size={14} />
                        </button>
                        {successDropdownOpen && (
                            <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden min-w-[180px] z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                <button onClick={() => router.push('/achievers')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">Achievers</button>
                                <button onClick={() => router.push('/results')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">Results</button>
                            </div>
                        )}
                    </div>

                    {showResources && (
                        <div
                            className="relative"
                            onMouseEnter={() => setResourcesDropdownOpen(true)}
                            onMouseLeave={() => setResourcesDropdownOpen(false)}
                        >
                            <button
                                className={`py-2 px-3 bg-transparent border-none text-sm font-medium cursor-pointer flex items-center gap-1 transition-colors ${isChildActive(['/resources']) ? 'text-[var(--primary-color)] font-bold' : 'text-gray-700 hover:text-gray-900'
                                    }`}
                            >
                                {institute?.label_resource_page_title || 'Resources'} <ChevronDown size={14} />
                            </button>
                            {resourcesDropdownOpen && (
                                <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden min-w-[200px] z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                    <button onClick={() => router.push('/resources?category=Syllabus')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">{labelSyllabus}</button>
                                    <button onClick={() => router.push('/resources?category=Previous Year Papers')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">{labelPYQ}</button>
                                    <button onClick={() => router.push('/resources?category=Notification')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">{labelNotifications}</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Gallery Dropdown */}
                    {showGallery && (
                        <div
                            className="relative"
                            onMouseEnter={() => setGalleryDropdownOpen(true)}
                            onMouseLeave={() => setGalleryDropdownOpen(false)}
                        >
                            <button
                                className={`py-2 px-3 bg-transparent border-none text-sm font-medium cursor-pointer flex items-center gap-1 transition-colors ${isChildActive(['/gallery']) ? 'text-[var(--primary-color)] font-bold' : 'text-gray-700 hover:text-gray-900'
                                    }`}
                            >
                                Gallery <ChevronDown size={14} />
                            </button>
                            {galleryDropdownOpen && (
                                <div className="absolute top-full left-0 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden min-w-[180px] z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                    <button onClick={() => router.push('/gallery/photos')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">Photos</button>
                                    <button onClick={() => router.push('/gallery/videos')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">Videos</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Company Dropdown */}
                    {showCompany && (
                        <div
                            className="relative"
                            onMouseEnter={() => setCompanyDropdownOpen(true)}
                            onMouseLeave={() => setCompanyDropdownOpen(false)}
                        >
                            <button
                                className={`py-2 px-3 bg-transparent border-none text-sm font-medium cursor-pointer flex items-center gap-1 transition-colors ${isChildActive(['/about-us', '/instructors', '/careers', '/faq']) ? 'text-[var(--primary-color)] font-bold' : 'text-gray-700 hover:text-gray-900'
                                    }`}
                            >
                                Company <ChevronDown size={14} />
                            </button>
                            {companyDropdownOpen && (
                                <div className="absolute top-full right-0 bg-white border border-gray-200 shadow-xl rounded-lg overflow-hidden min-w-[180px] z-50 flex flex-col py-1 animate-in fade-in zoom-in-95 duration-100">
                                    {showAbout && <button onClick={() => router.push('/about-us')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">About Us</button>}
                                    {showInstructors && <button onClick={() => router.push('/instructors')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">Instructors</button>}
                                    {showCareers && <button onClick={() => router.push('/careers')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">Careers</button>}
                                    {showFaq && <button onClick={() => router.push('/faq')} className="px-4 py-2.5 text-left hover:bg-gray-50 text-sm text-gray-700">FAQs</button>}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="w-px h-6 bg-gray-200 mx-2"></div>

                    {/* Search Button */}
                    <button
                        onClick={() => router.push('/store')}
                        className="p-2 text-gray-500 hover:text-[var(--primary-color)] hover:bg-gray-50 rounded-full transition-all"
                        title="Search Courses"
                    >
                        <Search size={20} />
                    </button>

                    {/* Cart Button */}
                    <button
                        onClick={() => router.push('/cart')}
                        className="p-2 text-gray-500 hover:text-[var(--primary-color)] hover:bg-gray-50 rounded-full transition-all relative"
                        title="View Cart"
                    >
                        <ShoppingCart size={20} />
                        {cartCount > 0 && (
                            <span className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white transform translate-x-1 -translate-y-1">
                                {cartCount}
                            </span>
                        )}
                    </button>

                    {/* App Download Button - Dynamic */}
                    <button
                        onClick={() => window.open(institute?.android_app_config?.playStoreUrl || 'https://play.google.com/store', '_blank')}
                        className="p-2 text-gray-500 hover:text-[var(--primary-color)] hover:bg-gray-50 rounded-full transition-all"
                        title="Download App"
                    >
                        <Smartphone size={20} />
                    </button>

                    <button
                        onClick={() => router.push('/student/signup')}
                        className="py-2 px-4 ml-2 bg-white text-[var(--primary-color)] border border-[var(--primary-color)] rounded-full text-sm font-medium cursor-pointer hover:bg-blue-50 transition-colors"
                    >
                        {settings?.signup_link_text || 'Sign Up'}
                    </button>

                    <button
                        onClick={() => router.push('/login')}
                        className="py-2 px-4 ml-2 bg-[var(--primary-color)] text-white border-none rounded-full text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity shadow-sm hover:shadow-md"
                    >
                        Login
                    </button>
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="mobile-menu-btn hidden bg-transparent border-none cursor-pointer p-2 text-gray-700"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                    {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
                <div className="mobile-menu hidden flex-col gap-2 py-4 px-4 border-t border-gray-200 bg-white max-h-[80vh] overflow-y-auto shadow-inner">
                    <MobileNavItem href="/">Home</MobileNavItem>
                    <MobileNavItem href="/store">Store</MobileNavItem>
                    <MobileNavItem href="/posts">Posts</MobileNavItem>
                    {showResources && (
                        <div className="py-2 border-t border-gray-100">
                            <div className="px-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{institute?.label_resource_page_title || 'Resources'}</div>
                            <div className="flex flex-col gap-1 pl-2">
                                <MobileNavItem href="/resources?category=Syllabus">{labelSyllabus}</MobileNavItem>
                                <MobileNavItem href="/resources?category=Previous Year Papers">{labelPYQ}</MobileNavItem>
                                <MobileNavItem href="/resources?category=Notification">{labelNotifications}</MobileNavItem>
                            </div>
                        </div>
                    )}

                    <div className="py-2 border-t border-gray-100 mt-2">
                        <div className="px-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Success Stories</div>
                        <div className="flex flex-col gap-1 pl-2">
                            <MobileNavItem href="/achievers">Achievers</MobileNavItem>
                            <MobileNavItem href="/results">Results</MobileNavItem>
                        </div>
                    </div>

                    {showGallery && (
                        <div className="py-2 border-t border-gray-100">
                            <div className="px-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Gallery</div>
                            <div className="flex flex-col gap-1 pl-2">
                                <MobileNavItem href="/gallery/photos">Photos</MobileNavItem>
                                <MobileNavItem href="/gallery/videos">Videos</MobileNavItem>
                            </div>
                        </div>
                    )}

                    {showCompany && (
                        <div className="py-2 border-t border-gray-100">
                            <div className="px-2 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Company</div>
                            <div className="flex flex-col gap-1 pl-2">
                                {showAbout && <MobileNavItem href="/about-us">About Us</MobileNavItem>}
                                {showInstructors && <MobileNavItem href="/instructors">Instructors</MobileNavItem>}
                                {showCareers && <MobileNavItem href="/careers">Careers</MobileNavItem>}
                                {showFaq && <MobileNavItem href="/faq">FAQs</MobileNavItem>}
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-gray-100">
                        <button
                            onClick={() => window.open(institute?.android_app_config?.playStoreUrl || 'https://play.google.com/store', '_blank')}
                            className="flex items-center justify-center gap-2 p-3 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                        >
                            <Smartphone size={18} /> Get App
                        </button>
                        <button
                            onClick={() => router.push('/store')}
                            className="flex items-center justify-center gap-2 p-3 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100"
                        >
                            <Search size={18} /> Search
                        </button>
                        <button
                            onClick={() => {
                                router.push('/cart');
                                setMobileMenuOpen(false);
                            }}
                            className="flex items-center justify-center gap-2 p-3 bg-gray-50 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-100 relative"
                        >
                            <ShoppingCart size={18} />
                            Cart
                            {cartCount > 0 && (
                                <span className="absolute top-2 right-2 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-white">
                                    {cartCount}
                                </span>
                            )}
                        </button>
                    </div>

                    <div className="flex gap-3 mt-2">
                        <button
                            onClick={() => {
                                router.push('/student/signup');
                                setMobileMenuOpen(false);
                            }}
                            className="flex-1 py-3 px-4 bg-white text-[var(--primary-color)] border border-[var(--primary-color)] rounded-lg text-sm font-bold cursor-pointer hover:bg-blue-50"
                        >
                            {settings?.signup_link_text || 'Sign Up'}
                        </button>
                        <button
                            onClick={() => {
                                router.push('/login');
                                setMobileMenuOpen(false);
                            }}
                            className="flex-1 py-3 px-4 bg-[var(--primary-color)] text-white border-none rounded-lg text-sm font-bold cursor-pointer hover:opacity-90 shadow-md"
                        >
                            Login
                        </button>
                    </div>
                </div>
            )}

            <style>{`
                @media (max-width: 1024px) {
                    .desktop-nav {
                        display: none !important;
                    }
                    .mobile-menu-btn {
                        display: block !important;
                    }
                    .mobile-menu {
                        display: flex !important;
                    }
                }
            `}</style>
        </header>
    );
};

export default PublicHeader;
