import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api.js';
import { StatusBadge } from '../components/StatusBadge.js';

export function AgentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { data: agent, isLoading } = useQuery({
    queryKey: ['agents', id],
    queryFn: () => api.getAgent(id!),
    enabled: !!id,
    refetchInterval: 3000,
  });

  const action = useMutation({
    mutationFn: (act: string) => api.agentAction(id!, act),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['agents'] });
    },
  });

  if (isLoading || !agent) return <p className="text-gray-500">Loading...</p>;

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold">{agent.name}</h1>
        <StatusBadge status={agent.status} />
      </div>

      <div className="rounded-lg border bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm text-gray-500">ID</p>
          <p className="font-mono text-sm">{agent.id}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Adapter</p>
          <p>{agent.adapter}</p>
        </div>
        {agent.llm && (
          <div>
            <p className="text-sm text-gray-500">Model</p>
            <p>
              {agent.llm.provider}/{agent.llm.model}
            </p>
          </div>
        )}
        {agent.systemPrompt && (
          <div>
            <p className="text-sm text-gray-500">System Prompt</p>
            <pre className="mt-1 text-sm bg-gray-50 rounded p-3 whitespace-pre-wrap">
              {agent.systemPrompt}
            </pre>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <button
            onClick={() => action.mutate('start')}
            disabled={agent.status === 'running'}
            className="px-4 py-2 text-sm font-medium rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Start
          </button>
          <button
            onClick={() => action.mutate('stop')}
            disabled={agent.status === 'stopped'}
            className="px-4 py-2 text-sm font-medium rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Stop
          </button>
          <button
            onClick={() => action.mutate('restart')}
            className="px-4 py-2 text-sm font-medium rounded-md bg-gray-600 text-white hover:bg-gray-700"
          >
            Restart
          </button>
        </div>
      </div>
    </div>
  );
}
