export default function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}) {
  return (
    <div className={`portal-empty-state ${compact ? 'min-h-[160px] p-6' : ''}`.trim()}>
      {icon && <div className="text-4xl text-slate-300">{icon}</div>}
      <div>
        <p className="text-base font-semibold text-slate-800 m-0">{title}</p>
        {description && <p className="text-sm text-slate-500 mt-2 m-0">{description}</p>}
      </div>
      {action}
    </div>
  );
}
