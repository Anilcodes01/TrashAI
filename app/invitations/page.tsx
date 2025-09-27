"use client";

import { useState, useEffect } from 'react';
import { acceptInvitation, declineInvitation, getInvitations } from '../actions/InvitationActions';
import { Check, X, LoaderCircle, Inbox } from 'lucide-react';

// Define a type for the invitations based on your Prisma schema
type Invitation = {
  id: string;
  todoList: {
    id: string;
    title: string;
    owner: {
      name: string | null;
      username: string;
    };
  };
};

export default function InvitationsPage() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingId, setPendingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvitations = async () => {
      try {
        setLoading(true);
        const data = await getInvitations();
        setInvitations(data as Invitation[]);
      } catch (error) {
        console.error("Failed to fetch invitations", error);
        // Handle error display if necessary
      } finally {
        setLoading(false);
      }
    };
    fetchInvitations();
  }, []);

  const handleAccept = async (collaborationId: string) => {
    setPendingId(collaborationId);
    try {
      // The action handles the redirect, so we don't need to do anything else
      await acceptInvitation(collaborationId);
    } catch (error) {
      console.error("Failed to accept invitation", error);
      alert("Error: Could not accept the invitation.");
      setPendingId(null);
    }
  };

  const handleDecline = async (collaborationId: string) => {
    setPendingId(collaborationId);
    try {
      await declineInvitation(collaborationId);
      // Optimistically remove the invitation from the UI
      setInvitations(prev => prev.filter(inv => inv.id !== collaborationId));
    } catch (error) {
      console.error("Failed to decline invitation", error);
      alert("Error: Could not decline the invitation.");
    } finally {
      setPendingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <LoaderCircle className="animate-spin text-zinc-500" size={32} />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Your Invitations</h1>
      
      {invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center text-zinc-400 border-2 border-dashed border-zinc-700 rounded-lg p-12">
            <Inbox size={48} className="text-zinc-500 mb-4" />
            <h2 className="text-lg font-semibold text-zinc-300">No Pending Invitations</h2>
            <p>When someone invites you to collaborate on a to-do list, it will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invitations.map((invitation) => {
            const isPending = pendingId === invitation.id;
            return (
              <div
                key={invitation.id}
                className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-4 flex items-center justify-between"
              >
                <div>
                  <p className="font-semibold text-white">{invitation.todoList.title}</p>
                  <p className="text-sm text-zinc-400">
                    Invited by {invitation.todoList.owner.name || invitation.todoList.owner.username}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleDecline(invitation.id)}
                    disabled={!!pendingId}
                    className="p-2 rounded-full bg-zinc-700 text-zinc-300 hover:bg-red-500/20 hover:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Decline"
                  >
                    {isPending ? <LoaderCircle className="animate-spin" size={20}/> : <X size={20} />}
                  </button>
                  <button
                    onClick={() => handleAccept(invitation.id)}
                    disabled={!!pendingId}
                    className="p-2 rounded-full bg-zinc-700 text-zinc-300 hover:bg-green-500/20 hover:text-green-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Accept"
                  >
                    {isPending ? <LoaderCircle className="animate-spin" size={20}/> : <Check size={20} />}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}