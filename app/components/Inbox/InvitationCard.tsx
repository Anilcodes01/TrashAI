
'use client';

import { useTransition } from 'react';
import { acceptInvitation, declineInvitation } from '@/app/actions/InvitationActions';
import { LoaderCircle } from 'lucide-react';

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

export function InvitationCard({ invitation }: { invitation: Invitation }) {
  const [isPending, startTransition] = useTransition();

  const handleAccept = () => {
    startTransition(async () => {
      await acceptInvitation(invitation.id);
    });
  };

  const handleDecline = () => {
    startTransition(async () => {
      try {
        await declineInvitation(invitation.id);
      } catch (error) {
        alert('Failed to decline invitation.'); 
      }
    });
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex justify-between items-center w-full max-w-2xl shadow-md">
      <div>
        <p className="text-gray-400 text-sm">
          <span className="font-semibold text-white">{invitation.todoList.owner.name || invitation.todoList.owner.username}</span> invited you to collaborate on:
        </p>
        <h3 className="text-lg font-bold">{invitation.todoList.title}</h3>
      </div>
      <div className="flex gap-3">
        <button
          onClick={handleDecline}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-md bg-gray-600 hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <LoaderCircle className="animate-spin" /> : 'Decline'}
        </button>
        <button
          onClick={handleAccept}
          disabled={isPending}
          className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? <LoaderCircle className="animate-spin" /> : 'Accept'}
        </button>
      </div>
    </div>
  );
}