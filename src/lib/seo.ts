export const SITE_URL = 'https://nextradev.com';
export const SITE_NAME = 'Nextradev Technologies LLP';
export const DEFAULT_DESCRIPTION =
  'Nextradev Technologies LLP builds web, mobile, and custom software solutions for modern businesses.';
export const DEFAULT_IMAGE = `${SITE_URL}/logo.png`;

export function normalizePath(path: string) {
  if (!path) return '/';
  if (path === '/') return '/';
  return path.endsWith('/') ? path.slice(0, -1) : path;
}
