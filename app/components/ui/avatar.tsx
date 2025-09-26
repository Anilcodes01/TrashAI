import React from 'react';

interface AvatarProps {
  name: string;
}

const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length > 0 && names[0].length > 0) {
    return names[0][0].toUpperCase();
  }
  return 'U';
};

export const Avatar = ({ name }: AvatarProps) => {
  const initials = getInitials(name || 'U');
  const colorHash = [...(name || '')].reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const colors = ["bg-zinc-800"];
  const color = colors[Math.abs(colorHash) % colors.length];

  return (
    <div
      className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font- border border-zinc-700 ${color}`}
      title={name}
    >
      {initials}
    </div>
  );
};