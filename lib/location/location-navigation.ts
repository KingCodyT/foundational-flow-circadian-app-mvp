const returnPaths = new Set(['/today', '/food', '/timeline']);

// A return URL is navigation state, never permission to leave the app.
export function locationReturnPath(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048 || /[\\\u0000-\u0020]/.test(value)) return null;
  if (!value.startsWith('/') || value.startsWith('//')) return null;
  try {
    const url = new URL(value, 'https://circadian.invalid');
    if (url.origin !== 'https://circadian.invalid' || !returnPaths.has(url.pathname)) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return null; }
}

export function locationSetupHref(asPath: string, section?: string): string {
  const source = section ? `${asPath.split('#')[0]}#${section}` : asPath;
  const returnTo = locationReturnPath(source) || '/today';
  return `/profile?edit=location&returnTo=${encodeURIComponent(returnTo)}#profile-location`;
}

export function locationReturnLabel(path: string): string {
  return path.startsWith('/food') ? 'Food' : path.startsWith('/timeline') ? 'Timeline' : 'Today';
}
