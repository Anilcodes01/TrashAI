"use client";

import { FC, useState, useEffect, useRef, KeyboardEvent } from "react";
import { Send, X, LoaderCircle, Pin, Expand, ChevronLeft } from "lucide-react";
import { User } from "@/app/types";
import PusherClient from "pusher-js";
import { Avatar } from "../../ui/avatar";
import { AnimatePresence, motion } from "framer-motion";

let pusherClient: PusherClient | null = null;
const getPusherClient = () => {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: "/api/pusher/auth",
    });
  }
  return pusherClient;
};

interface ChatModalWindowProps {
  isOpen: boolean;
  onClose: () => void;
  listId: string;
  currentUser: User;
  unreadSenders: Set<string>;
  onMarkAsRead: (senderId: string) => void;
}

type Collaborator = User;

interface ChatMessage {
  id: string;
  content: string;
  senderId: string;
  receiverId: string;
  createdAt: string;
  listId: string;
  sender: {
    id: string;
    name: string | null;
  };
}

const animationVariants = {
  hidden: {
    y: 50,
    opacity: 0,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 300, damping: 30 },
  },
} as const; 

export const ChatModalWindow: FC<ChatModalWindowProps> = ({ isOpen, onClose, listId, currentUser, unreadSenders, onMarkAsRead }) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (isOpen) {
      const fetchCollaborators = async () => {
        setIsLoadingCollaborators(true);
        try {
          const res = await fetch(`/api/lists/${listId}/collaborators`);
          if (!res.ok) throw new Error("Failed to fetch collaborators");
          setCollaborators(await res.json());
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoadingCollaborators(false);
        }
      };
      fetchCollaborators();
    } else {
      setSelectedCollaborator(null);
      setMessages([]);
    }
  }, [isOpen, listId]);

  useEffect(() => {
    if (selectedCollaborator) {
      const fetchMessages = async () => {
        setIsLoadingMessages(true);
        setMessages([]);
        try {
          const res = await fetch(`/api/messages/${listId}/${selectedCollaborator.id}`);
          if (!res.ok) throw new Error("Failed to fetch messages");
          setMessages(await res.json());
        } catch (error) {
          console.error(error);
        } finally {
          setIsLoadingMessages(false);
        }
      };
      fetchMessages();
    }
  }, [selectedCollaborator, listId]);

  useEffect(() => {
    if (!currentUser?.id) return;
    const pusher = getPusherClient();
    const channelName = `private-user-${currentUser.id}`;
    try {
      const channel = pusher.subscribe(channelName);
      const handleNewMessage = (data: ChatMessage) => {
        if (data.senderId === selectedCollaborator?.id && data.listId === listId) {
          setMessages((prevMessages) => [...prevMessages, data]);
        }
      };
      channel.bind("new-message", handleNewMessage);
      return () => {
        channel.unbind("new-message", handleNewMessage);
      };
    } catch (error) {
      console.error("Pusher subscription failed in chat modal:", error);
    }
  }, [currentUser.id, selectedCollaborator?.id, listId]);

  const handleSelectCollaborator = (collaborator: Collaborator) => {
    setSelectedCollaborator(collaborator);
    onMarkAsRead(collaborator.id);
    textareaRef.current?.focus();
  };
  
  const handleGoBackToList = () => {
    setSelectedCollaborator(null);
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newMessage.trim() || !selectedCollaborator) return;
    const optimisticMessage: ChatMessage = { id: `temp-${Date.now()}`, content: newMessage.trim(), senderId: currentUser.id, receiverId: selectedCollaborator.id, createdAt: new Date().toISOString(), listId: listId, sender: { id: currentUser.id, name: currentUser.name || "You" } };
    setMessages((prev) => [...prev, optimisticMessage]);
    setNewMessage("");
    try {
      await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: selectedCollaborator.id, content: newMessage.trim(), listId }) });
    } catch (error) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  return (
    <motion.div variants={animationVariants} initial="hidden" animate="visible" exit="hidden" className="fixed bottom-5 right-5 z-50 w-full max-w-md" data-active-chat-id={selectedCollaborator?.id}>
      <div className="flex h-[65vh] flex-col overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800/50 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 border-b border-zinc-700 p-3 pr-2 shrink-0">
          {selectedCollaborator ? (
            <button onClick={handleGoBackToList} className="p-1.5 text-zinc-400 hover:bg-zinc-700 rounded-md">
                <ChevronLeft size={16}/>
            </button>
          ) : <div className="w-8"></div>}
          <h2 className="flex-grow font-semibold text-zinc-200">{selectedCollaborator ? selectedCollaborator.name : "Messages"}</h2>
          <button className="p-1.5 text-zinc-400 hover:bg-zinc-700 rounded"><Pin size={16} /></button>
          <button className="p-1.5 text-zinc-400 hover:bg-zinc-700 rounded"><Expand size={16} /></button>
          <button onClick={onClose} className="p-1.5 text-zinc-400 hover:bg-zinc-700 rounded"><X size={16} /></button>
        </div>

        <div className="flex flex-grow overflow-hidden">
          <AnimatePresence>
            {!selectedCollaborator && (
              <motion.div initial={{ x: "-100%" }} animate={{ x: "0%" }} exit={{ x: "-100%" }} transition={{ duration: 0.3, ease: "easeInOut" }} className="w-full flex-shrink-0">
                <div className="overflow-y-auto">
                  {isLoadingCollaborators ? (
                    <div className="flex justify-center items-center h-full p-10"><LoaderCircle className="animate-spin text-zinc-500" /></div>
                  ) : (
                    collaborators.map((collab) => (
                      <button key={collab.id} onClick={() => handleSelectCollaborator(collab)} className="w-full flex items-center gap-3 p-3 text-left transition-colors duration-200 hover:bg-zinc-700/50">
                        <Avatar name={collab.name || "U"} />
                        <span className="flex-grow font-medium text-zinc-200 truncate">{collab.name}</span>
                        {unreadSenders.has(collab.id) && <div className="h-2.5 w-2.5 rounded-full bg-green-500 shrink-0"></div>}
                      </button>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {selectedCollaborator && (
            <div className="flex w-full flex-col">
              <div className="flex-grow  space-y-6 overflow-y-auto p-4 hide-scrollbar">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center"><LoaderCircle className="animate-spin text-zinc-500" /></div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-2.5 ${msg.senderId === currentUser.id ? "flex-row-reverse" : ""}`}>
                      {msg.senderId !== currentUser.id && <Avatar name={msg.sender.name || "C"} />}
                      <div className={`w-fit max-w-sm rounded-2xl px-3.5 py-2 ${msg.senderId === currentUser.id ? "rounded-br-lg bg-green-600 text-white" : "rounded-bl-lg bg-zinc-700 text-zinc-200"}`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-zinc-700 p-3">
                <form onSubmit={handleSendMessage} className="relative">
                  <textarea ref={textareaRef} value={newMessage} onChange={(e) => setNewMessage(e.target.value)} onKeyDown={handleKeyDown} placeholder={`Message ${selectedCollaborator.name}...`} rows={1} className="w-full resize-none rounded-lg border border-zinc-600 bg-zinc-700/50 py-2 pl-4 pr-12 text-sm text-zinc-200 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
                  <button type="submit" disabled={!newMessage.trim()} className="absolute bottom-1.5 right-1.5 rounded-md p-1.5 text-zinc-300 transition-colors hover:bg-zinc-600 disabled:cursor-not-allowed disabled:text-zinc-500">
                    <Send size={18} />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};