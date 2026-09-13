type SpinnerProps = {
  className?: string;
  label?: string;
};

export default function Spinner({ className = "", label }: SpinnerProps) {
  return (
    <span className="inline-flex items-center gap-2">
      <span
        role="status"
        aria-label={label ?? "Loading"}
        className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600 ${className}`}
      />
      {label ? (
        <span className="text-sm text-slate-600">{label}</span>
      ) : null}
    </span>
  );
}
