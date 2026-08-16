const AVATAR_COLORS = [
  '#0A84FF',
  '#5E5CE6',
  '#BF5AF2',
  '#FF375F',
  '#FF9F0A',
  '#30D158',
  '#64D2FF',
];

function initialsOf(name: string): string {
  const parts = name.trim().split(/[\s._-]+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hashOf(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Builds an initials avatar as an inline SVG data URI.
 * The account itself carries no avatar, so we generate one from the identity
 * rather than showing a stock photo of an unrelated person.
 */
export function generateAvatar(seed: string): string {
  const label = seed?.trim() || 'User';
  const color = AVATAR_COLORS[hashOf(label) % AVATAR_COLORS.length];
  const initials = initialsOf(label);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" rx="48" fill="${color}"/><text x="48" y="48" dy="0.35em" fill="#ffffff" font-family="-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" font-size="38" font-weight="600" text-anchor="middle">${initials}</text></svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
