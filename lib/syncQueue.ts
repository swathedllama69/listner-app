import { supabase } from "@/lib/supabase";

export type SyncAction = {
    id: string;
    type: 'ADD_SHOPPING_ITEM' | 'ADD_WISHLIST_ITEM' | 'ADD_EXPENSE' | 'ADD_CREDIT';
    payload: any;
    timestamp: number;
    householdId: string;
};

const QUEUE_KEY = 'offline_sync_queue';

export const SyncQueue = {
    getQueue: (): SyncAction[] => {
        if (typeof window === 'undefined') return [];
        try {
            const item = localStorage.getItem(QUEUE_KEY);
            return item ? JSON.parse(item) : [];
        } catch { return []; }
    },

    add: (action: Omit<SyncAction, 'id' | 'timestamp'>) => {
        const queue = SyncQueue.getQueue();
        const newAction: SyncAction = {
            ...action,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
        };
        queue.push(newAction);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
        console.log(`[Offline] Action queued: ${action.type}`);
        return newAction;
    },

    remove: (id: string) => {
        const queue = SyncQueue.getQueue().filter(a => a.id !== id);
        localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    },

    process: async () => {
        if ((window as any).__isSyncing) return;
        (window as any).__isSyncing = true;

        const queue = SyncQueue.getQueue();
        if (queue.length === 0) {
            (window as any).__isSyncing = false;
            return;
        }

        console.log(`🔄 Processing ${queue.length} offline actions...`);

        for (const action of queue) {
            try {
                let error = null;
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { id: tempId, ...cleanPayload } = action.payload;

                switch (action.type) {
                    case 'ADD_SHOPPING_ITEM':
                        ({ error } = await supabase.from('shopping_items').insert(cleanPayload));
                        break;
                    case 'ADD_WISHLIST_ITEM':
                        ({ error } = await supabase.from('wishlist_items').insert(cleanPayload));
                        break;
                    case 'ADD_EXPENSE':
                        ({ error } = await supabase.from('expenses').insert(cleanPayload));
                        break;
                    case 'ADD_CREDIT':
                        ({ error } = await supabase.from('credits').insert(cleanPayload));
                        break;
                }

                if (error) {
                    console.error(`❌ Sync failed for action ${action.id}:`, JSON.stringify(error));

                    // CRITICAL: Check if it's a network error. If so, STOP processing to preserve queue order.
                    const errMsg = error.message?.toLowerCase() || "";
                    if (errMsg.includes("fetch") || errMsg.includes("network") || errMsg.includes("failed")) {
                        console.warn("⚠️ Network error detected during sync. Pausing.");
                        (window as any).__isSyncing = false;
                        return;
                    }

                    // If it's a logic error (e.g. constraint violation), remove it so we don't get stuck.
                    console.warn("⚠️ Removing invalid/failed action from queue to unblock.");
                    SyncQueue.remove(action.id);
                } else {
                    // Success
                    SyncQueue.remove(action.id);
                }

            } catch (err: any) {
                console.error("Critical Sync Execution Error:", err);
                // Stop processing on critical errors
                (window as any).__isSyncing = false;
                return;
            }
        }

        console.log("✅ Sync processing complete.");
        (window as any).__isSyncing = false;
    }
};