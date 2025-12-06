import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Session, User, Restaurant, Order } from '../types';
import { DEFAULT_RESTAURANT } from '../constants';

// --- 1. DYNAMIC CONFIGURATION ---
const STORAGE_KEY_URL = 'yallaftar_sys_url';
const STORAGE_KEY_KEY = 'yallaftar_sys_key';

const storedUrl = localStorage.getItem(STORAGE_KEY_URL) || 'https://xdyjbuykdqqbvparwclk.supabase.co';
const storedKey = localStorage.getItem(STORAGE_KEY_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeWpidXlrZHFxYnZwYXJ3Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjgwNTEsImV4cCI6MjA4MDI0NDA1MX0.wENsE8eFKiMNLScYe5z5glOcm9gxJ82KKR2FlL_UdwA';

// Initialize with stored values or dummy values to prevent crash on load
// We check isConfigured() before making calls.
export const supabase: SupabaseClient = createClient(
    storedUrl || 'https://placeholder.supabase.co', 
    storedKey || 'placeholder'
);

console.log(storedUrl ? "Supabase Service Initialized with stored config" : "Supabase Service: Pending Configuration");

// --- 2. CONFIGURATION HELPER ---
export const systemConfig = {
    isConfigured: () => {
        return !!storedUrl && !!storedKey && storedUrl !== 'https://placeholder.supabase.co';
    },
    getCredentials: () => ({
        url: storedUrl,
        key: storedKey
    }),
    saveCredentials: (url: string, key: string) => {
        localStorage.setItem(STORAGE_KEY_URL, url.trim());
        localStorage.setItem(STORAGE_KEY_KEY, key.trim());
        // Reload to re-initialize the const supabase client with new keys
        window.location.reload();
    },
    clearCredentials: () => {
        localStorage.removeItem(STORAGE_KEY_URL);
        localStorage.removeItem(STORAGE_KEY_KEY);
        window.location.reload();
    }
};

// --- 3. SUBSCRIPTIONS ---

export const subscribeToSessions = (callback: (sessions: Session[]) => void, onStatusChange?: (online: boolean) => void) => {
    if (!systemConfig.isConfigured()) {
        if(onStatusChange) onStatusChange(false);
        return () => {};
    }

    // Initial Fetch
    const fetchSessions = async () => {
        const { data, error } = await supabase
            .from('sessions')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) {
            console.error("Error fetching sessions:", JSON.stringify(error, null, 2));
            if(onStatusChange) onStatusChange(false);
            return;
        }

        if(onStatusChange) onStatusChange(true);
        callback(data as Session[]);
    };

    fetchSessions();

    // Realtime Subscription
    const channel = supabase
        .channel('sessions-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'sessions' }, () => {
            fetchSessions(); // Refresh data on any change
        })
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                if(onStatusChange) onStatusChange(true);
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                if(onStatusChange) onStatusChange(false);
            }
        });

    return () => {
        supabase.removeChannel(channel);
    };
};

