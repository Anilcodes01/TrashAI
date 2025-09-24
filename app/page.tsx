
import Sidebar from './components/main/Sidebar';
import MainContent from './components/main/MainContent';

export default function DashboardPage() {
  return (
    <div className="flex h-full bg-zinc-900">
      <Sidebar />
      <main className="flex-1 bg-zinc-900 mt-16 overflow-y-auto">
        <MainContent />
      </main>
    </div>
  );
}