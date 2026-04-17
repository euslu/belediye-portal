export default function Surface({
  children,
  className = '',
  soft = false,
}) {
  return (
    <div className={`portal-surface ${soft ? 'portal-surface--soft' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}
