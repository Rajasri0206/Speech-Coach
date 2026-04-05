import { cn } from "@/lib/utils";

interface ScoreGaugeProps {
  score: number | null | undefined;
  label: string;
  size?: "sm" | "md" | "lg";
  className?: string;
  colorClass?: string;
}

export function ScoreGauge({ score, label, size = "md", className, colorClass = "text-primary" }: ScoreGaugeProps) {
  const displayScore = score ?? 0;
  const radius = size === "sm" ? 24 : size === "md" ? 40 : 60;
  const stroke = size === "sm" ? 4 : size === "md" ? 6 : 8;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-36 h-36"
  };

  const textClasses = {
    sm: "text-sm",
    md: "text-xl",
    lg: "text-3xl"
  };

  const labelClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base"
  };

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div className={cn("relative flex items-center justify-center", sizeClasses[size])}>
        <svg
          height={radius * 2}
          width={radius * 2}
          className="absolute -rotate-90 transform"
        >
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className="text-muted"
          />
          <circle
            stroke="currentColor"
            fill="transparent"
            strokeWidth={stroke}
            strokeDasharray={circumference + " " + circumference}
            style={{ strokeDashoffset }}
            strokeLinecap="round"
            r={normalizedRadius}
            cx={radius}
            cy={radius}
            className={cn("transition-all duration-1000 ease-in-out", colorClass)}
          />
        </svg>
        <div className={cn("font-bold tracking-tighter absolute flex items-center justify-center text-foreground", textClasses[size])}>
          {score !== null && score !== undefined ? Math.round(score) : "-"}
        </div>
      </div>
      <span className={cn("font-medium text-muted-foreground", labelClasses[size])}>{label}</span>
    </div>
  );
}
