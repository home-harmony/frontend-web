const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ParsedInviteLink {
  readonly familyId: string;
  readonly token: string;
}

export function parseInviteInput(raw: string): ParsedInviteLink | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  if (trimmed.includes('familyId=') || trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('/')) {
    try {
      const parsedUrl = trimmed.startsWith('http://') || trimmed.startsWith('https://')
        ? new URL(trimmed)
        : new URL(trimmed.startsWith('/') ? `https://local.invalid${trimmed}` : `https://local.invalid/${trimmed}`);
      const familyId = parsedUrl.searchParams.get('familyId')?.trim() ?? '';
      const token = parsedUrl.searchParams.get('token')?.trim() ?? '';
      if (UUID_PATTERN.test(familyId) && UUID_PATTERN.test(token)) {
        return { familyId, token };
      }
    } catch {
      return null;
    }
  }

  const pairMatch = /^([0-9a-f-]{36})[:/]([0-9a-f-]{36})$/i.exec(trimmed);
  if (pairMatch && UUID_PATTERN.test(pairMatch[1]) && UUID_PATTERN.test(pairMatch[2])) {
    return { familyId: pairMatch[1], token: pairMatch[2] };
  }

  return null;
}
