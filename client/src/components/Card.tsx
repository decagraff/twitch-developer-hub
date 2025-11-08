import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`
        bg-twitch-dark-light
        rounded-lg
        p-8
        border
        border-twitch-gray-dark
        shadow-xl
        ${className}
      `}
    >
      {children}
    </div>
  );
};
