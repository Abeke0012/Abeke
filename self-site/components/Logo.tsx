type LogoProps = {
  className?: string;
  /** Show the "BURGERS" line under the wordmark. */
  withTagline?: boolean;
};

export function Star({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M12 1.5l3.09 6.83 7.41.8-5.53 5.02 1.55 7.35L12 17.77 5.48 21.5l1.55-7.35L1.5 9.13l7.41-.8z"
      />
    </svg>
  );
}

/** SELF wordmark: heavy white letters, red star, optional BURGERS line. */
export default function Logo({ className = "", withTagline = false }: LogoProps) {
  return (
    <span className={`inline-flex flex-col items-center leading-none ${className}`} aria-label="SELF Burgers">
      <span className="relative inline-flex items-start font-display font-black tracking-[-0.04em]">
        SELF
        <Star className="ml-[0.06em] mt-[0.02em] h-[0.34em] w-[0.34em] text-brand" />
      </span>
      {withTagline && (
        <span className="mt-[0.18em] font-display text-[0.2em] font-bold tracking-[0.42em] text-brand">
          BURGERS
        </span>
      )}
    </span>
  );
}
