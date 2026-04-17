export default function FilterTabs({
  tabs,
  value,
  onChange,
  getCount,
  className = '',
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {tabs.map((tab) => {
        const active = value === tab.key;
        const count = getCount ? getCount(tab.key) : null;
        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onChange(tab.key)}
            className={`portal-pill-btn text-sm ${active ? 'portal-pill-btn--active' : ''}`}
          >
            {tab.label}
            {count !== null && count !== undefined && (
              <span className={`text-xs rounded-full min-w-[20px] px-1.5 py-0.5 leading-none font-semibold text-center ${active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
