import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { StatusBadge } from '../components/StatusBadge.js';

const STATUS_FILTERS = ['all', 'pending', 'running', 'done', 'failed'] as const;

export function TasksPage() {
  const [filter, setFilter] = useState<string>('all');
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', filter],
    queryFn: () => api.getTasks(filter === 'all' ? undefined : filter),
    refetchInterval: 5000,
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Tasks</h1>
      <div className="flex gap-2 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
              filter === s
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Description
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Channel
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Created
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {tasks?.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/tasks/${task.id}`} className="font-medium text-blue-600 hover:underline">
                    {task.description}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{task.source.channel}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={task.status} />
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {new Date(task.createdAt).toLocaleString()}
                </td>
              </tr>
            ))}
            {tasks?.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
