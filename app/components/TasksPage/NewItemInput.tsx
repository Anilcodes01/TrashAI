"use client";

import { useState, FC, useEffect, useRef } from "react";

interface NewItemInputProps {
  onSave: (content: string) => void;
  onCancel: () => void;
  placeholder: string;
  isSubTask: boolean;
}

export const NewItemInput: FC<NewItemInputProps> = ({
  onSave,
  onCancel,
  placeholder,
  isSubTask,
}) => {
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSave = () => {
    if (content.trim()) {
      onSave(content.trim());
      setContent("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSave();
    } else if (e.key === "Escape") {
      onCancel();
    }
  };

  const textSize = isSubTask ? "text-sm" : "text-base";

  return (
    <div className="flex items-center gap-3 py-1">
      <input
        ref={inputRef}
        type="text"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder={placeholder}
        className={`${textSize} bg-transparent border-b border-gray-400 focus:outline-none focus:border-blue-500 w-full`}
      />
    </div>
  );
};