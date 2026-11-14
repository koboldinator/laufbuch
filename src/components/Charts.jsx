import { fmtShort } from '../lib/dates.js';

// Balken: Plan (hell) gegen Ist (dunkel), aktuelle Woche blau
export function VolumeChart({ data, currentMonday, height = 140 }) {
  const max = Math.max(10, ...data.map((d) => Math.max(d.plan, d.ist))) * 1.08;
  const n = data.length;
  const w = 100 / n;
  return (
    <div>
      <svg className="chart" viewBox="0 0 100 50" preserveAspectRatio="none" style={{ height }} role="img"
        aria-label={`Wochenumfang Plan gegen Ist, letzte ${n} Wochen`}>
        {data.map((d, i) => {
          const hp = (d.plan / max) * 50;
          const hi = (d.ist / max) * 50;
          const cur = d.monday === currentMonday;
          return (
            <g key={d.monday}>
              <rect x={i * w + w * 0.15} y={50 - hp} width={w * 0.34} height={hp} fill="rgba(20,20,22,0.1)" />
              <rect x={i * w + w * 0.53} y={50 - hi} width={w * 0.34} height={hi} fill={cur ? '#2F5BD8' : d.monday > currentMonday ? 'transparent' : '#141416'} />
            </g>
          );
        })}
      </svg>
      <div className="chart-x" style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))`, marginTop: 6 }}>
        {data.map((d, i) => (
          <span key={d.monday} style={d.monday === currentMonday ? { color: '#141416', fontWeight: 500 } : undefined}>
            {n <= 10 || d.monday === currentMonday || (n - 1 - i) % 2 === 0 ? fmtShort(d.monday).replace(/\.$/, '') : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

// Linie. invert = kleinere Werte oben (z. B. Pace)
export function LineChart({ data, color = '#2F5BD8', height = 100, invert = false, fill = true, label = 'Verlauf' }) {
  const pts = data.map((d, i) => ({ i, v: d.value })).filter((p) => p.v != null);
  if (pts.length < 1) return <p className="empty-note">Noch keine passenden Läufe.</p>;
  const vals = pts.map((p) => p.v);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1e-6) {
    min -= 1;
    max += 1;
  }
  const pad = (max - min) * 0.15;
  min -= pad;
  max += pad;
  const n = data.length;
  const x = (i) => (n === 1 ? 50 : (i / (n - 1)) * 100);
  const y = (v) => {
    const t = (v - min) / (max - min);
    return invert ? 4 + t * 32 : 36 - t * 32;
  };
  const line = pts.map((p) => `${x(p.i).toFixed(2)},${y(p.v).toFixed(2)}`).join(' ');
  const area = `${line} ${x(pts[pts.length - 1].i).toFixed(2)},40 ${x(pts[0].i).toFixed(2)},40`;
  return (
    <svg className="chart" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ height }} role="img" aria-label={label}>
      {fill && pts.length > 1 && <polygon points={area} fill={color} opacity="0.12" />}
      {pts.length > 1 && <polyline points={line} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />}
      {pts.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r="1.1" fill={color} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function SmallBars({ data, color = '#3A3833', height = 90, target, label = 'Balken' }) {
  const max = Math.max(target || 0, 1, ...data.map((d) => d.value || 0)) * 1.1;
  const n = data.length;
  const w = 100 / n;
  return (
    <svg className="chart" viewBox="0 0 100 40" preserveAspectRatio="none" style={{ height }} role="img" aria-label={label}>
      {target ? <line x1="0" x2="100" y1={40 - (target / max) * 40} y2={40 - (target / max) * 40} stroke="rgba(20,20,22,0.25)" strokeDasharray="2 2" vectorEffect="non-scaling-stroke" /> : null}
      {data.map((d, i) => {
        const h = ((d.value || 0) / max) * 40;
        return <rect key={i} x={i * w + w * 0.2} y={40 - h} width={w * 0.6} height={h} rx="0.8" fill={color} />;
      })}
    </svg>
  );
}
