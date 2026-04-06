import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Layout } from './components/Layout.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AgentsPage } from './pages/AgentsPage.js';
import { AgentDetailPage } from './pages/AgentDetailPage.js';
import { TasksPage } from './pages/TasksPage.js';
import { TaskDetailPage } from './pages/TaskDetailPage.js';
import { connectWebSocket } from './lib/ws.js';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 2000 } },
});

function WebSocketProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => connectWebSocket(queryClient), []);
  return <>{children}</>;
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WebSocketProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="agents" element={<AgentsPage />} />
              <Route path="agents/:id" element={<AgentDetailPage />} />
              <Route path="tasks" element={<TasksPage />} />
              <Route path="tasks/:id" element={<TaskDetailPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WebSocketProvider>
    </QueryClientProvider>
  );
}