export const subscribeToUsers = (callback: (users: User[]) => void, onLoaded?: () => void) => {
    if (!systemConfig.isConfigured()) {
        if(onLoaded) onLoaded();
        return () => {};
    }

    const fetchUsers = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
            callback(data as User[]);
            if(onLoaded) onLoaded();
        } else {
            console.error("Error fetching users:", JSON.stringify(error, null, 2));
            if(onLoaded) onLoaded();
        }
    };

    fetchUsers();

    const channel = supabase
        .channel('users-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, () => {
            fetchUsers();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

export const subscribeToRestaurants = (callback: (restaurants: Restaurant[]) => void) => {
    if (!systemConfig.isConfigured()) {
        callback([DEFAULT_RESTAURANT]);
        return () => {};
    }

    const fetchRestaurants = async () => {
        const { data, error } = await supabase.from('restaurants').select('*');
        if (!error && data && data.length > 0) {
            callback(data as Restaurant[]);
        } else {
            if(error) console.error("Error fetching restaurants:", JSON.stringify(error, null, 2));
            callback([DEFAULT_RESTAURANT]);
        }
    };

    fetchRestaurants();

    const channel = supabase
        .channel('restaurants-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, () => {
            fetchRestaurants();
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

// --- 4. API (Clean Writes) ---

export const api = {
    // TEST CONNECTION
    testConnection: async (): Promise<{ success: boolean; message: string }> => {
        if (!systemConfig.isConfigured()) return { success: false, message: "System not configured" };
        
        try {
            const { count, error } = await supabase.from('users').select('*', { count: 'exact', head: true });
            if (error) {
                if (error.code === '42501') {
                    return { success: false, message: "Permission denied. Please run SQL Policies in Supabase." };
                }
                return { success: false, message: error.message };
            }
            return { success: true, message: "Connected successfully!" };
        } catch (e: any) {
            return { success: false, message: e.message };
        }
    },

    // Direct query to check user existence
    checkUserExists: async (mobile: string): Promise<User | null> => {
        if (!systemConfig.isConfigured()) return null;
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('mobile', mobile)
                .single();
            
            if (error) {
                if (error.code !== 'PGRST116') { 
                    console.error("Check user failed:", JSON.stringify(error, null, 2));
                }
                return null;
            }
            return data as User;
        } catch (e: any) {
            console.error("Check user exception:", e.message);
            return null;
        }
    },

    upsertUser: async (user: User) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('users').upsert(user);
        if (error) throw new Error(error.message);
    },

    toggleUserBlock: async (userId: string, isBlocked: boolean) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('users').update({ isBlocked }).eq('id', userId);
        if (error) throw new Error(error.message);
    },

    deleteUser: async (userId: string) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('users').delete().eq('id', userId);
        if (error) throw new Error(error.message);
    },

    addRestaurant: async (restaurant: Restaurant) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('restaurants').insert(restaurant);
        if (error) throw new Error(error.message);
    },

    updateRestaurant: async (restaurant: Restaurant) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('restaurants').update(restaurant).eq('id', restaurant.id);
        if (error) throw new Error(error.message);
    },

    deleteRestaurant: async (id: string) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('restaurants').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    createSession: async (session: Session) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const code = session.accessCode || Math.floor(1000 + Math.random() * 9000).toString();
        const newSession = { ...session, accessCode: code };
        const { error } = await supabase.from('sessions').insert(newSession);
        if (error) throw new Error(error.message);
    },

    toggleSessionStatus: async (session: Session) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const isActive = !session.isActive;
        const expiresAt = isActive ? Date.now() + (30 * 60 * 1000) : Date.now(); 
        const { error } = await supabase.from('sessions').update({ isActive, expiresAt }).eq('id', session.id);
        if (error) throw new Error(error.message);
    },

    deleteSession: async (id: string) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('sessions').delete().eq('id', id);
        if (error) throw new Error(error.message);
    },

    // --- ORDER MANAGEMENT ---

    addOrderToSession: async (sessionId: string, order: Order) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        
        const { data, error: fetchError } = await supabase
            .from('sessions')
            .select('orders')
            .eq('id', sessionId)
            .single();
        
        if (fetchError || !data) throw new Error("Failed to fetch session");

        const currentOrders = (data.orders as Order[]) || [];
        const existingIndex = currentOrders.findIndex(o => o.userId === order.userId);
        
        let updatedOrders = [...currentOrders];
        if (existingIndex >= 0) {
             updatedOrders[existingIndex] = order;
        } else {
             updatedOrders.push(order);
        }

        const { error } = await supabase
            .from('sessions')
            .update({ orders: updatedOrders })
            .eq('id', sessionId);

        if (error) throw new Error(error.message);
    },

    updateOrderInSession: async (sessionId: string, updatedOrder: Order) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { data, error: fetchError } = await supabase
            .from('sessions')
            .select('orders')
            .eq('id', sessionId)
            .single();
        
        if (fetchError || !data) throw new Error("Failed to fetch session");

        const currentOrders = (data.orders as Order[]) || [];
        const updatedList = currentOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o);

        const { error } = await supabase
            .from('sessions')
            .update({ orders: updatedList })
            .eq('id', sessionId);
            
        if (error) throw new Error(error.message);
    },

    deleteOrderFromSession: async (sessionId: string, orderId: string) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { data, error: fetchError } = await supabase
            .from('sessions')
            .select('orders')
            .eq('id', sessionId)
            .single();

        if (fetchError || !data) throw new Error("Failed to fetch session");
        
        const currentOrders = (data.orders as Order[]) || [];
        const updatedList = currentOrders.filter(o => o.id !== orderId);

        const { error } = await supabase
            .from('sessions')
            .update({ orders: updatedList })
            .eq('id', sessionId);

        if (error) throw new Error(error.message);
    },

    bulkUpdateOrderStatus: async (sessionId: string, status: string) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { data, error: fetchError } = await supabase
            .from('sessions')
            .select('orders')
            .eq('id', sessionId)
            .single();

        if (fetchError || !data) throw new Error("Failed to fetch session");

        const currentOrders = (data.orders as Order[]) || [];
        const updatedList = currentOrders.map(o => ({ ...o, status }));

        const { error } = await supabase
            .from('sessions')
            .update({ orders: updatedList })
            .eq('id', sessionId);

        if (error) throw new Error(error.message);
    },
    
    updateSessionOrders: async (sessionId: string, orders: Order[]) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('sessions').update({ orders }).eq('id', sessionId);
        if (error) throw new Error(error.message);
    },

    updateSessionFees: async (sessionId: string, fees: any) => {
        if (!systemConfig.isConfigured()) throw new Error("App not configured");
        const { error } = await supabase.from('sessions').update({ fees }).eq('id', sessionId);
        if (error) throw new Error(error.message);
    }
};