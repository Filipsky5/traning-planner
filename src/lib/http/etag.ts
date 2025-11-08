import { createHash } from "node:crypto";

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
 * const etag = computeEtag(data);
 * // etag = "a3b5c7d9e1f2..."
 */
export function computeEtag(value: unknown): string {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  const hash = createHash("sha256").update(json).digest("hex");
  return `"${hash}"`; // strong ETag (w cudzysłowie zgodnie ze standardem HTTP)
}
