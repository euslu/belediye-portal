export default function Button({
  children,
  variant = 'primary',
  color = 'blue',
  className = '',
  type = 'button',
  ...props
}) {
  const base = variant === 'soft'
    ? 'portal-soft-btn'
    : variant === 'pill'
      ? 'portal-pill-btn'
      : `portal-cta-btn portal-cta-btn--${color}`;

  return (
    <button
      type={type}
      className={`${base} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
