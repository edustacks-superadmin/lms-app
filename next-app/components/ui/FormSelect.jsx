import React from 'react';

const FormSelect = ({
    label,
    name,
    value,
    onChange,
    options = [],
    placeholder = 'Select...',
    error,
    helpText,
    required = false,
    disabled = false
}) => {
    return (
        <div className="flex mb-6 items-start">
            <label className="block text-sm font-medium text-slate-700 text-right w-52 pr-5 pt-2.5">
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
            </label>
            <div className="flex-1 max-w-xl">
                <select
                    name={name}
                    value={value}
                    onChange={onChange}
                    disabled={disabled}
                    className={`w-full px-3 py-2.5 border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${error
                            ? 'border-red-400 bg-red-50'
                            : 'border-slate-300 bg-white hover:border-slate-400'
                        } ${disabled ? 'bg-slate-100 cursor-not-allowed' : ''}`}
                >
                    <option value="">{placeholder}</option>
                    {options.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
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

export default FormSelect;
