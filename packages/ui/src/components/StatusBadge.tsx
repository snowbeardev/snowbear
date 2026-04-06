const colors: Record<string, string> = {
  running: 'bg-green-100 text-green-800',
  stopped: 'bg-gray-100 text-gray-600',
  starting: 'bg-yellow-100 text-yellow-800',
  stopping: 'bg-yellow-100 text-yellow-800',
  error: 'bg-red-100 text-red-800',
  pending: 'bg-blue-100 text-blue-800',
  done: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}
    >
      {status}
    </span>
  );
}
