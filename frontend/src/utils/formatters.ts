export function formatShortAddress(address: string | null | undefined, fallback = '—'): string {
  if (!address || typeof address !== 'string') return fallback;
  const trimmed = address.trim();
  if (!trimmed) return fallback;
  if (trimmed.length < 10) return trimmed;
  return `${trimmed.slice(0, 6)}...${trimmed.slice(-4)}`;
}