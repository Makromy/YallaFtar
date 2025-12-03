
import React, { useState, useEffect } from 'react';
import { MenuItem, Order, OrderItem, OrderStatus, Session, Restaurant, User } from '../types';
import { Plus, Minus, ShoppingBag, CheckCircle, ArrowLeft, Save, Info, ChevronDown, ChevronUp, Lock, User as UserIcon, LogIn } from 'lucide-react';

interface OrderPageProps {
  session: Session;
  restaurant: Restaurant;
  currentUser: User | null;
  existingOrder?: Order;
  onPlaceOrder: (order: Order) => void;
  onUpdateOrder?: (order: Order) => void;
  onBack?: () => void; // For dashboard edit mode
  onGuestSubmit?: (items: OrderItem[], specialRequests: string) => void; // New prop for guest flow
}

export const OrderPage: React.FC<OrderPageProps> = ({ 
    session, 
    restaurant, 
    currentUser, 
    existingOrder, 
    onPlaceOrder, 
    onUpdateOrder, 
    onBack,
    onGuestSubmit 
}) => {
  const [selectedItems, setSelectedItems] = useState<OrderItem[]>(existingOrder?.items || []);
  const [specialRequests, setSpecialRequests] = useState(existingOrder?.specialRequests || '');
  const [submitted, setSubmitted] = useState(false);
  
  // State to track expanded categories. Default is empty (all collapsed).
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const isSessionClosed = !session.isActive || Date.now() > session.expiresAt;
  // If session is closed, force read-only mode even if user is editing
  const isReadOnly = isSessionClosed;

  // Categories derived from the dynamic menu
  const categories: string[] = Array.from(new Set(restaurant.menu.map(item => item.category)));

  useEffect(() => {
      if(existingOrder) {
          setSelectedItems(existingOrder.items);
          setSpecialRequests(existingOrder.specialRequests || '');
      }
  }, [existingOrder]);

  const toggleCategory = (category: string) => {
      setExpandedCategories(prev => ({
          ...prev,
          [category]: !prev[category]
      }));
  };

  const addToOrder = (item: MenuItem) => {
    if (isReadOnly) return;
    const newItem: OrderItem = {
      itemId: item.id,
      name: item.name,
      price: item.price,
      notes: ''
    };
    setSelectedItems([...selectedItems, newItem]);
  };

  const removeFromOrder = (indexToRemove: number) => {
    if (isReadOnly) return;
    setSelectedItems(selectedItems.filter((_, index) => index !== indexToRemove));
  };

  const updateItemNote = (index: number, note: string) => {
    if (isReadOnly) return;
    const newItems = [...selectedItems];
    newItems[index].notes = note;
    setSelectedItems(newItems);
  };

  // --- Financial Calculations ---
  
  const subtotal = selectedItems.reduce((sum, item) => sum + item.price, 0);

  // Fees Config
  const fees = session.fees || { vatPercentage: 0, serviceFeePercentage: 0, deliveryFeeRaw: 0 };

  // 1. VAT & Service
  const vatAmount = subtotal * (fees.vatPercentage / 100);
  const serviceAmount = subtotal * (fees.serviceFeePercentage / 100);

  // 2. Delivery Split
  // If editing, I am already counted in session.orders.length.
  // If new, I will be the (length + 1)th person.
  const projectedUserCount = existingOrder 
    ? Math.max(1, session.orders.length) 
    : session.orders.length + 1;
  
  const deliveryShare = fees.deliveryFeeRaw / projectedUserCount;

  const totalFees = vatAmount + serviceAmount + deliveryShare;
  const grandTotal = subtotal + totalFees;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (selectedItems.length === 0) return;

    // GUEST MODE: If no user, trigger guest submit flow
    if (!currentUser) {
        if (onGuestSubmit) {
            onGuestSubmit(selectedItems, specialRequests);
        }
        return;
    }

    // STANDARD MODE: Place Order
    const orderData: Order = {
      id: existingOrder?.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
      userId: currentUser.id,
      userName: `${currentUser.firstName} ${currentUser.lastName}`,
      items: selectedItems,
      status: existingOrder?.status || OrderStatus.PENDING,
      timestamp: existingOrder?.timestamp || Date.now(),
      specialRequests
    };

    if (existingOrder && onUpdateOrder) {
        onUpdateOrder(orderData);
        if(onBack) onBack();
    } else {
        onPlaceOrder(orderData);
        setSubmitted(true);
    }
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center">
        <div className="bg-green-100 p-4 rounded-full mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Order Placed!</h2>
        <p className="text-slate-600 mb-6">Thanks {currentUser?.firstName}, your order for {session.name} is in.</p>
        <button 
          onClick={() => onBack ? onBack() : window.history.back()}
          className="text-slate-600 hover:text-slate-900 font-medium hover:underline"
        >
          Return to Session List
        </button>
      </div>
    );
  }

  // Embed iframe logic for "Other" restaurants with URL
  const renderMenuContent = () => {
      if (session.menuUrl) {
          // If image
          if (session.menuUrl.match(/\.(jpeg|jpg|gif|png)$/) || session.menuUrl.startsWith('data:image')) {
              return <img src={session.menuUrl} alt="Menu" className="w-full h-auto rounded-lg shadow-sm" />;
          }
          // If website (iframe)
          return (
              <div className="w-full h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <iframe 
                      src={session.menuUrl} 
                      title="Menu" 
                      className="w-full h-full border-0"
                      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
                      allow="geolocation"
                  />
              </div>
          );
      }
      // If custom restaurant but no URL, show Google Search fallback
      if (restaurant.id === 'other_custom') { // Using constant string as fallback check
           const query = encodeURIComponent(`${session.name} menu`);
           return (
                <div className="w-full h-[600px] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <iframe 
                        src={`https://www.google.com/search?igu=1&q=${query}`} 
                        title="Menu Search" 
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                </div>
           );
      }
      return null;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      {onBack && (
          <button onClick={onBack} className="flex items-center text-slate-500 hover:text-slate-800 mb-4">
              <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
      )}
      
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-900 mb-2">
                    {existingOrder ? 'Your Order' : session.name}
                </h1>
                <p className="text-slate-500 flex items-center gap-2">
                    Ordering from <span className="font-semibold text-slate-800">{restaurant.name}</span>
                </p>
            </div>
            {isSessionClosed && (
                <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-2 rounded-lg font-bold text-sm flex items-center whitespace-nowrap">
                    <Lock className="w-4 h-4 mr-2" /> Session Closed
                </div>
            )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Menu Column */}
        <div className={`lg:col-span-2 space-y-6 ${isReadOnly ? 'opacity-75 grayscale-[50%] pointer-events-none' : ''}`}>
          
          {/* Embedded Menu for Custom Restaurants */}
          {renderMenuContent()}

          {/* Standard Menu List */}
          {categories.length > 0 ? (
              categories.map(category => {
                const isExpanded = !!expandedCategories[category];
                const categoryItems = restaurant.menu.filter(i => i.category === category);
                const itemsInCartCount = selectedItems.filter(i => categoryItems.some(ci => ci.id === i.itemId)).length;

                return (
                    <div key={category} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-200">
                        <button 
                            onClick={() => toggleCategory(category)}
                            className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isExpanded ? 'bg-slate-50' : 'bg-white hover:bg-slate-50'}`}
                        >
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-slate-800">{category}</h3>
                                {itemsInCartCount > 0 && !isExpanded && (
                                    <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2 py-0.5 rounded-full">
                                        {itemsInCartCount} selected
                                    </span>
                                )}
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                        </button>
                        
                        {isExpanded && (
                            <div className="p-4 grid gap-4 border-t border-slate-100">
                                {categoryItems.map(item => (
                                <div key={item.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100 transition-all">
                                    <div className="flex-1 pr-4">
                                    <div className="flex items-baseline justify-between mb-1">
                                        <h4 className="font-medium text-slate-900">{item.name}</h4>
                                        <span className="text-slate-600 font-medium">EGP {item.price.toFixed(2)}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 line-clamp-2">{item.description}</p>
                                    </div>
                                    <button
                                    onClick={() => addToOrder(item)}
                                    disabled={isReadOnly}
                                    className="p-2 bg-orange-50 text-orange-600 rounded-full hover:bg-orange-100 transition-colors shadow-sm flex-shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label={`Add ${item.name}`}
                                    >
                                    <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
              })
          ) : restaurant.id === 'other_custom' && (
              /* Custom Item Form for "Other" Restaurant */
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">Add Item</h3>
                  <CustomItemForm onAdd={(name, price, notes) => {
                      const newItem: OrderItem = {
                          itemId: `custom_${Date.now()}`,
                          name,
                          price,
                          notes
                      };
                      setSelectedItems([...selectedItems, newItem]);
                  }} />
              </div>
          )}
        </div>

        {/* Cart Column - Sticky on Desktop */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-6 sticky top-6">
            <div className="flex items-center mb-6">
              <ShoppingBag className="w-5 h-5 text-orange-600 mr-2" />
              <h2 className="text-xl font-bold text-slate-800">Your Order</h2>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Ordering as</label>
                {currentUser ? (
                    <div className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-600 font-medium flex items-center gap-2">
                        <UserIcon className="w-4 h-4 text-slate-400" />
                        {currentUser.firstName} {currentUser.lastName}
                    </div>
                ) : (
                    <div className="w-full px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700 font-medium text-sm flex items-center gap-2">
                        <UserIcon className="w-4 h-4" /> Guest (Login required to finish)
                    </div>
                )}
              </div>

              <div className="space-y-3 mb-6 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                {selectedItems.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4 italic">No items selected yet.</p>
                ) : (
                  selectedItems.map((item, idx) => (
                    <div key={idx} className="flex flex-col py-2 border-b border-slate-50 last:border-0 group">
                      <div className="flex justify-between items-start">
                        <span className="text-slate-700 font-medium text-sm flex-1">{item.name}</span>
                        <div className="flex items-center ml-2">
                          {/* Allow price editing only for custom items or creators? For now, standard behavior */}
                          {restaurant.id === 'other_custom' ? (
                              <input 
                                type="number"
                                value={item.price}
                                onChange={(e) => {
                                    const newPrice = parseFloat(e.target.value) || 0;
                                    const newItems = [...selectedItems];
                                    newItems[idx].price = newPrice;
                                    setSelectedItems(newItems);
                                }}
                                className="w-20 px-1 py-0.5 border border-slate-200 rounded text-xs text-right bg-slate-50"
                              />
                          ) : (
                              <span className="text-slate-600 text-sm mr-2">EGP {item.price.toFixed(2)}</span>
                          )}
                          
                          {!isReadOnly && (
                            <button
                                type="button"
                                onClick={() => removeFromOrder(idx)}
                                className="text-slate-400 hover:text-red-500 transition-colors p-1"
                            >
                                <Minus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={item.notes || ''}
                        onChange={(e) => updateItemNote(idx, e.target.value)}
                        disabled={isReadOnly}
                        placeholder={isReadOnly ? "No notes" : "Add note (e.g. no onions)"}
                        className="mt-1 text-xs w-full bg-blue-50 focus:bg-white border border-slate-200 rounded px-2 py-1 focus:border-orange-500 focus:ring-1 focus:ring-orange-500 outline-none text-slate-600 placeholder:text-slate-400 transition-all disabled:bg-transparent disabled:border-none disabled:px-0 disabled:text-slate-500"
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="border-t border-slate-100 pt-4 mb-4 space-y-1">
                <div className="flex justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span>EGP {subtotal.toFixed(2)}</span>
                </div>
                
                {(fees.vatPercentage > 0 || fees.serviceFeePercentage > 0 || fees.deliveryFeeRaw > 0) && (
                    <>
                        <div className="flex justify-between text-xs text-slate-400 mt-1">
                            <span>VAT ({fees.vatPercentage}%)</span>
                            <span>EGP {vatAmount.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span>Service ({fees.serviceFeePercentage}%)</span>
                            <span>EGP {serviceAmount.toFixed(2)}</span>
                        </div>
                         <div className="flex justify-between text-xs text-slate-400 border-b border-slate-50 pb-1 mb-1">
                            <span className="flex items-center gap-1" title={`Total delivery EGP ${fees.deliveryFeeRaw} split by ${projectedUserCount} users`}>
                                Delivery Share <Info className="w-3 h-3" />
                            </span>
                            <span>EGP {deliveryShare.toFixed(2)}</span>
                        </div>
                    </>
                )}

                <div className="flex justify-between font-bold text-lg text-slate-900 pt-1">
                  <span>Total</span>
                  <span>EGP {grandTotal.toFixed(2)}</span>
                </div>
                <p className="text-[10px] text-center text-slate-400 mt-1 font-mono">
                    (Order EGP {subtotal.toFixed(2)} + Fees EGP {totalFees.toFixed(2)})
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-1">Order Requests (General)</label>
                <textarea
                  value={specialRequests}
                  onChange={e => setSpecialRequests(e.target.value)}
                  disabled={isReadOnly}
                  className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-sm disabled:bg-slate-50 disabled:text-slate-500 transition-colors"
                  rows={2}
                  placeholder={isReadOnly ? "No general requests" : "Any general requests for the whole order..."}
                />
              </div>

              {isReadOnly ? (
                  <button
                    type="button"
                    onClick={() => onBack ? onBack() : window.history.back()}
                    className="w-full py-3 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition-colors flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2"/> Return
                  </button>
              ) : (
                  <button
                    type="submit"
                    disabled={selectedItems.length === 0}
                    className={`w-full py-3 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center ${!currentUser ? 'bg-orange-600 hover:bg-orange-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                  >
                    {!currentUser ? (
                        <><LogIn className="w-4 h-4 mr-2"/> Log in to Place Order</>
                    ) : (
                        existingOrder ? <><Save className="w-4 h-4 mr-2"/> Save Changes</> : 'Place Order'
                    )}
                  </button>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper for Custom Items
const CustomItemForm = ({ onAdd }: { onAdd: (name: string, price: number, notes: string) => void }) => {
    const [name, setName] = useState('');
    const [price, setPrice] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(name && price) {
            onAdd(name, parseFloat(price), notes);
            setName('');
            setPrice('');
            setNotes('');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input 
                type="text" 
                placeholder="Item Name" 
                value={name} 
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 bg-blue-50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none"
            />
            <div className="flex gap-2">
                <input 
                    type="number" 
                    placeholder="Price (EGP)" 
                    value={price} 
                    onChange={e => setPrice(e.target.value)}
                    className="w-1/2 px-3 py-2 bg-blue-50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none"
                />
                <input 
                    type="text" 
                    placeholder="Notes (Optional)" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)}
                    className="w-1/2 px-3 py-2 bg-blue-50 border border-slate-200 rounded-lg text-sm focus:bg-white outline-none"
                />
            </div>
            <button type="submit" className="bg-slate-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-slate-900">
                Add Item
            </button>
        </form>
    );
}
