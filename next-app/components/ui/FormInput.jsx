import React from 'react';

const FormInput = ({
    label,
    name,
    value,
    onChange,
    type = 'text',
    placeholder,
    error,
    helpText,
    required = false,
    disabled = false,
    onWheel
}) => {
    return (
        <div className="flex mb-6 items-start">
            <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex-1 max-w-xl">
                <input
                    type={type}
                    name={name}
                    value={value}
                    onChange={onChange}
                    placeholder={placeholder}
                    disabled={disabled}
                    onWheel={onWheel}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${error
                            ? 'border-red-400 bg-red-50'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                        } ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                />
                {error && (
                    <p className="text-red-500 text-xs mt-1">{error}</p>
                )}
                {helpText && !error && (
                    <p className="text-slate-500 text-xs mt-1">{helpText}</p>
                )}
            </div>
        </div>
    );
};

export default FormInput;
