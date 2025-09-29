import Sidebar from './components/main/Sidebar';
import RecentTasks from './components/main/RecentTasksGrid'; // Import the new component

export default async function DashboardPage() {
  return (
    <div className="flex h-full bg-zinc-900">
      <Sidebar />
      <main className="flex-1 bg-zinc-900 mt-16 overflow-y-auto">
        <div>
          <RecentTasks />
        </div>
      </main>
    </div>
  );
}