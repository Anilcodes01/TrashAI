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

const playNotificationSound = () => {
  try {
    const audio = new Audio('/notification2.mp3'); 
    audio.play();
  } catch (error) {
    console.error("Could not play notification sound:", error);
  }
};

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
        playNotificationSound(); // <-- Play sound on new message
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
        playNotificationSound(); // <-- Play sound on new invitation
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
      
      return () => {
        channel.unbind_all();
        pusher.unsubscribe(channelName);
      };

    } catch (error) {
      console.error("Failed to subscribe to Pusher for notifications:", error);
    }

  }, [userId]);

  return null;
};