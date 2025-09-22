// components/MainTextArea.tsx
"use client";
import { useState } from 'react';

// Define the props the component will accept
interface MainTextAreaProps {
  onGenerate: (prompt: string) => void;
  isLoading: boolean;
}

export default function MainTextArea({ onGenerate, isLoading }: MainTextAreaProps) {
  const [prompt, setPrompt] = useState('');

  const handleSubmit = () => {
    // Call the function passed down from the parent
    onGenerate(prompt);
  };

  return (
    <div className="flex lg:max-w-4xl w-full flex-col">
      <div>
        <h1 className="text-5xl mb-8 font-bold">📝 AI-Powered Conversational To-Do List</h1>
      </div>
      <div className="flex flex-col gap-4">
        <h2 className="text-4xl font-bold">What would you like to do?</h2>
        <p>Describe your tasks in plain English, and let AI build your list.</p>
      </div>
      <div className="flex flex-col gap-4 mt-2">
        <textarea
          rows={5}
          className="text-sm border rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-shadow"
          placeholder="e.g., I need to prepare for the project launch. This includes creating a presentation and finishing the report. The presentation is the highest priority."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={isLoading} // Disable textarea while loading
        />
        <button
          onClick={handleSubmit}
          className="px-4 w-fit cursor-pointer py-1 border rounded-2xl border-gray-600 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={isLoading || !prompt.trim()} // Disable button while loading or if textarea is empty
        >
          {isLoading ? '✨ Generating...' : '✨ Submit'}
        </button>
      </div>
    </div>
  );
}