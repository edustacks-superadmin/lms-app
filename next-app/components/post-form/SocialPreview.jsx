
import React from 'react';

const SocialPreview = ({ title, summary, coverImage, siteName = "Your Website" }) => {
    // Limits for visual preview
    const truncatedTitle = title?.length > 60 ? title.substring(0, 57) + '...' : title || 'Your Post Title';
    const truncatedDesc = summary?.length > 160 ? summary.substring(0, 157) + '...' : summary || 'Your post summary will appear here regardless of how long it is, but search engines will cut it off around 160 characters.';

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-6">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                Social Media Preview
            </h3>

            {/* Google Search Result Preview */}
            <div className="space-y-1 max-w-[600px]">
                <div className="flex items-center gap-2 text-sm text-gray-800 mb-1">
                    <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center text-xs">
                        Logo
                    </div>
                    <div className="flex flex-col leading-tight">
                        <span className="font-medium text-gray-900">{siteName}</span>
                        <span className="text-gray-500 text-xs">https://your-website.com › posts</span>
                    </div>
                </div>
                <div className="text-[#1a0dab] text-xl font-medium cursor-pointer hover:underline truncate">
                    {truncatedTitle}
                </div>
                <div className="text-sm text-gray-600 leading-snug">
                    <span className="text-gray-500">{new Date().toLocaleDateString()} — </span>
                    {truncatedDesc}
                </div>
            </div>

            <div className="h-px bg-gray-100 my-6"></div>

            {/* Facebook/LinkedIn Card Preview */}
            <div className="max-w-[500px] border border-gray-200 rounded-lg overflow-hidden bg-white cursor-pointer hover:bg-gray-50 transition-colors">
                <div className="aspect-[1.91/1] w-full bg-gray-100 flex items-center justify-center overflow-hidden">
                    {coverImage ? (
                        <img
                            src={coverImage}
                            alt="Preview"
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="text-gray-400 font-medium bg-gray-200/50 w-full h-full flex items-center justify-center">
                            1200 x 630px Recommendation
                        </div>
                    )}
                </div>
                <div className="p-3 bg-gray-50 border-t border-gray-200">
                    <div className="text-xs text-gray-500 uppercase font-medium mb-1">
                        YOUR-WEBSITE.COM
                    </div>
                    <div className="text-gray-900 font-bold leading-tight mb-1 line-clamp-2">
                        {title || 'Your Post Title'}
                    </div>
                    <div className="text-xs text-gray-600 line-clamp-1">
                        {summary || 'A brief description of your article...'}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SocialPreview;
