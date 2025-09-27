"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import PusherClient from 'pusher-js';
import toast from 'react-hot-toast';
import { CustomNotification } from '../ui/CustomNotification';
import { MessageSquare, UserPlus } from 'lucide-react';

let pusherClient: PusherClient | null = null;
const getPusherClient = () => {
  if (!pusherClient) {
    pusherClient = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
    });
  }
  return pusherClient;
};

interface NewMessagePayload {
  sender: { name: string | null };
  content: string;
  listId: string;
}

interface NewInvitationPayload {
  listTitle: string;
}

export const NotificationProvider = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;

  useEffect(() => {
    if (!userId) {
      return;
    }

    const pusher = getPusherClient();
    const channelName = `private-user-${userId}`;
    
    try {
      const channel = pusher.subscribe(channelName);

      channel.bind('new-message', (data: NewMessagePayload) => {
        toast.custom((t) => (
          <CustomNotification
            t={t}
            icon={<MessageSquare size={16} />}
            iconClassName="text-sky-400 bg-sky-500/10"
            title={`New message from ${data.sender.name}`}
            message={data.content}
            href={`/tasks/${data.listId}`}
          />
        ));
      });

      channel.bind('new-invitation', (data: NewInvitationPayload) => {
        toast.custom((t) => (
          <CustomNotification
            t={t}
            icon={<UserPlus size={16} />}
            iconClassName="text-green-400 bg-green-500/10"
            title="Collaboration Invitation"
            message={`You've been invited to: "${data.listTitle}"`}
            href="/inbox"
          />
        ));
      });
      
      // --- THIS IS THE FIX ---
      // This robust cleanup function will run when the component unmounts.
      // In Strict Mode, this prevents creating duplicate event listeners.
      return () => {
        // We unbind all event listeners from the channel instance before unsubscribing
        channel.unbind_all();
        // We then fully unsubscribe from the channel on the Pusher connection
        pusher.unsubscribe(channelName);
      };

    } catch (error) {
      console.error("Failed to subscribe to Pusher for notifications:", error);
    }

  }, [userId]);

  return null;
};