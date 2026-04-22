export default function PageHeader({
  icon,
  title,
  description,
  meta,
  actions,
  className = '',
}) {
  return (
    <div className={`flex flex-col gap-4 md:flex-row md:items-center md:justify-between ${className}`.trim()}>
      <div className="min-w-0">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-50 via-white to-blue-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shadow-sm">
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-800 leading-tight m-0">{title}</h1>
            {description && <p className="text-sm text-slate-500 mt-1 m-0">{description}</p>}
            {meta && <div className="text-xs text-slate-400 mt-2">{meta}</div>}
          </div>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap md:justify-end">{actions}</div>}
    </div>
  );
}
