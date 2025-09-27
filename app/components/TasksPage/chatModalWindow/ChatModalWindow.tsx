"use client";

import { FC, useState, useEffect, useRef } from "react";
import { Send, X, LoaderCircle, MessageSquare } from "lucide-react";
import { User } from "@/app/types";
import PusherClient from "pusher-js";
import { Avatar } from "../../ui/avatar";

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

const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const ChatModalWindow: FC<ChatModalWindowProps> = ({
  isOpen,
  onClose,
  listId,
  currentUser,
  unreadSenders,
  onMarkAsRead,
}) => {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoadingCollaborators, setIsLoadingCollaborators] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

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
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedCollaborator) return;
    
    const optimisticMessage: ChatMessage = { id: `temp-${Date.now()}`, content: newMessage.trim(), senderId: currentUser.id, receiverId: selectedCollaborator.id, createdAt: new Date().toISOString(), listId: listId, sender: { id: currentUser.id, name: currentUser.name || "You" }, };
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    try {
        await fetch("/api/messages", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ receiverId: selectedCollaborator.id, content: newMessage.trim(), listId }), });
    } catch (error) {
        console.error("Failed to send message:", error);
        setMessages(prev => prev.filter(m => m.id !== optimisticMessage.id));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0  z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-zinc-900 border border-zinc-700/50 rounded-lg shadow-2xl w-full max-w-4xl h-[85vh] flex overflow-hidden"
        data-active-chat-id={selectedCollaborator?.id}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-1/3 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
          <h2 className="text-lg font-bold p-4 border-b border-zinc-800 text-zinc-200 shrink-0">
            Collaborators
          </h2>
          <div className="overflow-y-auto flex-grow">
            {isLoadingCollaborators ? (
              <div className="flex justify-center items-center h-full"><LoaderCircle className="animate-spin text-zinc-500" /></div>
            ) : (
              <ul>
                {collaborators.map((collab) => (
                  <li key={collab.id}>
                    <button
                      className={`w-full flex items-center gap-3 p-3 text-left transition-colors duration-200 ${selectedCollaborator?.id === collab.id ? "bg-blue-600/20" : "hover:bg-zinc-800/50"}`}
                      onClick={() => handleSelectCollaborator(collab)}
                    >
                      <Avatar name={collab.name || "User"} />
                      <span className="flex-grow font-medium text-zinc-200 truncate">{collab.name}</span>
                      {unreadSenders.has(collab.id) && (
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500 shrink-0"></span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        <div className="w-2/3 flex flex-col bg-zinc-800/70">
          {selectedCollaborator ? (
            <>
              <div className="p-3 border-b border-zinc-700/50 flex items-center gap-3 shrink-0">
                 <Avatar name={selectedCollaborator.name || "User"} size="md"/>
                 <h2 className="text-lg font-bold text-white flex-grow">{selectedCollaborator.name}</h2>
                 <button onClick={onClose} className="text-zinc-400 hover:text-white transition-colors p-1 rounded-full"><X size={20} /></button>
              </div>
              <div className="flex-grow p-4 overflow-y-auto space-y-6">
                {isLoadingMessages ? (
                  <div className="flex justify-center items-center h-full"><LoaderCircle className="animate-spin text-zinc-500" /></div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className={`flex items-end gap-3 ${msg.senderId === currentUser.id ? "flex-row-reverse" : ""}`}>
                      {msg.senderId !== currentUser.id && <Avatar name={msg.sender.name || 'C'} />}
                      <div className={`max-w-xs lg:max-w-md p-3 rounded-2xl ${msg.senderId === currentUser.id ? "bg-green-600 text-white rounded-br-lg" : "bg-zinc-700 text-zinc-200 rounded-bl-lg"}`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <p className={`text-xs mt-1.5 opacity-60 ${msg.senderId === currentUser.id ? 'text-blue-200' : 'text-zinc-400'}`}>{formatTime(msg.createdAt)}</p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t border-zinc-700/50 shrink-0">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-grow bg-zinc-700 rounded-full px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-shadow"/>
                  <button type="submit" disabled={!newMessage.trim()} className="p-3 rounded-full bg-green-600 hover:bg-green-700 disabled:bg-zinc-600 disabled:cursor-not-allowed transition-colors shrink-0">
                    <Send size={20} className="text-white" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-full text-zinc-500 gap-4">
                <MessageSquare size={48} />
                <h3 className="text-lg font-medium text-zinc-400">Select a collaborator</h3>
                <p className="text-sm text-center max-w-xs">Choose a person from the sidebar to view your message history and start a conversation.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};