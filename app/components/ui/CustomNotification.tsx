"use client";

import { toast, Toast } from 'react-hot-toast';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import Link from 'next/link';

interface CustomNotificationProps {
  t: Toast;
  icon: React.ReactNode;
  iconClassName: string;
  title: string;
  message: string;
  href?: string;
}

export const CustomNotification = ({ t, icon, iconClassName, title, message, href }: CustomNotificationProps) => {
  const content = (
    <div className="flex items-start gap-3">
      <div className={`shrink-0 p-2 rounded-full ${iconClassName}`}>
        {icon}
      </div>
      <div className="flex-grow">
        <p className="font-semibold text-zinc-100 text-sm">{title}</p>
        <p className="mt-1 text-xs text-zinc-400 truncate max-w-[250px]">{message}</p>
      </div>
      <div className="shrink-0">
        <button
          onClick={() => toast.dismiss(t.id)}
          className="p-1 rounded-full text-zinc-500 hover:bg-zinc-700 hover:text-zinc-200 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -25 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className="max-w-sm w-full bg-zinc-900/80 backdrop-blur-lg shadow-2xl rounded-lg border border-zinc-800 pointer-events-auto overflow-hidden"
    >
        {href ? (
            <Link href={href} className="block p-3" onClick={() => toast.dismiss(t.id)}>
                {content}
            </Link>
        ) : (
            <div className="p-3">{content}</div>
        )}
        <motion.div
            className="h-0.5 bg-green-500/50"
            initial={{ width: '100%' }}
            animate={{ width: '0%' }}
            transition={{ duration: t.duration ? t.duration / 1000 : 4, ease: 'linear' }}
        />
    </motion.div>
  );
};