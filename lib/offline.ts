// --- CACHE CONSTANTS & UTILITIES ---

export const CACHE_KEYS = {
    USER_PROFILE: (userId: string) => `offline_user_${userId}`,
    HOUSEHOLD: (userId: string) => `offline_household_${userId}`,
    DASHBOARD_STATS: (householdId: string) => `offline_stats_${householdId}`,
    SHOPPING_LIST: (listId: string) => `offline_shopping_${listId}`,
    WISHLIST: (listId: string) => `offline_wishlist_${listId}`,
    LISTS_SUMMARY: (householdId: string, type: string) => `offline_lists_${householdId}_${type}`,
    FINANCE_DATA: (householdId: string) => `offline_finance_${householdId}`,
    FINANCE_CREDITS: (householdId: string) => `offline_credits_${householdId}`,

    // ⚡ ADDED: The missing key for Dashboard caching
    MEMBER_COUNT: (householdId: string) => `offline_member_count_${householdId}`,
};

export function saveToCache(key: string, data: any) {
    if (typeof window === 'undefined') return;
    try {
        localStorage.setItem(key, JSON.stringify({
            timestamp: Date.now(),
            data: data
        }));
    } catch (e) {
        console.warn("Cache quota exceeded", e);
    }
}

export function loadFromCache<T>(key: string): T | null {
    if (typeof window === 'undefined') return null;
    try {
        const item = localStorage.getItem(key);
        if (!item) return null;
        const parsed = JSON.parse(item);

        // Optional: You could add logic here to ignore cache if > 7 days old
        // if (Date.now() - parsed.timestamp > 7 * 24 * 60 * 60 * 1000) return null;

        return parsed.data as T;
    } catch (e) {
        return null;
    }
}

// --- SETTINGS VIEW HELPERS ---

export const getCacheSize = (): string => {
    if (typeof window === 'undefined') return "0 KB";
    try {
        let total = 0;
        for (const x in localStorage) {
            if (localStorage.hasOwnProperty(x)) {
                total += (localStorage[x].length + x.length) * 2;
            }
        }
        return (total / 1024).toFixed(2) + " KB";
    } catch (e) {
        return "0 KB";
    }
};

export const clearCache = async (): Promise<void> => {
    if (typeof window === 'undefined') return;
    try {
        const keysToRemove: string[] = [];
        for (const key in localStorage) {
            // Clear both legacy keys and new offline keys
            if (key.startsWith('listner_') || key.startsWith('offline_')) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        if ('caches' in window) {
            const keys = await caches.keys();
            await Promise.all(keys.map(key => caches.delete(key)));
        }
    } catch (e) {
        console.error("Error clearing cache", e);
    }
};
