// /app/inbox/page.tsx
import { getInvitations } from "@/app/actions/InvitationActions";
import { InvitationCard } from "@/app/components/Inbox/InvitationCard";

export default async function Inbox() {
  const invitations = await getInvitations();

  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-20 px-4">
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-2">Your Invitations</h1>
        <p className="text-gray-400 mb-8">Accept invitations to start collaborating on new lists.</p>
      </div>
      
      <div className="flex flex-col items-center gap-4 w-full">
        {invitations.length > 0 ? (
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
    </div>
  );
}