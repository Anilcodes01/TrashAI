
import React from 'react';

interface AvatarProps {
  name: string;
}

const getInitials = (name: string) => {
  const names = name.split(' ');
  if (names.length > 1) {
    return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

export const Avatar = ({ name }: AvatarProps) => {
  const initials = getInitials(name || 'U');
  const colorHash = [...(name || '')].reduce((acc, char) => char.charCodeAt(0) + ((acc << 5) - acc), 0);
  const colors = ['bg-red-500', 'bg-orange-500', 'bg-amber-500', 'bg-yellow-500', 'bg-lime-500', 'bg-green-500', 'bg-emerald-500', 'bg-teal-500', 'bg-cyan-500', 'bg-sky-500', 'bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-purple-500', 'bg-fuchsia-500', 'bg-pink-500', 'bg-rose-500'];
  const color = colors[Math.abs(colorHash) % colors.length];

  return (
    <div
      className={`h-6 w-6 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-zinc-900 ${color}`}
      title={name}
    >
      {initials}
    </div>
  );
};