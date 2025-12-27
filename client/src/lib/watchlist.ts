const WATCHLIST_KEY = "telebit_watchlist";

export interface WatchlistEntry {
  address: string;
  label: string;
  addedAt: number;
  notes?: string;
}

export function getWatchlist(): WatchlistEntry[] {
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function addToWatchlist(entry: Omit<WatchlistEntry, "addedAt">): WatchlistEntry[] {
  const watchlist = getWatchlist();
  const normalizedAddress = entry.address.toLowerCase();
  
  const exists = watchlist.some(e => e.address.toLowerCase() === normalizedAddress);
  if (exists) {
    return watchlist;
  }

  const newEntry: WatchlistEntry = {
    ...entry,
    address: normalizedAddress,
    addedAt: Date.now()
  };

  const updated = [...watchlist, newEntry];
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
}

export function removeFromWatchlist(address: string): WatchlistEntry[] {
  const watchlist = getWatchlist();
  const normalizedAddress = address.toLowerCase();
  const updated = watchlist.filter(e => e.address.toLowerCase() !== normalizedAddress);
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
}

export function updateWatchlistEntry(address: string, updates: Partial<Pick<WatchlistEntry, "label" | "notes">>): WatchlistEntry[] {
  const watchlist = getWatchlist();
  const normalizedAddress = address.toLowerCase();
  const updated = watchlist.map(e => {
    if (e.address.toLowerCase() === normalizedAddress) {
      return { ...e, ...updates };
    }
    return e;
  });
  localStorage.setItem(WATCHLIST_KEY, JSON.stringify(updated));
  return updated;
}

export function isInWatchlist(address: string): boolean {
  const watchlist = getWatchlist();
  const normalizedAddress = address.toLowerCase();
  return watchlist.some(e => e.address.toLowerCase() === normalizedAddress);
}

export function getWatchlistEntry(address: string): WatchlistEntry | null {
  const watchlist = getWatchlist();
  const normalizedAddress = address.toLowerCase();
  return watchlist.find(e => e.address.toLowerCase() === normalizedAddress) || null;
}
