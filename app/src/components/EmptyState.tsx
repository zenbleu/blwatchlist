import React from 'react';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, description }) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    {icon && <div className="mb-4 text-[#555]">{icon}</div>}
    <h3 className="text-[#B3B3B3] font-medium text-sm">{title}</h3>
    {description && <p className="text-[#666] text-xs mt-1">{description}</p>}
  </div>
);

export default EmptyState;
