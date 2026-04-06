import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { StatusBadge } from '../components/StatusBadge.js';

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: task, isLoading } = useQuery({
    queryKey: ['tasks', id],
    queryFn: () => api.getTask(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  if (isLoading || !task) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{task.description}</h1>
        <StatusBadge status={task.status} />
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm text-gray-500">ID</p>
          <p className="font-mono text-sm">{task.id}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Channel</p>
          <p>{task.source.channel}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Created</p>
          <p>{new Date(task.createdAt).toLocaleString()}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Updated</p>
          <p>{new Date(task.updatedAt).toLocaleString()}</p>
        </div>
        {task.result !== undefined && (
          <div>
            <p className="text-sm text-gray-500">Result</p>
            <pre className="mt-1 text-sm bg-gray-50 rounded p-3 whitespace-pre-wrap">
              {typeof task.result === 'string' ? task.result : JSON.stringify(task.result, null, 2)}
            </pre>
          </div>
        )}
        {task.error && (
          <div>
            <p className="text-sm text-red-500">Error</p>
            <pre className="mt-1 text-sm bg-red-50 text-red-700 rounded p-3 whitespace-pre-wrap">
              {task.error}
            </pre>
          </div>
        )}
      </div>

      {task.subtasks && task.subtasks.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold mb-3">Subtasks</h2>
          <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {task.subtasks.map((sub) => (
                  <tr key={sub.id}>
                    <td className="px-6 py-4 text-sm">{sub.description}</td>
                    <td className="px-6 py-4">
                      <StatusBadge status={sub.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
