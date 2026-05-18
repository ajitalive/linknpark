// Shared mutable cache state — imported by both useApi and useAuth
// to avoid a circular dependency.

export const cache = {
  token: null as string | null,
  stickers: null as any[] | null,
  incidents: null as any[] | null,
  stickersFetchedAt: 0,
  incidentsFetchedAt: 0,
};

export function clearApiCache() {
  cache.token = null;
  cache.stickers = null;
  cache.incidents = null;
  cache.stickersFetchedAt = 0;
  cache.incidentsFetchedAt = 0;
}
