import { memo } from "react";
import { Film } from "lucide-react";

interface PosterProps {
  src: string | null;
  title: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "w-[50px] h-[67px]",
  md: "w-[60px] h-[80px]",
  lg: "w-[80px] h-[107px]",
};

const Poster = memo(function Poster({ src, title, className = "", size = "md" }: PosterProps) {
  if (!src) {
    return (
      <div
        className={`${sizeMap[size]} rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0 ${className}`}
      >
        <Film className="w-5 h-5 text-[#666]" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title}
      className={`${sizeMap[size]} rounded-lg object-cover flex-shrink-0 ${className}`}
      loading="lazy"
      decoding="async"
      onError={(e) => {
        (e.target as HTMLImageElement).style.display = 'none';
      }}
    />
  );
});

export default Poster;
