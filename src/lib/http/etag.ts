/**
 * Generuje ETag (entity tag) dla podanej wartości używając SHA-256.
 * ETag służy do cache'owania HTTP - pozwala klientowi sprawdzić czy zasób się zmienił.
 *
 * Analogia do iOS: Podobne do używania hashValue/Hashable w Swift dla porównywania
 * czy dane się zmieniły (np. w diffable data sources).
 *
 * @param value - Wartość do zahashowania (obiekt zostanie przekonwertowany na JSON)
 * @returns Strong ETag w formacie: "hash" (np. "a3b5c7...")
 *
 * @example
 * const data = [{ id: 1, name: "Easy Run" }];
 * const etag = await computeEtag(data);
 * // etag = "a3b5c7d9e1f2..."
 */
export async function computeEtag(value: unknown): Promise<string> {
  const json = typeof value === "string" ? value : JSON.stringify(value);

  // Use Web Crypto API (compatible with Cloudflare Workers)
  const encoder = new TextEncoder();
  const data = encoder.encode(json);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert ArrayBuffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return `"${hash}"`; // strong ETag (w cudzysłowie zgodnie ze standardem HTTP)
}
