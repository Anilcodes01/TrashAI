import React from 'react';

interface AvatarProps {
  name: string;
  size?: 'sm' | 'md'; // Optional size prop
}

const getInitials = (name: string): string => {
  const names = name.trim().split(' ');
  if (names.length === 1 && names[0].length > 0) {
    return names[0][0].toUpperCase();
  }
  if (names.length > 1 && names[0].length > 0 && names[names.length - 1].length > 0) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return 'U';
};

export const Avatar = ({ name, size = 'sm' }: AvatarProps) => {
  const initials = getInitials(name || 'User');
  
  // Hash the name to get a consistent color
  const colorHash = [...(name || '')].reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  
  // A palette of Tailwind colors that work well in a dark theme
  const colors = [
    "bg-emerald-600", "bg-sky-600", "bg-violet-600", 
    "bg-rose-600", "bg-amber-600", "bg-teal-600"
  ];
  const color = colors[Math.abs(colorHash) % colors.length];

  const sizeClasses = {
    sm: 'h-8 w-8 text-xs',
    md: 'h-10 w-10 text-sm',
  };

  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white shrink-0 ${sizeClasses[size]} ${color}`}
      title={name}
    >
      {initials}
    </div>
  );
};