import React from "react";

const PATHS: Record<string, React.ReactNode> = {
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  flag: <path d="M5 21V4m0 1c4-2.5 8 2.5 13 0v9c-5 2.5-9-2.5-13 0" />,
  spark: (
    <path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
  ),
  pencil: <path d="M4 20l4.5-.9L19.6 8a2.1 2.1 0 00-3-3L5.5 16.1 4 20zM14.5 6.5l3 3" />,
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M6.5 7l1 14h9l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  cloud: <path d="M7 18a5 5 0 01-.9-9.9A6.5 6.5 0 0118.6 9 4.3 4.3 0 0117.5 18H7z" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </>
  ),
  bolt: <path d="M13 2L4.5 13.5H11l-1 8.5L18.5 10H12l1-8z" />,
  chevD: <path d="M5 9l7 7 7-7" />,
  undo: <path d="M4 10h10a5 5 0 015 5 5 5 0 01-5 5H9M4 10l4.5-4.5M4 10l4.5 4.5" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5M12 7.5v.4" />
    </>
  ),
  tag: (
    <>
      <path d="M3 11V4a1 1 0 011-1h7l10 10-8 8L3 11z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
    </>
  ),
  layers: <path d="M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" />,
};

export function Icon({
  name,
  size = 16,
  className = "",
}: {
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`shrink-0 ${className}`}
      aria-hidden
    >
      {PATHS[name] ?? PATHS.info}
    </svg>
  );
}

/** The tally mark: four strokes, one diagonal. The brand itself. */
export function TallyGlyph({
  size = 24,
  className = "",
  verticals = "currentColor",
  diagonal = "var(--color-sun)",
}: {
  size?: number;
  className?: string;
  verticals?: string;
  diagonal?: string;
}) {
  return (
    <svg width={size} height={(size * 22) / 28} viewBox="0 0 28 22" fill="none" className={className} aria-hidden>
      <path d="M5 2.5v17M11 2.5v17M17 2.5v17M23 2.5v17" stroke={verticals} strokeWidth="2.6" strokeLinecap="round" />
      <path d="M1.5 18L26.5 4.5" stroke={diagonal} strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** A group of five tally strokes, drawn in on mount. */
function TallyFive({ delay = 0 }: { delay?: number }) {
  return (
    <svg width="30" height="24" viewBox="0 0 30 24" fill="none" aria-hidden>
      {[4, 10, 16, 22].map((x, i) => (
        <path
          key={x}
          d={`M${x} 3v18`}
          stroke="rgba(242,245,240,0.55)"
          strokeWidth="2.4"
          strokeLinecap="round"
          className="tally-stroke"
          style={{ animationDelay: `${delay + i * 0.05}s` }}
        />
      ))}
      <path
        d="M1 19.5L29 4.5"
        stroke="var(--color-sun)"
        strokeWidth="2.4"
        strokeLinecap="round"
        className="tally-stroke"
        style={{ animationDelay: `${delay + 0.22}s` }}
      />
    </svg>
  );
}

/** Renders `count` as tally-mark groups of five. */
export function TallyMarks({ count }: { count: number }) {
  const groups = Math.floor(count / 5);
  const rem = count % 5;
  if (count === 0) {
    return <span className="font-mono text-[11px] text-paper/30">no strokes yet — every five adds a diagonal</span>;
  }
  return (
    <div key={count} className="flex flex-wrap items-center gap-2.5">
      {Array.from({ length: groups }, (_, i) => (
        <TallyFive key={`g${i}`} delay={i * 0.1} />
      ))}
      {rem > 0 && (
        <svg width={rem * 6 + 4} height="24" viewBox={`0 0 ${rem * 6 + 4} 24`} fill="none" aria-hidden>
          {Array.from({ length: rem }, (_, i) => (
            <path
              key={i}
              d={`M${4 + i * 6} 3v18`}
              stroke="rgba(242,245,240,0.55)"
              strokeWidth="2.4"
              strokeLinecap="round"
              className="tally-stroke"
              style={{ animationDelay: `${groups * 0.1 + i * 0.05}s` }}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
