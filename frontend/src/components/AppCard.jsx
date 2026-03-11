export default function AppCard({ title, description, icon, href, onClick }) {
  const base =
    'group flex flex-col items-start gap-3 bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200 transition cursor-pointer text-left w-full';

  const content = (
    <>
      <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center text-2xl group-hover:bg-blue-100 transition">
        {icon}
      </div>
      <div>
        <h3 className="font-semibold text-gray-800 text-sm">{title}</h3>
        {description && <p className="text-xs text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="mt-auto">
        <span className="text-xs font-medium text-blue-700 group-hover:underline">Aç →</span>
      </div>
    </>
  );

  if (href) {
    return (
      <a className={base} href={href} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    );
  }

  return (
    <button className={base} onClick={onClick}>
      {content}
    </button>
  );
}
