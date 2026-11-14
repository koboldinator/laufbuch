const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };

export const Plus = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" {...base}><path d="M9 2v14M2 9h14" /></svg>
);
export const Chevron = ({ dir = 'right', size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" {...base} style={{ transform: dir === 'left' ? 'rotate(180deg)' : undefined }}>
    <path d="M6 3l5 5-5 5" />
  </svg>
);
export const Check = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" {...base} strokeWidth="2"><path d="M2.5 7.5l3 3 6-7" /></svg>
);
export const Close = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" {...base}><path d="M3 3l10 10M13 3L3 13" /></svg>
);
export const Gear = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" {...base} strokeWidth="1.4">
    <circle cx="10" cy="10" r="2.6" />
    <path d="M10 1.8v2.4M10 15.8v2.4M1.8 10h2.4M15.8 10h2.4M4.2 4.2l1.7 1.7M14.1 14.1l1.7 1.7M4.2 15.8l1.7-1.7M14.1 5.9l1.7-1.7" />
  </svg>
);
export const Dumbbell = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 20 20" {...base} strokeWidth="1.4"><path d="M2 10h16M5 6v8M15 6v8M2.5 8v4M17.5 8v4" /></svg>
);
export const Spark = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" {...base} strokeWidth="1.1"><path d="M9 1v16M1 9h16M3.3 3.3l11.4 11.4M14.7 3.3L3.3 14.7" /></svg>
);
export const Upload = ({ size = 22 }) => (
  <svg width={size} height={size} viewBox="0 0 22 22" {...base} strokeWidth="1.4"><path d="M11 14V3M6.5 7.5L11 3l4.5 4.5M3 14v3.5A1.5 1.5 0 0 0 4.5 19h13a1.5 1.5 0 0 0 1.5-1.5V14" /></svg>
);
export const Arrow = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 14 14" {...base}><path d="M4 10L10 4M5 4h5v5" /></svg>
);
