export function formatAge(iso) {
  const start = new Date(iso).getTime();
  if (Number.isNaN(start)) return "-";

  const diffSec = Math.floor((Date.now() - start) / 1000);
  const sec = Math.max(0, diffSec);

  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (d > 0) return `${d}d ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
