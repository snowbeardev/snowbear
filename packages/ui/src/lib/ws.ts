import type { QueryClient } from '@tanstack/react-query';

export function connectWebSocket(queryClient: QueryClient): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data) as { type: string };
      if (data.type.startsWith('agent:')) {
        void queryClient.invalidateQueries({ queryKey: ['agents'] });
        void queryClient.invalidateQueries({ queryKey: ['stats'] });
      }
      if (data.type.startsWith('task:')) {
        void queryClient.invalidateQueries({ queryKey: ['tasks'] });
        void queryClient.invalidateQueries({ queryKey: ['stats'] });
      }
    } catch {
      // ignore
    }
  };

  return () => ws.close();
}
