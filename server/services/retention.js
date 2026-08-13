export function getTrashExpiry(deletedAt = new Date().toISOString()) {
  return new Date(new Date(deletedAt).getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
}

export function getCodeExpiry(detectedAt = new Date().toISOString()) {
  return new Date(new Date(detectedAt).getTime() + 60 * 60 * 1000).toISOString();
}
