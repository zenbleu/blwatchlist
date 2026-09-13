import React from 'react';
import type { Status } from '@/types';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { bg: string; text: string; label: string }> = {
  COMPLETE: { bg: 'bg-green-500/20', text: 'text-green-400', label: 'Completed' },
  ONGOING: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Ongoing' },
  DROPPED: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Dropped' },
  PLANNED: { bg: 'bg-purple-500/20', text: 'text-purple-400', label: 'Planned' }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

export default StatusBadge;
