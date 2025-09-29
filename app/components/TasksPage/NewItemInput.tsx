import { FC, useState, useRef, useEffect } from 'react'; // Import useRef and useEffect
import { Check, X } from 'lucide-react';

interface NewItemInputProps {
    isSubTask: boolean;
    placeholder: string;
    onSave: (content: string) => void;
    onCancel: () => void;
}

export const NewItemInput: FC<NewItemInputProps> = ({ isSubTask, placeholder, onSave, onCancel }) => {
    const [content, setContent] = useState('');
    const inputRef = useRef<HTMLInputElement>(null); // Create a ref for the input

    // --- ENHANCEMENT: Auto-focus the input on mount ---
    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    const handleSave = () => {
        if (content.trim()) {
            onSave(content.trim());
        } else {
            onCancel(); // Cancel if the input is empty
        }
    };
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSave();
        if (e.key === 'Escape') onCancel();
    };

    return (
        <div className={`flex items-center gap-2 w-full ${isSubTask ? 'ml-1' : ''}`}>
            <input
                ref={inputRef} // Attach the ref
                type="text"
                placeholder={placeholder}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleSave} // Save on blur for better UX
                className="bg-transparent border-b border-gray-500 focus:outline-none focus:border-blue-500 w-full text-sm"
            />
            <button onClick={handleSave} className="text-green-500 hover:text-green-400"><Check size={18} /></button>
            <button onClick={onCancel} className="text-red-500 hover:text-red-400"><X size={18} /></button>
        </div>
    );
};