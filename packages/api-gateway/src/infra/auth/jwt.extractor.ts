/**
 * Extract JWT from Authorization header
 * Format: "Bearer <token>"
 * Handles duplicate headers (comma-separated) from Swagger UI
 */

export function extractJwtFromHeader(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }

  // Swagger UI may send duplicate headers: "Bearer token1, Bearer token2"
  // Take the first valid token
  const candidates = authHeader.split(',').map(h => h.trim());

  for (const candidate of candidates) {
    const parts = candidate.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      return parts[1];
    }
  }

  return null;
}
