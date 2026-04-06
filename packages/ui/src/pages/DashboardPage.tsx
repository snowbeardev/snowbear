import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold">{value}</p>
    </div>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: api.getStats,
    refetchInterval: 5000,
  });

  if (isLoading || !stats) {
    return <p className="text-gray-500">Loading...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Agents" value={stats.agents.total} />
        <StatCard label="Running Agents" value={stats.agents.running} />
        <StatCard label="Total Tasks" value={stats.tasks.total} />
        <StatCard label="Pending Tasks" value={stats.tasks.pending} />
        <StatCard label="Running Tasks" value={stats.tasks.running} />
        <StatCard label="Completed Tasks" value={stats.tasks.done} />
        <StatCard label="Failed Tasks" value={stats.tasks.failed} />
      </div>
    </div>
  );
}
