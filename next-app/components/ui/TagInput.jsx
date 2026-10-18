import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';

const TagInput = ({ tags = [], onChange, placeholder = "Add a tag..." }) => {
    const [input, setInput] = useState('');

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag();
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags.length - 1);
        }
    };

    const addTag = () => {
        const trimmedInput = input.trim();
        if (trimmedInput && !tags.includes(trimmedInput)) {
            onChange([...tags, trimmedInput]);
            setInput('');
        }
    };

    const removeTag = (index) => {
        const newTags = [...tags];
        newTags.splice(index, 1);
        onChange(newTags);
    };

    return (
        <div className="w-full">
            <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                {tags.map((tag, index) => (
                    <span key={index} className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm font-medium border border-blue-100">
                        {tag}
                        <button
                            type="button"
                            onClick={() => removeTag(index)}
                            className="text-blue-400 hover:text-blue-600 focus:outline-none"
                        >
                            <X size={14} />
                        </button>
                    </span>
                ))}
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onBlur={addTag}
                    placeholder={tags.length === 0 ? placeholder : ''}
                    className="flex-1 min-w-[120px] outline-none text-sm bg-transparent py-1"
                />
            </div>
            <p className="text-xs text-slate-500 mt-1">Press Enter or comma to add tags</p>
        </div>
    );
};

export default TagInput;
