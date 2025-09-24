
import Sidebar from './components/main/Sidebar';
import MainContent from './components/main/MainContent';
import { getPendingInvitationCount } from './actions/InvitationActions';

export async function DashboardPage() {

    const invitationCount = await getPendingInvitationCount();
  return (
    <div className="flex h-full bg-zinc-900">
      <Sidebar initialInvitationCount={invitationCount} />
      <main className="flex-1 bg-zinc-900 mt-16 overflow-y-auto">
        <MainContent />
      </main>
    </div>
  );
}