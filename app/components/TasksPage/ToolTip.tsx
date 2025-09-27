"use client";

import { useState, ReactNode, FC } from "react";

interface TooltipProps {
  children: ReactNode;
  text: string;
}

export const Tooltip: FC<TooltipProps> = ({ children, text }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div
      className="relative flex items-center"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && text && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 z-50
                     whitespace-nowrap px-3 py-1.5
                     bg-zinc-800 text-white text-xs font-semibold
                     rounded-md shadow-lg transition-opacity duration-200"
        >
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-0 h-0 border-x-4 border-x-transparent border-b-4 border-b-zinc-800"></div>
        </div>
      )}
    </div>
  );
};
