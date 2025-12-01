// Simple utility for offline caching

export const CACHE_KEYS = {
    USER_PROFILE: (userId: string) => `offline_user_${userId}`,
    HOUSEHOLD: (userId: string) => `offline_household_${userId}`,
    DASHBOARD_STATS: (householdId: string) => `offline_stats_${householdId}`,
    SHOPPING_LIST: (listId: string) => `offline_shopping_${listId}`,
    WISHLIST: (listId: string) => `offline_wishlist_${listId}`,
    LISTS_SUMMARY: (householdId: string, type: string) => `offline_lists_${householdId}_${type}`,
    FINANCE_DATA: (householdId: string) => `offline_finance_${householdId}`,
    FINANCE_CREDITS: (householdId: string) => `offline_credits_${householdId}`,
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
        // Optional: Check timestamp validity here if needed (e.g. expire after 7 days)
        return parsed.data as T;
    } catch (e) {
        return null;
    }
}