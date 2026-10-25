export default function LifeGridMark({ className = "" }) {
  return (
    <span className={`lifegrid-mark ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 36 36" fill="none">
        <rect x="4" y="4" width="8" height="8" rx="2" fill="currentColor" />
        <rect x="14" y="4" width="8" height="8" rx="2" fill="currentColor" opacity=".72" />
        <rect x="24" y="4" width="8" height="8" rx="2" fill="currentColor" opacity=".42" />
        <rect x="4" y="14" width="8" height="8" rx="2" fill="currentColor" opacity=".72" />
        <rect x="14" y="14" width="8" height="8" rx="2" fill="#f8bd67" />
        <rect x="24" y="14" width="8" height="8" rx="2" fill="currentColor" opacity=".72" />
        <rect x="4" y="24" width="8" height="8" rx="2" fill="currentColor" opacity=".42" />
        <rect x="14" y="24" width="8" height="8" rx="2" fill="currentColor" opacity=".72" />
        <rect x="24" y="24" width="8" height="8" rx="2" fill="currentColor" />
      </svg>
    </span>
  );
}
