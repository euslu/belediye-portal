export default function LoadingState({
  title = 'Yükleniyor...',
  description,
  compact = false,
}) {
  return (
    <div className={`portal-empty-state ${compact ? 'min-h-[160px] p-6' : ''}`.trim()}>
      <div className="portal-spinner" />
      <div>
        <p className="text-base font-semibold text-slate-800 m-0">{title}</p>
        {description && <p className="text-sm text-slate-500 mt-2 m-0">{description}</p>}
      </div>
    </div>
  );
}
