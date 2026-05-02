interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
}

export default function ProgressBar({ value, color = 'var(--primary-dark)', height = 6 }: ProgressBarProps) {
  return (
    <div className="progress-track" style={{ height }}>
      <div
        className="progress-fill"
        style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color, height }}
      />
    </div>
  );
}
