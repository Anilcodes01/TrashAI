
import Sidebar from './components/main/Sidebar';
import MainContent from './components/main/MainContent';

export default function DashboardPage() {
  return (
    <div className="flex h-screen bg-[#0e1117]">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <MainContent />
      </main>
    </div>
  );
}