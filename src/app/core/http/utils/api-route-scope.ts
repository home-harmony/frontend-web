function normalizeBaseUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export function isApiRequest(url: string, apiUrl: string): boolean {
  const base = normalizeBaseUrl(apiUrl);
  if (!url.startsWith(base)) {
    return false;
  }
  const nextChar = url.charAt(base.length);
  return nextChar === '' || nextChar === '/' || nextChar === '?';
}

export function extractApiRelativePath(url: string, apiUrl: string): string | null {
  if (!isApiRequest(url, apiUrl)) {
    return null;
  }
  const base = normalizeBaseUrl(apiUrl);
  const rest = url.slice(base.length);
  const withoutQuery = rest.split(/[?#]/, 1)[0] ?? '';
  if (!withoutQuery || withoutQuery === '/') {
    return '/';
  }
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`;
}

export function isIdentityOnlyRoute(method: string, relativePath: string): boolean {
  const upperMethod = method.toUpperCase();
  if (upperMethod === 'GET' && relativePath === '/profile/families') {
    return true;
  }
  if (upperMethod === 'POST' && relativePath === '/families') {
    return true;
  }
  if (upperMethod === 'POST' && /^\/families\/[^/]+\/members$/.test(relativePath)) {
    return true;
  }
  return false;
}

export function requiresFamilyHeader(method: string, url: string, apiUrl: string): boolean {
  const relativePath = extractApiRelativePath(url, apiUrl);
  if (!relativePath) {
    return false;
  }
  return !isIdentityOnlyRoute(method, relativePath);
}
