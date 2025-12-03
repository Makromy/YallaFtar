
import { createClient } from '@supabase/supabase-js';
import { Session, User, Restaurant, Order } from '../types';
import { DEFAULT_RESTAURANT } from '../constants';

// --- 1. CONFIGURATION ---
const SUPABASE_URL = 'https://xdyjbuykdqqbvparwclk.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhkeWpidXlrZHFxYnZwYXJ3Y2xrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2NjgwNTEsImV4cCI6MjA4MDI0NDA1MX0.wENsE8eFKiMNLScYe5z5glOcm9gxJ82KKR2FlL_UdwA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

console.log("Supabase Service Initialized");

// --- 2. SUBSCRIPTIONS ---

export const subscribeToSessions = (callback: (sessions: Session[]) => void, onStatusChange?: (online: boolean) => void) => {
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
    const fetchUsers = async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (!error && data) {
            callback(data as User[]);
            if(onLoaded) onLoaded();
        } else {
            console.error("Error fetching users:", JSON.stringify(error, null, 2));
            if(onLoaded) onLoaded(); // Still trigger load completion to avoid blocking UI
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

// --- 3. API (Clean Writes) ---

export const api = {
    // Direct query to check user existence
    checkUserExists: async (mobile: string): Promise<User | null> => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('mobile', mobile)
                .single();
            
            if (error) {
                if (error.code !== 'PGRST116') { // Ignore "Row not found" errors
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
        const { error } = await supabase
            .from('users')
            .upsert(user);
        
        if (error) throw new Error(error.message);
    },

    toggleUserBlock: async (userId: string, isBlocked: boolean) => {
        const { error } = await supabase
            .from('users')
            .update({ isBlocked })
            .eq('id', userId);

        if (error) throw new Error(error.message);
    },

    deleteUser: async (userId: string) => {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) throw new Error(error.message);
    },

    addRestaurant: async (restaurant: Restaurant) => {
        const { error } = await supabase
            .from('restaurants')
            .insert(restaurant);
            
        if (error) throw new Error(error.message);
    },

    updateRestaurant: async (restaurant: Restaurant) => {
        const { error } = await supabase
            .from('restaurants')
            .update(restaurant)
            .eq('id', restaurant.id);

        if (error) throw new Error(error.message);
    },

    deleteRestaurant: async (id: string) => {
        const { error } = await supabase
            .from('restaurants')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    },

    createSession: async (session: Session) => {
        // Ensure defaults
        const code = session.accessCode || Math.floor(1000 + Math.random() * 9000).toString();
        const newSession = { ...session, accessCode: code };

        const { error } = await supabase
            .from('sessions')
            .insert(newSession);

        if (error) throw new Error(error.message);
    },

    toggleSessionStatus: async (session: Session) => {
        const isActive = !session.isActive;
        const expiresAt = isActive ? Date.now() + (30 * 60 * 1000) : Date.now(); 
        
        const { error } = await supabase
            .from('sessions')
            .update({ isActive, expiresAt })
            .eq('id', session.id);

        if (error) throw new Error(error.message);
    },

    deleteSession: async (id: string) => {
        const { error } = await supabase
            .from('sessions')
            .delete()
            .eq('id', id);

        if (error) throw new Error(error.message);
    },

    // --- ORDER MANAGEMENT ---

    addOrderToSession: async (sessionId: string, order: Order) => {
        // 1. Get current orders
        const { data, error: fetchError } = await supabase
            .from('sessions')
            .select('orders')
            .eq('id', sessionId)
            .single();
        
        if (fetchError || !data) throw new Error("Failed to fetch session for update");

        const currentOrders = (data.orders as Order[]) || [];
        
        // 2. Remove existing order from this user if exists (replace logic) or just append
        const existingIndex = currentOrders.findIndex(o => o.userId === order.userId); // Or o.id match
        
        let updatedOrders = [...currentOrders];
        if (existingIndex >= 0) {
             updatedOrders[existingIndex] = order; // Replace
        } else {
             updatedOrders.push(order); // Append
        }

        // 3. Update
        const { error } = await supabase
            .from('sessions')
            .update({ orders: updatedOrders })
            .eq('id', sessionId);

        if (error) throw new Error(error.message);
    },

    updateOrderInSession: async (sessionId: string, updatedOrder: Order) => {
        // 1. Get current orders
        const { data, error: fetchError } = await supabase
            .from('sessions')
            .select('orders')
            .eq('id', sessionId)
            .single();
        
        if (fetchError || !data) throw new Error("Failed to fetch session");

        const currentOrders = (data.orders as Order[]) || [];
        const updatedList = currentOrders.map(o => o.id === updatedOrder.id ? updatedOrder : o);

        // 2. Update
        const { error } = await supabase
            .from('sessions')
            .update({ orders: updatedList })
            .eq('id', sessionId);
            
        if (error) throw new Error(error.message);
    },

    deleteOrderFromSession: async (sessionId: string, orderId: string) => {
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
    
    // Mapping shim for code compatibility
    updateSessionOrders: async (sessionId: string, orders: Order[]) => {
        const { error } = await supabase
            .from('sessions')
            .update({ orders })
            .eq('id', sessionId);
            
        if (error) throw new Error(error.message);
    }
};
