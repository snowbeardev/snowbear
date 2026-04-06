import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { StatusBadge } from '../components/StatusBadge.js';

export function AgentsPage() {
  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: api.getAgents,
    refetchInterval: 5000,
  });

  if (isLoading) return <p className="text-gray-500">Loading...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agents</h1>
      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Adapter
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Model
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {agents?.map((agent) => (
              <tr key={agent.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <Link to={`/agents/${agent.id}`} className="font-medium text-blue-600 hover:underline">
                    {agent.name}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{agent.adapter}</td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {agent.llm ? `${agent.llm.provider}/${agent.llm.model}` : '-'}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={agent.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
