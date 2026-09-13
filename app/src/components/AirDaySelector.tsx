import type { AirDay } from '@/types';

const days: AirDay[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const dayShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface AirDaySelectorProps {
  value: AirDay[];
  onChange: (days: AirDay[]) => void;
  disabled?: boolean;
}

export default function AirDaySelector({ value, onChange, disabled = false }: AirDaySelectorProps) {
  const toggleDay = (day: AirDay) => {
    if (value.includes(day)) {
      if (value.length <= 1) return;
      onChange(value.filter((d) => d !== day));
    } else {
      onChange([...value, day]);
    }
  };

  return (
    <div className="flex gap-1 flex-wrap">
      {days.map((day, i) => {
        const isSelected = value.includes(day);
        return (
          <button
            key={day}
            type="button"
            disabled={disabled}
            onClick={() => toggleDay(day)}
            className={`w-9 h-8 rounded-md text-[11px] font-semibold transition-all ${
              isSelected
                ? "bg-[#E50914] text-white"
                : "bg-white/[0.06] text-[#B3B3B3] hover:bg-white/[0.1]"
            } ${disabled ? "cursor-default" : "tap-active"}`}
          >
            {dayShort[i]}
          </button>
        );
      })}
    </div>
  );
}
