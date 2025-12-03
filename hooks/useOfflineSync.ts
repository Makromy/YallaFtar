import { useState, useEffect } from 'react';
import { Order } from '../types';

interface OfflineOrder {
  sessionId: string;
  order: Order;
  timestamp: number;
  type: 'create' | 'update' | 'delete';
}

const OFFLINE_ORDERS_KEY = 'yallaftar_offline_orders';

export const useOfflineSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOrders, setPendingOrders] = useState<OfflineOrder[]>([]);

  useEffect(() => {
    // Load pending orders from localStorage
    const stored = localStorage.getItem(OFFLINE_ORDERS_KEY);
    if (stored) {
      try {
        setPendingOrders(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse offline orders:', e);
      }
    }

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const addOfflineOrder = (sessionId: string, order: Order, type: 'create' | 'update' | 'delete') => {
    const offlineOrder: OfflineOrder = {
      sessionId,
      order,
      timestamp: Date.now(),
      type
    };

    const updated = [...pendingOrders, offlineOrder];
    setPendingOrders(updated);
    localStorage.setItem(OFFLINE_ORDERS_KEY, JSON.stringify(updated));
  };

  const clearOfflineOrders = () => {
    setPendingOrders([]);
    localStorage.removeItem(OFFLINE_ORDERS_KEY);
  };

  const syncOfflineOrders = async (syncFunction: (orders: OfflineOrder[]) => Promise<void>) => {
    if (!isOnline || pendingOrders.length === 0) return;

    try {
      await syncFunction(pendingOrders);
      clearOfflineOrders();
    } catch (error) {
      console.error('Failed to sync offline orders:', error);
    }
  };

  return {
    isOnline,
    pendingOrders,
    addOfflineOrder,
    clearOfflineOrders,
    syncOfflineOrders
  };
};