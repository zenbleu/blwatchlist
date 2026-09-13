import React from 'react';
import { formatRating } from '@/lib/rating';

interface RatingCircleProps {
  rating: number;
  size?: number;
}

const RatingCircle: React.FC<RatingCircleProps> = ({ rating, size = 32 }) => {
  const percentage = (rating / 10) * 100;
  const color = rating >= 9 ? '#22c55e' : rating >= 7 ? '#eab308' : rating >= 5 ? '#f97316' : '#ef4444';
  
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={size/2 - 2} fill="none" stroke="#333" strokeWidth="2" />
        <circle
          cx={size/2} cy={size/2} r={size/2 - 2}
          fill="none" stroke={color} strokeWidth="2"
          strokeDasharray={`${percentage * 2 * Math.PI * (size/2 - 2) / 100} ${2 * Math.PI * (size/2 - 2)}`}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-[10px] font-bold" style={{ color }}>
        {formatRating(rating)}
      </span>
    </div>
  );
};

export default RatingCircle;
