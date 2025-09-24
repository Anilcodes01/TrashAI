import Sidebar from "../components/main/Sidebar";
import { getPendingInvitationCount } from "../actions/InvitationActions";

export default  async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    const invitationCount = await getPendingInvitationCount();

  return (
    // This div takes the full height of its parent (the padded <main> tag).
    <div className="flex bg-zinc-900 h-full">
        <Sidebar initialInvitationCount={invitationCount} />
      {/* This main area will fill the remaining space and handle its own scrolling. */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}