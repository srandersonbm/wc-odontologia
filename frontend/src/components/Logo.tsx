export function BeeMark({ size = 34 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" aria-hidden>
      <ellipse cx="16" cy="26" rx="12" ry="9.5" fill="var(--honey-soft)" />
      <ellipse cx="48" cy="26" rx="12" ry="9.5" fill="var(--honey-soft)" />
      <path
        d="M32 21c11 0 17.5 9 17.5 19S43 55 32 55 14.5 51 14.5 40 21 21 32 21Z"
        fill="var(--ink)"
      />
      <path d="M17 36c5-1.3 25-1.3 30 0" stroke="var(--honey)" strokeWidth="5" strokeLinecap="round" />
      <path d="M16 45c5-1.3 27-1.3 32 0" stroke="var(--honey)" strokeWidth="5" strokeLinecap="round" />
      <circle cx="26.5" cy="17" r="2.6" fill="var(--ink)" />
      <circle cx="37.5" cy="17" r="2.6" fill="var(--ink)" />
      <path d="M26.5 17c-2-5-5-7.5-8-8.5" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M37.5 17c2-5 5-7.5 8-8.5" stroke="var(--ink)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ size = 34, withWordmark = true }: { size?: number; withWordmark?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <BeeMark size={size} />
      {withWordmark && (
        <span className="leading-tight">
          <span
            className="block font-semibold tracking-tight text-[15px]"
            style={{ color: 'var(--ink)', fontFamily: 'var(--serif)' }}
          >
            WC Odontologia
          </span>
        </span>
      )}
    </div>
  );
}
