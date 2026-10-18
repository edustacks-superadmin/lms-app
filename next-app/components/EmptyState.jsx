import React from 'react';
import { BookOpen } from 'lucide-react';

const EmptyState = ({ icon: Icon, title, description, actionButton }) => {
    const DisplayIcon = Icon || BookOpen;

    return (
        <div className="flex flex-col items-center justify-center py-16 px-5 text-center min-h-[400px]">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                <DisplayIcon size={36} className="text-gray-400" />
            </div>

            <h3 className="text-xl font-semibold text-gray-800 m-0 mb-2">
                {title}
            </h3>

            <p className="text-sm text-gray-500 m-0 mb-6 max-w-[400px] leading-relaxed">
                {description}
            </p>

            {actionButton && (
                <div>{actionButton}</div>
            )}
        </div>
    );
};

export default EmptyState;
