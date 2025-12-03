
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Session, Order, OrderStatus, AggregatedItem, Restaurant, User, OrderItem } from '../types';
import { Check, CheckCheck, Trash2, Edit2, ArrowLeft, MessageCircle, AlertTriangle, PlusCircle, Utensils, StopCircle, Clock, Send } from 'lucide-react';
import { Stats } from './Stats';
import { OrderPage } from './OrderPage';
import { APP_NAME } from '../constants';

interface DashboardProps {
  session: Session;
  restaurant: Restaurant;
  currentUser: User | null;
  creatorProfile?: User;
  users: User[]; // Needed to look up mobile numbers for orders
  isSuperAdmin: boolean;
  onAddOrder: (sessionId: string, order: Order) => void; // Added to allow creator to place order
  onUpdateOrder: (sessionId: string, order: Order) => void;
  onDeleteOrder: (sessionId: string, orderId: string) => void;
  onBulkStatusChange: (sessionId: string, status: OrderStatus) => void;
  onCloseSession: (sessionId: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ 
    session, 
    restaurant, 
    currentUser, 
    creatorProfile, 
    users,
    isSuperAdmin, 
    onAddOrder,
    onUpdateOrder, 
    onDeleteOrder, 
    onBulkStatusChange,
    onCloseSession
}) => {
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false); // State for creator placing new order

  // Access Control
  const canManage = isSuperAdmin || (currentUser && currentUser.id === session.creatorId);
  
  // Calculate Session Status
  const timeLeft = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 60000));
  const isSessionActive = session.isActive && session.expiresAt > Date.now();

  // Helper to group items by ID and Notes for display
  const groupOrderItems = (items: OrderItem[]) => {
      const map = new Map<string, OrderItem & { count: number, totalPrice: number }>();
      items.forEach(item => {
          const key = `${item.itemId}_${(item.notes || '').trim()}`;
          const existing = map.get(key);
          if (existing) {
              existing.count++;
              existing.totalPrice += item.price;
          } else {
              map.set(key, { ...item, count: 1, totalPrice: item.price });
          }
      });
      return Array.from(map.values());
  };

  if (!canManage) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
            <div className="bg-red-100 p-4 rounded-full mb-4">
                <AlertTriangle className="w-12 h-12 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Access Denied</h2>
            <p className="text-slate-600 mt-2">Only the creator of this session can view the dashboard.</p>
            
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
                 <Link to="/" className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors">
                    Return Home
                 </Link>
                 <Link to={`/session/${session.id}`} className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-bold transition-colors shadow-md">
                    Go to Order Page
                 </Link>
            </div>
        </div>
    );
  }

  // Identify Creator's Order
  const creatorOrder = session.orders.find(o => o.userId === currentUser?.id);

  // Aggregation Logic (Global Summary)
  // Modified to keep raw name and note separate for rendering, but combined for key
  const aggregatedItems = useMemo(() => {
    const map = new Map<string, AggregatedItem & { note?: string, rawName: string }>();
    session.orders.forEach(order => {
      order.items.forEach(item => {
        // Key includes note so unique variations are counted separately in summary
        const noteSuffix = item.notes ? `|||${item.notes}` : '';
        const key = item.name + noteSuffix;

        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
          existing.totalPrice += item.price;
        } else {
          map.set(key, { 
              name: key, // Kept for compatibility
              rawName: item.name,
              note: item.notes,
              count: 1, 
              totalPrice: item.price 
          });
        }
      });
    });
    // Sort alphabetically by name, then by note
    return Array.from(map.values()).sort((a, b) => {
        const nameCompare = a.rawName.localeCompare(b.rawName);
        if (nameCompare !== 0) return nameCompare;
        return (a.note || '').localeCompare(b.note || '');
    });
  }, [session.orders]);

  // Identify orders with general requests for the sidebar summary
  const ordersWithRequests = session.orders.filter(o => o.specialRequests && o.specialRequests.trim() !== '');

  // Financial Calculations
  const subtotal = session.orders.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.price, 0), 0);
  
  const fees = session.fees || { vatPercentage: 0, serviceFeePercentage: 0, deliveryFeeRaw: 0 };
  const vatAmount = subtotal * (fees.vatPercentage / 100);
  const serviceAmount = subtotal * (fees.serviceFeePercentage / 100);
  const deliveryAmount = fees.deliveryFeeRaw;
  const grandTotal = subtotal + vatAmount + serviceAmount + deliveryAmount;

  // Delivery per active user
  const deliveryPerUser = session.orders.length > 0 ? (fees.deliveryFeeRaw / session.orders.length) : 0;

  const pendingCount = session.orders.filter(o => o.status === OrderStatus.PENDING).length;
  const confirmedCount = session.orders.filter(o => o.status === OrderStatus.CONFIRMED || o.status === OrderStatus.COMPLETED).length;

  const handleStatusChange = (order: Order, newStatus: OrderStatus) => {
    onUpdateOrder(session.id, { ...order, status: newStatus });
  };

  const handleToggleStatus = () => {
      // Directly toggle without confirmation to match Admin Panel
      onCloseSession(session.id);
  };

  // --- Vendor WhatsApp Logic (No Prices, Organized & Sorted) ---
  const handleSendToVendor = () => {
      let message = `*🥗 NEW ORDER: ${session.name}*\n`;
      message += `*Restaurant:* ${restaurant.name}\n`;
      message += `*Date:* ${new Date().toLocaleDateString()}\n`;
      message += `*Total Count:* ${aggregatedItems.reduce((sum, item) => sum + item.count, 0)} items\n`;
      message += `--------------------------------\n\n`;

      // Section 1: Kitchen Summary (Aggregated)
      message += `*👨‍🍳 KITCHEN SUMMARY*\n`;
      message += `_(Total items to prepare)_\n\n`;
      
      // Explicitly sort items alphabetically by name, then by note for WhatsApp
      const sortedSummary = [...aggregatedItems].sort((a, b) => {
          const nameCompare = a.rawName.localeCompare(b.rawName);
          if (nameCompare !== 0) return nameCompare;
          return (a.note || '').localeCompare(b.note || '');
      });

      sortedSummary.forEach(item => {
          const note = item.note ? ` (${item.note})` : '';
          message += `◻️ ${item.count}x ${item.rawName}${note}\n`;
      });

      // Section 2: General Notes (Sorted by User Name)
      if (ordersWithRequests.length > 0) {
           message += `\n--------------------------------\n`;
           message += `*⚠️ GENERAL ORDER NOTES*\n`;
           
           // Sort requests alphabetically by user name
           const sortedRequests = [...ordersWithRequests].sort((a, b) => a.userName.localeCompare(b.userName));
           
           sortedRequests.forEach(o => {
               message += `🔸 ${o.userName}: ${o.specialRequests}\n`;
           });
      }

      // Section 3: Individual Packing List
      message += `\n--------------------------------\n`;
      message += `*👤 INDIVIDUAL PACKING LIST*\n`;
      
      // Sort users alphabetically for the packing list
      const sortedOrders = [...session.orders].sort((a, b) => a.userName.localeCompare(b.userName));

      sortedOrders.forEach(order => {
          message += `\n*${order.userName}*\n`;
          // Sort individual items alphabetically
          const grouped = groupOrderItems(order.items).sort((a, b) => a.name.localeCompare(b.name));
          
          grouped.forEach(i => {
              const note = i.notes ? ` _(${i.notes})_` : '';
              message += `- ${i.count}x ${i.name}${note}\n`;
          });
      });

      window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // --- WhatsApp Logic (Individual - With Prices) ---
  
  const formatPhoneNumberForWhatsApp = (mobile: string) => {
      return mobile.replace(/\D/g, '');
  };

  const generateWhatsAppLink = (order: Order, orderSubtotal: number, orderFeesTotal: number, orderGrandTotal: number) => {
      let message = `*${APP_NAME} Order Summary*\n`;
      message += `Session: ${session.name}\n`;
      message += `Ordering as: ${order.userName}\n\n`;
      
      message += `*Items:*\n`;
      
      const groupedItems = groupOrderItems(order.items).sort((a, b) => a.name.localeCompare(b.name));
      groupedItems.forEach(i => {
          const countPrefix = i.count > 1 ? `${i.count}x ` : '';
          const note = i.notes ? ` (Note: ${i.notes})` : '';
          message += `- ${countPrefix}${i.name}${note}: EGP ${i.totalPrice.toFixed(2)}\n`;
      });
      
      message += `\n----------------\n`;
      message += `Subtotal: EGP ${orderSubtotal.toFixed(2)}\n`;
      message += `Fees: EGP ${orderFeesTotal.toFixed(2)}\n`;
      message += `*Total: EGP ${orderGrandTotal.toFixed(2)}*\n`;
      
      if (creatorProfile?.instapayUsername) {
          message += `\nPLEASE PAY TO:\n${creatorProfile.instapayUsername}`;
      }
      
      const user = users.find(u => u.id === order.userId);
      const phoneNumber = user?.mobile ? formatPhoneNumberForWhatsApp(user.mobile) : '';

      if (phoneNumber) {
          return `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
      } else {
          return `https://wa.me/?text=${encodeURIComponent(message)}`;
      }
  };

  // --- Render Order Page (Edit/Create) ---

  if ((editingOrder || isCreatingOrder) && currentUser) {
      return (
          <OrderPage 
            session={session} 
            restaurant={restaurant}
            currentUser={currentUser}
            existingOrder={editingOrder || undefined} // undefined if creating
            onPlaceOrder={(newOrder) => {
                onAddOrder(session.id, newOrder);
                setIsCreatingOrder(false);
            }} 
            onUpdateOrder={(updated) => {
                onUpdateOrder(session.id, updated);
                setEditingOrder(null);
            }}
            onBack={() => {
                setEditingOrder(null);
                setIsCreatingOrder(false);
            }}
          />
      );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-8">
      {/* Back Navigation */}
      <div className="flex justify-between items-center">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back to Home
          </Link>
          <Link to="/admin" className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
              Back to Admin Panel
          </Link>
      </div>

      {/* Header & Metrics */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
              {session.name}
              {!isSessionActive && (
                  <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full border border-red-200">CLOSED</span>
              )}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Restaurant: <span className="font-semibold">{restaurant.name}</span> • Created {new Date(session.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
             {/* Countdown for Active Sessions */}
             {isSessionActive && (
                 <span className="bg-orange-50 text-orange-700 px-3 py-1.5 rounded-lg font-mono font-bold text-sm border border-orange-100 flex items-center">
                     <Clock className="w-4 h-4 mr-2" />
                     {timeLeft}m remaining
                 </span>
             )}
            
            <button
                onClick={handleToggleStatus}
                type="button"
                className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold border shadow-sm transition-all active:scale-95 ${
                    isSessionActive 
                    ? 'bg-green-100 text-green-800 border-green-200 hover:bg-green-200 hover:border-green-300' 
                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200 hover:border-slate-300'
                }`}
            >
                {isSessionActive ? (
                     <><Clock className="w-4 h-4 mr-2" /> ACTIVE</>
                ) : (
                     <><StopCircle className="w-4 h-4 mr-2" /> CLOSED</>
                )}
            </button>
            
            {/* Vendor Action */}
            <button
                onClick={handleSendToVendor}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium text-sm hover:bg-slate-900 transition-colors shadow-sm flex items-center"
            >
                <Send className="w-4 h-4 mr-2" /> Send to Kitchen
            </button>

            <button
                onClick={() => onBulkStatusChange(session.id, OrderStatus.CONFIRMED)}
                className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium text-sm hover:bg-blue-100 transition-colors border border-blue-200"
            >
                Confirm All
            </button>
            <button
                onClick={() => onBulkStatusChange(session.id, OrderStatus.COMPLETED)}
                className="px-4 py-2 bg-green-50 text-green-700 rounded-lg font-medium text-sm hover:bg-green-100 transition-colors border border-green-200"
            >
                Complete All
            </button>
        </div>
      </div>

      {/* Mini Metrics Dashboard - Expanded to include Pending */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Total Orders</p>
          <p className="text-2xl font-bold text-slate-900">{session.orders.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Pending</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Confirmed</p>
          <p className="text-2xl font-bold text-emerald-600">{confirmedCount}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Items Count</p>
          <p className="text-2xl font-bold text-blue-600">{aggregatedItems.reduce((a, b) => a + b.count, 0)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs uppercase font-bold tracking-wider">Grand Total</p>
          <p className="text-2xl font-bold text-slate-900">EGP {grandTotal.toFixed(2)}</p>
        </div>
      </div>

      {/* Stats Charts */}
      <Stats session={session} aggregatedItems={aggregatedItems} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Orders */}
        <div className="lg:col-span-2 space-y-6">
            
            {/* Creator Order Action */}
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="bg-indigo-100 p-2 rounded-full text-indigo-600">
                        <Utensils className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="font-bold text-indigo-900">Your Meal</h3>
                        <p className="text-sm text-indigo-600">
                            {creatorOrder ? "You have added your order." : "Don't forget to order for yourself!"}
                        </p>
                    </div>
                </div>
                {creatorOrder ? (
                    <button 
                        onClick={() => setEditingOrder(creatorOrder)}
                        className="px-4 py-2 bg-white text-indigo-600 border border-indigo-200 rounded-lg text-sm font-bold hover:bg-indigo-100 transition-colors shadow-sm"
                    >
                        Edit My Order
                    </button>
                ) : (
                    <button 
                        onClick={() => setIsCreatingOrder(true)}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition-colors shadow-sm flex items-center"
                    >
                        <PlusCircle className="w-4 h-4 mr-2" /> Place My Order
                    </button>
                )}
            </div>

            {/* Individual Orders List */}
            <div>
                <h2 className="text-xl font-bold text-slate-800 mb-4">Individual Orders</h2>
                {session.orders.length === 0 && (
                    <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-300">
                        <p className="text-slate-500">No orders placed yet.</p>
                    </div>
                )}
                <div className="space-y-4">
                {session.orders.map(order => {
                    // Calculate individual totals
                    const orderSubtotal = order.items.reduce((s, i) => s + i.price, 0);
                    const orderVat = orderSubtotal * (fees.vatPercentage / 100);
                    const orderService = orderSubtotal * (fees.serviceFeePercentage / 100);
                    const orderFeesTotal = orderVat + orderService + deliveryPerUser;
                    const orderGrandTotal = orderSubtotal + orderFeesTotal;

                    // Check if this is the creator's order to highlight it
                    const isMine = currentUser && order.userId === currentUser.id;
                    
                    // Group similar items for display
                    const groupedItems = groupOrderItems(order.items);

                    return (
                        <div key={order.id} className={`p-4 rounded-lg shadow-sm border hover:shadow-md transition-shadow flex flex-col sm:flex-row justify-between gap-4 ${isMine ? 'bg-indigo-50 border-indigo-200' : 'bg-white border-slate-100'}`}>
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-bold text-slate-900">{order.userName} {isMine && "(You)"}</h3>
                                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                                        ${order.status === OrderStatus.PENDING ? 'bg-yellow-100 text-yellow-800' : 
                                        order.status === OrderStatus.CONFIRMED ? 'bg-blue-100 text-blue-800' : 
                                        'bg-green-100 text-green-800'}`}>
                                        {order.status}
                                    </span>
                                </div>
                                
                                {/* Items List with Notes */}
                                <div className="text-sm text-slate-600 mb-2 space-y-1 mt-2">
                                    {groupedItems.map((i, idx) => (
                                        <div key={idx} className="flex flex-wrap items-center gap-x-2">
                                            <span className={i.count > 1 ? "font-bold text-slate-900" : ""}>
                                                {i.count > 1 ? `${i.count}x` : '•'}
                                            </span>
                                            <span>{i.name}</span>
                                            {i.notes && (
                                                <span className="text-xs text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-100">
                                                    Note: {i.notes}
                                                </span>
                                            )}
                                        </div>
                                    ))}
                                </div>

                                {order.specialRequests && (
                                    <p className="text-xs text-slate-500 italic bg-slate-100 inline-block px-2 py-1 rounded mt-1">
                                        General Request: {order.specialRequests}
                                    </p>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="text-right mr-4">
                                    <div className="font-bold text-slate-700">
                                        EGP {orderGrandTotal.toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                        Order EGP {orderSubtotal.toFixed(2)} + Fees EGP {orderFeesTotal.toFixed(2)}
                                    </div>
                                </div>
                                
                                <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-200">
                                    <a 
                                        href={generateWhatsAppLink(order, orderSubtotal, orderFeesTotal, orderGrandTotal)}
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="p-2 text-slate-500 hover:text-green-600 hover:bg-white rounded-md transition-all"
                                        title="Send Summary via WhatsApp"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                    </a>
                                    <button 
                                        onClick={() => setEditingOrder(order)}
                                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-md transition-all"
                                        title="Edit Order"
                                    >
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    {order.status === OrderStatus.PENDING && (
                                        <button 
                                            onClick={() => handleStatusChange(order, OrderStatus.CONFIRMED)}
                                            className="p-2 text-slate-500 hover:text-emerald-600 hover:bg-white rounded-md transition-all"
                                            title="Confirm"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                    )}
                                    {order.status === OrderStatus.CONFIRMED && (
                                         <button 
                                            onClick={() => handleStatusChange(order, OrderStatus.COMPLETED)}
                                            className="p-2 text-slate-500 hover:text-green-600 hover:bg-white rounded-md transition-all"
                                            title="Complete"
                                        >
                                            <CheckCheck className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button 
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteOrder(session.id, order.id);
                                        }}
                                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-white rounded-md transition-all"
                                        title="Delete Order"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
                </div>
            </div>
        </div>

        {/* Right Column: Summary */}
        <div className="lg:col-span-1 space-y-6">
             {/* Order Summary Sidebar */}
             <div className="bg-slate-900 text-white rounded-xl shadow-lg p-6 sticky top-6">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Utensils className="w-5 h-5 text-orange-400" /> Order Summary
                </h2>
                
                <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                    {aggregatedItems.length === 0 ? (
                        <p className="text-slate-400 italic text-center py-4">No items ordered yet.</p>
                    ) : (
                        aggregatedItems.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start border-b border-slate-800 pb-3 last:border-0">
                                <div className="flex gap-3">
                                    <span className="bg-orange-500 text-white text-xs font-bold w-6 h-6 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                                        {item.count}
                                    </span>
                                    <div>
                                        <p className="text-sm font-medium text-slate-200">{item.rawName}</p>
                                        {item.note && (
                                            <p className="text-xs text-orange-200">
                                                ({item.note})
                                            </p>
                                        )}
                                    </div>
                                </div>
                                <span className="text-sm text-slate-400">
                                    {item.totalPrice.toFixed(0)}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                {/* General Notes Section in Sidebar */}
                {ordersWithRequests.length > 0 && (
                    <div className="mt-6 pt-4 border-t border-slate-700">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                            <AlertTriangle className="w-3 h-3" /> General Notes
                        </h3>
                        <div className="space-y-2">
                            {ordersWithRequests.map(o => (
                                <div key={o.id} className="text-xs bg-slate-800 p-2 rounded border border-slate-700">
                                    <span className="text-orange-200 font-bold">{o.userName}:</span> <span className="text-slate-300">{o.specialRequests}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-6 pt-6 border-t border-slate-700">
                    <div className="flex justify-between mb-2 text-sm text-slate-400">
                        <span>Subtotal</span>
                        <span>EGP {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between mb-2 text-sm text-slate-400">
                        <span>Fees & VAT</span>
                        <span>EGP {(grandTotal - subtotal).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-white mt-4">
                        <span>Total</span>
                        <span>EGP {grandTotal.toFixed(2)}</span>
                    </div>
                </div>
             </div>
        </div>
      </div>
    </div>
  );
};
