// Tracks issues this client just edited, so the "remote change" pulse skips our own writes.
const recent = new Set<string>();

export function markLocalEdit(id: string) {
  recent.add(id);
  setTimeout(() => recent.delete(id), 1500);
}

export function wasLocalEdit(id: string) {
  return recent.has(id);
}
