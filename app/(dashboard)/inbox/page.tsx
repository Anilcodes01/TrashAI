import { InvitationList } from "@/app/components/Inbox/InvitationList";

export default function Inbox() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen pt-20 px-4">
      <div className="w-full max-w-4xl text-center">
        <h1 className="text-4xl font-bold mb-2">Your Invitations</h1>
        <p className="text-gray-400 mb-8">Accept invitations to start collaborating on new lists.</p>
      </div>
      <InvitationList />
    </div>
  );
}