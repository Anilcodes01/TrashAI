'use client';

import { useEffect } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { InvitationCard } from './InvitationCard';
import { LoaderCircle } from 'lucide-react';
import PusherClient from 'pusher-js';
import { useSession } from 'next-auth/react';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type Invitation = {
  id: string;
  todoList: {
    id: string;
    title: string;
    owner: { name: string | null; username: string };
  };
};

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

export function InvitationList() {
    const { data: session } = useSession();
    const { data: invitations, error, isLoading } = useSWR<Invitation[]>('/api/invitations', fetcher);
    const { mutate } = useSWRConfig();

    useEffect(() => {
        if (!session?.user?.id) return;
        const pusher = getPusherClient();
        const channelName = `private-user-${session.user.id}`;
        
        try {
            const channel = pusher.subscribe(channelName);
            channel.bind('invitation-new', (newInvitation: Invitation) => {
                mutate('/api/invitations', (currentInvitations: Invitation[] = []) => {
                    return [newInvitation, ...currentInvitations];
                }, { revalidate: false });
            });
            return () => {
                pusher.unsubscribe(channelName);
            };
        } catch (e) {
            console.error('Failed to subscribe to Pusher:', e);
        }
    }, [session?.user?.id, mutate]);
    
    if (isLoading) return <LoaderCircle className="animate-spin mx-auto text-gray-400" />;
    if (error) return <p className="text-red-500 text-center">Failed to load invitations.</p>;

    return (
        <div className="flex flex-col items-center gap-4 w-full">
            {invitations && invitations.length > 0 ? (
                invitations.map((invitation) => (
                    <InvitationCard key={invitation.id} invitation={invitation} />
                ))
            ) : (
                <div className="text-center p-8 bg-gray-800/50 rounded-lg border border-dashed border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-300">Your inbox is empty</h2>
                    <p className="text-gray-500 mt-2">You have no new collaboration invitations.</p>
                </div>
            )}
        </div>
    );
}