
export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED'
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
}

export interface OrderItem {
  itemId: string;
  name: string;
  price: number;
  notes?: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  mobile: string;
  instapayUsername?: string; // e.g. username@instapay
  isBlocked?: boolean;
}

export interface Order {
  id: string;
  userId: string; // Link to User
  userName: string; // Snapshot of name at time of order
  items: OrderItem[];
  status: OrderStatus;
  timestamp: number;
  specialRequests?: string;
}

export interface SessionFees {
  vatPercentage: number;
  serviceFeePercentage: number;
  deliveryFeeRaw: number;
}

export interface Session {
  id: string;
  name: string;
  creatorId: string; // User ID of the creator
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  orders: Order[];
  restaurantId: string;
  fees: SessionFees;
  menuUrl?: string;
  accessCode: string;
}

export interface Restaurant {
  id: string;
  name: string;
  menu: MenuItem[];
}

export interface AggregatedItem {
  name: string;
  count: number;
  totalPrice: number;
}