import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  className = '',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {label}
        </label>
      )}
      <input
        className={`
          w-full
          bg-twitch-dark-light
          border
          ${error ? 'border-red-500' : 'border-twitch-gray-dark'}
          rounded-lg
          px-4
          py-3
          text-white
          placeholder-twitch-gray-light
          focus:outline-none
          focus:border-twitch-purple
          transition-colors
          duration-200
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-500">{error}</p>
      )}
    </div>
  );
};
