
import React, { useState, useEffect, useRef } from 'react';
import { HashRouter, Routes, Route, Link, useParams, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { OrderPage } from './components/OrderPage';
import { Dashboard } from './components/Dashboard';
import { AdminPanel } from './components/AdminPanel';
import { Auth } from './components/Auth';
import { UserProfile } from './components/UserProfile';
import { Session, Order, OrderStatus, Restaurant, SessionFees, User, OrderItem } from './types';
import { DEFAULT_RESTAURANT, APP_NAME, OTHER_RESTAURANT_ID } from './constants';
import { Coffee, Egg, ShieldCheck, Clock, User as UserIcon, LogOut, Plus, LayoutDashboard, Wifi, WifiOff, Bell, X, Share2, AlertCircle, Edit, StopCircle, KeyRound, Copy, Loader2, Utensils, RefreshCw, AlertTriangle, Database, History, Settings, Download } from 'lucide-react';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { ShareSessionModal } from './components/ShareSessionModal';
import { SessionCodeInput } from './components/SessionCodeInput';
import { useOfflineSync } from './hooks/useOfflineSync';
import { subscribeToSessions, subscribeToUsers, subscribeToRestaurants, api, systemConfig } from './services/supabase';

const STORAGE_KEY_CURRENT_USER_ID = 'yallaftar_current_user_id';
const STORAGE_KEY_CACHED_USER = 'yallaftar_cached_user';
const STORAGE_KEY_ADMIN_AUTH = 'yallaftar_admin_auth';

// --- Toast Notification Component ---
const Toast = ({ title, message, onClose, type = 'info' }: { title: string, message: string, onClose: () => void, type?: 'info' | 'success' | 'error' }) => {
  const bgColor = type === 'success' ? 'bg-green-600' : type === 'error' ? 'bg-red-600' : 'bg-slate-900';
  const iconColor = type === 'success' ? 'text-white' : type === 'error' ? 'text-white' : 'text-orange-400';
  const Icon = type === 'error' ? AlertCircle : Bell;

  return (
    <div className={`fixed bottom-4 right-4 ${bgColor} text-white p-4 rounded-lg shadow-lg z-50 flex items-start gap-3 animate-slide-in max-w-sm`}>
      <Icon className={`w-5 h-5 ${iconColor} flex-shrink-0 mt-0.5`} />
      <div className="flex-1">
        <h4 className="font-bold text-sm">{title}</h4>
        <p className="text-sm text-slate-200">{message}</p>
      </div>
      <button onClick={onClose} className="text-slate-300 hover:text-white">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// --- Splash Screen Component ---
const SplashScreen = () => {
  const [showSlowMessage, setShowSlowMessage] = useState(false);

  useEffect(() => {
      const timer = setTimeout(() => setShowSlowMessage(true), 10000);
      return () => clearTimeout(timer);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900 flex flex-col items-center justify-center z-50 text-white">
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-orange-500 rounded-full blur-xl opacity-50 animate-pulse"></div>
        <div className="relative bg-gradient-to-br from-orange-400 to-orange-600 p-6 rounded-2xl shadow-2xl transform transition-all animate-bounce-gentle">
          <Utensils className="w-16 h-16 text-white" />
        </div>
      </div>
      <h1 className="text-4xl font-bold tracking-tight mb-2 animate-fade-in-up">{APP_NAME}</h1>
      <p className="text-slate-400 text-sm mb-8 animate-fade-in-up delay-100">Syncing with kitchen...</p>
      
      <div className="flex flex-col items-center gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Loader2 className="w-4 h-4 animate-spin text-orange-500" />
            <span>Connecting securely to database...</span>
          </div>

          {showSlowMessage && (
              <div className="flex items-center gap-2 text-orange-300 text-xs bg-orange-900/30 px-3 py-2 rounded-full animate-fade-in">
                  <AlertTriangle className="w-3 h-3" />
                  <span>Connection is slow. Hang tight!</span>
              </div>
          )}
      </div>
    </div>
  );
};

// --- Unconfigured Landing Page ---
const SetupLandingPage = () => (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-12 rounded-3xl shadow-2xl max-w-md w-full border border-slate-100">
            <div className="bg-orange-100 p-6 rounded-full inline-flex mb-6">
                <Settings className="w-12 h-12 text-orange-600" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-4">{APP_NAME}</h1>
            <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 mb-8">
                <h3 className="text-yellow-800 font-bold mb-1 flex items-center justify-center gap-2">
                    <AlertTriangle className="w-4 h-4"/> Configuration Required
                </h3>
                <p className="text-yellow-700 text-sm">
                    This system needs to be connected to a database.
                </p>
            </div>
            <Link 
                to="/admin" 
                className="w-full block py-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-transform hover:scale-105 shadow-lg"
            >
                Go to Admin Setup
            </Link>
        </div>
    </div>
);


// --- Main App Component ---
export default function App() {
  // Check configuration first
  const [isConfigured] = useState(systemConfig.isConfigured());

  const [sessions, setSessions] = useState<Session[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
      const cachedUserStr = localStorage.getItem(STORAGE_KEY_CACHED_USER);
      const storedUserId = localStorage.getItem(STORAGE_KEY_CURRENT_USER_ID);
      if (cachedUserStr) {
          try {
              const cachedUser = JSON.parse(cachedUserStr);
              if (cachedUser && cachedUser.id === storedUserId) return cachedUser;
          } catch (e) {}
      }
      return null;
  });

  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine); 
  
  // Only show loading splash if configured AND (optimizing load or no user)
  // If not configured, we skip loading to show setup screen immediately
  const [isLoading, setIsLoading] = useState(() => isConfigured && !currentUser); 
  
  const [connectionError, setConnectionError] = useState(false); 
  
  const [pendingGuestOrder, setPendingGuestOrder] = useState<{sessionId: string, items: OrderItem[], specialRequests: string} | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [notification, setNotification] = useState<{title: string, message: string, type?: 'info' | 'success' | 'error'} | null>(null);
  const [showShareModal, setShowShareModal] = useState<Session | null>(null);
  const [showCodeInput, setShowCodeInput] = useState(false);
  
  // Offline sync
  const { isOnline: offlineIsOnline, pendingOrders, syncOfflineOrders } = useOfflineSync();
  
  const [, setTick] = useState(0);
  const prevSessionsRef = useRef<Session[]>([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (!isConfigured) {
        // If not configured, skip firebase/supabase connection logic
        return;
    }

    // Test Connection on startup if configured
    api.testConnection().then(res => {
        if(!res.success) console.warn("Startup DB Connection Check Failed:", res.message);
    });

    const storedUserId = localStorage.getItem(STORAGE_KEY_CURRENT_USER_ID);
    const storedAdmin = localStorage.getItem(STORAGE_KEY_ADMIN_AUTH);
    if (storedAdmin === 'true') setIsSuperAdmin(true);

    // Subscriptions
    const unsubSessions = subscribeToSessions((data) => setSessions(data), (online) => setIsOnline(online));
    
    const unsubUsers = subscribeToUsers((data) => {
      setUsers(data);
      if (storedUserId) {
        const found = data.find(u => u.id === storedUserId);
        if (found) {
            if (found.isBlocked) {
                handleLogout();
                setNotification({ title: "Access Denied", message: "Your account has been suspended.", type: 'error' });
            } else {
                setCurrentUser(found);
                localStorage.setItem(STORAGE_KEY_CACHED_USER, JSON.stringify(found));
            }
        }
      }
      setIsLoading(false); 
      setConnectionError(false);
    }, () => {
       setIsLoading(false);
       if (!localStorage.getItem(STORAGE_KEY_CACHED_USER)) setConnectionError(true);
    });

    const unsubRestaurants = subscribeToRestaurants((data) => setRestaurants(data));

    const timer = setInterval(() => { setTick(t => t + 1); }, 60000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubSessions();
      unsubUsers();
      unsubRestaurants();
      clearInterval(timer);
    };
  }, [isConfigured]);

  // ... (Notification Logic matches previous) ...
    // --- Notification Logic ---
  useEffect(() => {
    if (!currentUser || !isConfigured) return;

    const prevSessions = prevSessionsRef.current;
    // Check for new orders in sessions created by current user
    sessions.forEach(session => {
        if (session.creatorId === currentUser.id) {
            const prevSession = prevSessions.find(s => s.id === session.id);
            if (prevSession && session.orders.length > prevSession.orders.length) {
                const latestOrder = session.orders[session.orders.length - 1];
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                    audio.volume = 0.5;
                    audio.play().catch(e => console.log('Audio play failed'));
                } catch (e) {}

                setNotification({
                    title: 'New Order Received!',
                    message: `${latestOrder.userName} placed an order in "${session.name}"`,
                    type: 'info'
                });
            }
        }
    });
    
    prevSessionsRef.current = sessions;
  }, [sessions, currentUser, isConfigured]);

  useEffect(() => {
      if(notification) {
          const timer = setTimeout(() => setNotification(null), 5000);
          return () => clearTimeout(timer);
      }
  }, [notification]);

  // ... (Auth Handlers match previous) ...
  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_KEY_CURRENT_USER_ID, user.id);
    localStorage.setItem(STORAGE_KEY_CACHED_USER, JSON.stringify(user));
    
    if (pendingGuestOrder) {
        const orderData: Order = {
            id: (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString()),
            userId: user.id,
            userName: `${user.firstName} ${user.lastName}`,
            items: pendingGuestOrder.items,
            status: OrderStatus.PENDING,
            timestamp: Date.now(),
            specialRequests: pendingGuestOrder.specialRequests
        };
        handleAddOrder(pendingGuestOrder.sessionId, orderData);
        setPendingGuestOrder(null);
        setShowAuthModal(false);
        setNotification({ title: "Order Placed", message: "Your guest order has been submitted successfully!", type: 'success' });
    }
  };

  const handleRegister = async (user: User) => {
    try {
        await api.upsertUser(user);
        handleLogin(user); 
        setNotification({ title: "Welcome!", message: "Your profile has been created.", type: 'success' });
    } catch (e: any) {
        const msg = e instanceof Error ? e.message : "Registration failed";
        setNotification({ title: "Registration Failed", message: msg, type: 'error' });
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setIsSuperAdmin(false);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER_ID);
    localStorage.removeItem(STORAGE_KEY_CACHED_USER); 
    localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH);
    window.location.hash = '/'; 
  };

  const handleAdminLogin = () => {
      setIsSuperAdmin(true);
      localStorage.setItem(STORAGE_KEY_ADMIN_AUTH, 'true');
  };


  // ... (Action Handlers match previous) ...
  const handleCreateSession = async (name: string, restaurantId: string, fees: SessionFees, menuUrl?: string) => {
    if (!currentUser) return;
    const newSession: Session = {
      id: `order_${Date.now()}`,
      name,
      creatorId: currentUser.id,
      createdAt: Date.now(),
      expiresAt: Date.now() + (30 * 60 * 1000),
      isActive: true,
      orders: [],
      restaurantId,
      fees,
      menuUrl,
      accessCode: Math.floor(1000 + Math.random() * 9000).toString() 
    };
    try {
        await api.createSession(newSession);
        setNotification({ title: "Session Created", message: `${name} is now active.`, type: 'success' });
    } catch(e: any) {
        setNotification({ title: "Error", message: e.message, type: 'error' });
    }
  };

  const handleCloseSession = async (id: string) => {
    const session = sessions.find(s => s.id === id);
    if (session) {
        try {
            await api.toggleSessionStatus(session);
            setNotification({ title: "Session Updated", message: `Session status updated.`, type: 'info' });
        } catch(e: any) {
            setNotification({ title: "Error", message: e.message, type: 'error' });
        }
    }
  };

  const handleDeleteSession = async (id: string) => {
    try {
        await api.deleteSession(id);
        setNotification({ title: "Success", message: "Session deleted.", type: 'success' });
    } catch (e: any) {
        setNotification({ title: "Error", message: e.message, type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
      if (currentUser && userId === currentUser.id) return;
      try {
          await api.deleteUser(userId);
          setNotification({ title: "Success", message: "User deleted.", type: 'success' });
      } catch(e: any) {
          setNotification({ title: "Error", message: e.message, type: 'error' });
      }
  };

  const handleUpdateUser = async (user: User) => {
      try {
          await api.upsertUser(user);
          setCurrentUser(user);
          localStorage.setItem(STORAGE_KEY_CACHED_USER, JSON.stringify(user));
          setNotification({ title: "Success", message: "Profile updated.", type: 'success' });
      } catch(e: any) {
          setNotification({ title: "Error", message: e.message, type: 'error' });
      }
  };

  const handleDeleteRestaurant = async (id: string) => {
      try {
          await api.deleteRestaurant(id);
          setNotification({ title: "Success", message: "Restaurant deleted.", type: 'success' });
      } catch(e: any) {
          setNotification({ title: "Error", message: e.message, type: 'error' });
      }
  };

  const handleAddOrder = async (sessionId: string, order: Order) => {
      try {
          await api.addOrderToSession(sessionId, order);
      } catch(e: any) {
          setNotification({ title: "Error", message: e.message, type: 'error' });
      }
  };

  const handleUpdateOrder = async (sessionId: string, updatedOrder: Order) => {
      try {
          await api.updateOrderInSession(sessionId, updatedOrder);
      } catch(e: any) {
          setNotification({ title: "Error", message: e.message, type: 'error' });
      }
  };

  const handleDeleteOrder = async (sessionId: string, orderId: string) => {
      try {
          await api.deleteOrderFromSession(sessionId, orderId);
          setNotification({ title: "Success", message: "Order deleted.", type: 'success' });
      } catch (e: any) {
          setNotification({ title: "Error", message: e.message, type: 'error' });
      }
  };

  const handleBulkStatusChange = async (sessionId: string, status: OrderStatus) => {
      try {
          await api.bulkUpdateOrderStatus(sessionId, status);
          setNotification({ title: "Success", message: "Statuses updated.", type: 'info' });
      } catch (e: any) {
          setNotification({ title: "Error", message: e.message, type: 'error' });
      }
  };

  const handleGuestOrderSubmit = (sessionId: string, items: OrderItem[], specialRequests: string) => {
      setPendingGuestOrder({ sessionId, items, specialRequests });
      setShowAuthModal(true);
  };

  // Sync offline orders when coming back online
  useEffect(() => {
      if (isOnline && pendingOrders.length > 0) {
          syncOfflineOrders(async (orders) => {
              for (const offlineOrder of orders) {
                  try {
                      if (offlineOrder.type === 'create') {
                          await api.addOrderToSession(offlineOrder.sessionId, offlineOrder.order);
                      } else if (offlineOrder.type === 'update') {
                          await api.updateOrderInSession(offlineOrder.sessionId, offlineOrder.order);
                      } else if (offlineOrder.type === 'delete') {
                          await api.deleteOrderFromSession(offlineOrder.sessionId, offlineOrder.order.id);
                      }
                  } catch (error) {
                      console.error('Failed to sync order:', error);
                  }
              }
          });
      }
  }, [isOnline, pendingOrders, syncOfflineOrders]);

  // --- Render Logic ---

  if (isLoading) return <SplashScreen />;

  // ... (rest of filters: todaySessions, etc.) ...
  const todaySessions = sessions.filter(s => {
      const sessionDate = new Date(s.createdAt).toDateString();
      const todayDate = new Date().toDateString();
      return sessionDate === todayDate; 
  });
  const myCreatedSessions = sessions.filter(s => s.creatorId === currentUser?.id);
  const joinedSessions = sessions.filter(s => s.creatorId !== currentUser?.id && s.orders.some(o => o.userId === currentUser?.id));

  return (
    <HashRouter>
      <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
         {/* Warning Banner if Unconfigured */}
         {!isConfigured && (
             <div className="bg-red-600 text-white px-4 py-2 text-center text-sm font-bold flex justify-center items-center gap-2">
                 <AlertTriangle className="w-4 h-4" />
                 System Not Configured. 
                 <Link to="/admin" className="underline text-white hover:text-blue-100 ml-1">Go to Admin Panel</Link>
                 to connect database.
             </div>
         )}

         {/* Navbar */}
         <nav className="bg-slate-900 text-white shadow-md sticky top-0 z-40">
            <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2">
                    <div className="bg-orange-500 p-1.5 rounded-lg">
                        <Egg className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">{APP_NAME}</span>
                    
                    {isConfigured && (
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ml-2 border ${isOnline ? 'bg-green-900/50 border-green-500 text-green-400' : 'bg-red-900/50 border-red-500 text-red-400'}`}>
                            {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                            {isOnline ? 'LIVE' : 'OFFLINE'}
                        </div>
                    )}
                </Link>

                <div className="flex items-center gap-4 text-sm">
                    <button onClick={() => setShowCodeInput(true)} className="hover:text-orange-300 transition-colors flex items-center gap-1" title="Join Session">
                        <KeyRound className="w-4 h-4" /> <span className="hidden sm:inline">Join</span>
                    </button>
                    {currentUser ? (
                        <button onClick={() => setShowProfile(true)} className="hover:text-orange-300 transition-colors flex items-center gap-1">
                            <UserIcon className="w-4 h-4" /> <span className="hidden sm:inline">{currentUser.firstName}</span>
                        </button>
                    ) : (
                        <button onClick={() => setShowAuthModal(true)} className="text-white hover:text-orange-300 font-bold text-sm">Sign In</button>
                    )}
                    <Link to="/admin" className="hover:text-orange-300 transition-colors flex items-center gap-1"><ShieldCheck className="w-4 h-4" /><span className="hidden sm:inline">Admin</span></Link>
                    {currentUser && <button onClick={handleLogout} className="hover:text-red-400 transition-colors" title="Logout"><LogOut className="w-4 h-4" /></button>}
                </div>
            </div>
         </nav>

         {notification && <Toast title={notification.title} message={notification.message} onClose={() => setNotification(null)} type={notification.type} />}
         
         {/* Modals */}
         {showProfile && currentUser && <UserProfile user={currentUser} onUpdate={handleUpdateUser} onClose={() => setShowProfile(false)} />}
         {showAuthModal && !currentUser && (
             <div className="fixed inset-0 bg-slate-900/80 z-50 flex items-center justify-center p-4 animate-fade-in">
                 <div className="relative w-full max-w-md">
                     <button onClick={() => setShowAuthModal(false)} className="absolute top-4 right-4 z-10 bg-white rounded-full p-1 text-slate-500 hover:text-slate-900 shadow-sm"><X className="w-5 h-5" /></button>
                     <Auth users={users} onLogin={handleLogin} onRegister={handleRegister} onCheckUser={api.checkUserExists} />
                 </div>
             </div>
         )}
         {showShareModal && <ShareSessionModal session={showShareModal} onClose={() => setShowShareModal(null)} />}
         {showCodeInput && (
             <SessionCodeInput 
                 sessions={sessions} 
                 onSessionFound={(session) => {
                     setShowCodeInput(false);
                     window.location.hash = `/session/${session.id}`;
                 }} 
                 onClose={() => setShowCodeInput(false)} 
             />
         )}
         
         {/* PWA Install Prompt */}
         <PWAInstallPrompt />

         <Routes>
            {/* Home Route - Handles both Unconfigured and Normal States */}
            <Route path="/" element={
                !isConfigured ? (
                    <SetupLandingPage />
                ) : !currentUser ? (
                    <Auth users={users} onLogin={handleLogin} onRegister={handleRegister} onCheckUser={api.checkUserExists} />
                ) : (
                    <div className="max-w-6xl mx-auto p-4 space-y-8">
                         {/* ... Header Section ... */}
                        <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-8 text-white shadow-xl relative overflow-hidden">
                            <div className="relative z-10"><h1 className="text-3xl md:text-4xl font-bold mb-2">YallaFtar! 🍳</h1><p className="text-slate-300 text-lg max-w-xl">Good morning, {currentUser.firstName}. Ready to organize breakfast or grab a bite?</p></div>
                            <div className="absolute right-0 top-0 h-full w-1/3 opacity-10"><Coffee className="w-full h-full text-white transform rotate-12 translate-x-10 -translate-y-10" /></div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-8">
                                {/* Create Session Block */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                                    <div className="flex items-center gap-2 mb-4"><Plus className="w-5 h-5 text-orange-600" /><h2 className="text-lg font-bold text-slate-800">Start a Breakfast Session</h2></div>
                                    <AdminPanel isAuthenticated={true} onLoginSuccess={() => {}} onLogout={() => {}} restaurants={restaurants} sessions={sessions} onAddRestaurant={() => {}} onUpdateRestaurant={() => {}} onDeleteRestaurant={() => {}} onCreateSession={handleCreateSession} onCloseSession={() => {}} onDeleteSession={() => {}} embeddedCreationMode={true} />
                                </div>

                                {/* TODAY'S SESSIONS */}
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-orange-500" /> Today's Sessions</h2>
                                    <div className="space-y-4">
                                        {todaySessions.length === 0 ? ( <div className="bg-slate-100 p-6 rounded-xl text-center border border-dashed border-slate-300"><p className="text-slate-500 italic">No sessions created today.</p></div> ) : (
                                            todaySessions.map(session => {
                                                const isClosed = !session.isActive || Date.now() > session.expiresAt;
                                                const myOrder = session.orders.find(o => o.userId === currentUser.id);
                                                const timeLeft = Math.max(0, Math.ceil((session.expiresAt - Date.now()) / 60000));
                                                return (
                                                    <div key={session.id} className={`bg-white p-5 rounded-xl shadow-sm border-l-4 transition-all ${session.isActive ? 'border-orange-500' : 'border-slate-300 opacity-90'}`}>
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div><h3 className="font-bold text-slate-900">{session.name}</h3><p className="text-xs text-slate-500">From: {users.find(u => u.id === session.creatorId)?.firstName || 'Unknown'}</p></div>
                                                        </div>
                                                        <div className="flex justify-between items-end mt-4">
                                                            <div className="text-xs">
                                                                {!isClosed ? <span className="flex items-center font-bold text-orange-600"><Clock className="w-3 h-3 mr-1" /> {timeLeft}m left</span> : <span className="flex items-center text-slate-400 font-medium"><StopCircle className="w-3 h-3 mr-1" /> Time Up</span>}
                                                            </div>
                                                            {!isClosed ? (
                                                                myOrder ? <Link to={`/session/${session.id}`} className="px-4 py-2 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm flex items-center"><Edit className="w-4 h-4 mr-2" /> Edit Order</Link> : <Link to={`/session/${session.id}`} className="px-4 py-2 bg-orange-600 text-white text-sm font-bold rounded-lg hover:bg-orange-700 transition-colors shadow-sm">Place Order</Link>
                                                            ) : (
                                                                myOrder ? <Link to={`/session/${session.id}`} className="px-4 py-2 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center">View My Order</Link> : <button disabled className="px-4 py-2 bg-slate-200 text-slate-400 text-sm font-bold rounded-lg cursor-not-allowed">Session Closed</button>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                {/* My Sessions */}
                                <div>
                                    <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><LayoutDashboard className="w-5 h-5 text-slate-500" /> My Created Sessions</h2>
                                    {myCreatedSessions.length === 0 ? ( <p className="text-slate-400 italic">You haven't created any sessions yet.</p> ) : (
                                        <div className="grid gap-4">
                                            {myCreatedSessions.map(session => (
                                                <div key={session.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                                                    <div>
                                                        <div className="flex items-center gap-2"><h3 className="font-bold text-slate-900">{session.name}</h3><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-mono font-bold flex items-center gap-1 border border-slate-200"><KeyRound className="w-3 h-3" /> {session.accessCode}</span></div>
                                                        <p className="text-sm text-slate-500 mt-1">{new Date(session.createdAt).toLocaleDateString()} • {session.orders.length} orders</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        {session.isActive && ( <button onClick={() => setShowShareModal(session)} className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Share Session"><Share2 className="w-5 h-5" /></button> )}
                                                        <Link to={`/session/${session.id}/dashboard`} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-semibold hover:bg-slate-200 transition-colors">Manage</Link>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* History */}
                                {joinedSessions.length > 0 && (
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2"><History className="w-5 h-5 text-slate-500" /> Joined Sessions History</h2>
                                        <div className="grid gap-4">
                                            {joinedSessions.map(session => (
                                                <div key={session.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center opacity-80 hover:opacity-100 transition-opacity">
                                                    <div><h3 className="font-bold text-slate-700">{session.name}</h3><p className="text-xs text-slate-500">From: {users.find(u => u.id === session.creatorId)?.firstName} • {new Date(session.createdAt).toLocaleDateString()}</p></div>
                                                    <Link to={`/session/${session.id}`} className="px-3 py-1.5 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-100 transition-colors">View Order</Link>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Right Column (Admin Shortcut for Desktop) - Hidden on mobile by grid */}
                            <div className="lg:col-span-1 hidden lg:block">
                                {/* Re-use the embedded admin panel for quick access */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 sticky top-6">
                                     <div className="flex items-center gap-2 mb-4"><Plus className="w-5 h-5 text-orange-600" /><h2 className="text-lg font-bold text-slate-800">Quick Start</h2></div>
                                     <AdminPanel isAuthenticated={true} onLoginSuccess={() => {}} onLogout={() => {}} restaurants={restaurants} sessions={sessions} onAddRestaurant={() => {}} onUpdateRestaurant={() => {}} onDeleteRestaurant={() => {}} onCreateSession={handleCreateSession} onCloseSession={() => {}} onDeleteSession={() => {}} embeddedCreationMode={true} />
                                </div>
                            </div>
                        </div>
                    </div>
                )
            } />
            
            <Route path="/session/:sessionId" element={<OrderHandler sessions={sessions} restaurants={restaurants} currentUser={currentUser} onAddOrder={handleAddOrder} onUpdateOrder={handleUpdateOrder} onGuestSubmit={(items, specialRequests) => handleGuestOrderSubmit(window.location.hash.split('/session/')[1], items, specialRequests)} />} />
            
            <Route path="/session/:sessionId/dashboard" element={
                currentUser ? <DashboardHandler sessions={sessions} restaurants={restaurants} currentUser={currentUser} users={users} isSuperAdmin={isSuperAdmin} onAddOrder={handleAddOrder} onUpdateOrder={handleUpdateOrder} onDeleteOrder={handleDeleteOrder} onBulkStatusChange={handleBulkStatusChange} onCloseSession={handleCloseSession} /> : <Auth users={users} onLogin={handleLogin} onRegister={handleRegister} />
            } />
            
            {/* ADMIN ROUTE: Allows public access to render AdminPanel (which handles its own login) */}
            <Route path="/admin" element={
                 <AdminPanel 
                    restaurants={restaurants} 
                    onAddRestaurant={async (r) => { try { await api.addRestaurant(r); setNotification({ title: "Success", message: "Restaurant added.", type: 'success' }); } catch(e: any) { setNotification({ title: "Error", message: e.message, type: 'error' }); } }} 
                    onUpdateRestaurant={async (r) => { try { await api.updateRestaurant(r); setNotification({ title: "Success", message: "Restaurant updated.", type: 'success' }); } catch(e: any) { setNotification({ title: "Error", message: e.message, type: 'error' }); } }} 
                    onDeleteRestaurant={handleDeleteRestaurant} 
                    onCreateSession={handleCreateSession} 
                    onCloseSession={handleCloseSession} 
                    onDeleteSession={handleDeleteSession} 
                    sessions={sessions} 
                    users={users} 
                    onToggleUserBlock={async (uid) => { const user = users.find(u => u.id === uid); if(user) { try { await api.toggleUserBlock(uid, !user.isBlocked); setNotification({ title: "Success", message: `User ${!user.isBlocked ? 'blocked' : 'unblocked'}.`, type: 'info' }); } catch (e: any) { setNotification({ title: "Error", message: e.message, type: 'error' }); } } }} 
                    onDeleteUser={handleDeleteUser} 
                    onUpdateUser={handleUpdateUser} 
                    isAuthenticated={isSuperAdmin} 
                    onLoginSuccess={handleAdminLogin} 
                    onLogout={() => { setIsSuperAdmin(false); localStorage.removeItem(STORAGE_KEY_ADMIN_AUTH); }} 
                />
            } />
         </Routes>
      </div>
    </HashRouter>
  );
}

// Helper wrappers
const OrderHandler = ({ sessions, restaurants, currentUser, onAddOrder, onUpdateOrder, onGuestSubmit }: any) => {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [accessCodeInput, setAccessCodeInput] = useState('');
    const [isAccessGranted, setIsAccessGranted] = useState(false);
    const [accessError, setAccessError] = useState('');
    const session = sessions.find((s: Session) => s.id === sessionId);
    
    useEffect(() => {
        if (!session) return;
        const storedCode = localStorage.getItem(`access_code_${sessionId}`);
        if (storedCode === session.accessCode) setIsAccessGranted(true);
    }, [session, sessionId]);

    if (!session) return <div className="p-8 text-center">Loading session...</div>;
    
    if (!isAccessGranted) {
        if (currentUser && currentUser.id === session.creatorId) {
             setIsAccessGranted(true);
        } else {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
                    <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-sm border border-slate-200">
                        <div className="bg-slate-900 p-3 rounded-full inline-block mb-4"><KeyRound className="w-8 h-8 text-orange-400" /></div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Enter Access Code</h2>
                        <form onSubmit={(e) => { e.preventDefault(); if (accessCodeInput === session.accessCode) { setIsAccessGranted(true); localStorage.setItem(`access_code_${sessionId}`, accessCodeInput); } else { setAccessError('Incorrect code.'); } }}>
                            <input type="text" maxLength={4} placeholder="0000" value={accessCodeInput} onChange={(e) => { setAccessCodeInput(e.target.value.replace(/\D/g, '')); setAccessError(''); }} className="w-full text-center text-3xl tracking-widest font-mono px-4 py-3 bg-blue-50 focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors mb-4" />
                            {accessError && <p className="text-red-500 text-sm font-bold mb-4">{accessError}</p>}
                            <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors">Enter Session</button>
                        </form>
                        <Link to="/" className="block mt-6 text-slate-500 hover:text-slate-900 text-sm">Return Home</Link>
                    </div>
                </div>
            );
        }
    }
    let restaurant = restaurants.find((r: Restaurant) => r.id === session.restaurantId);
    if (session.restaurantId === OTHER_RESTAURANT_ID) restaurant = { id: OTHER_RESTAURANT_ID, name: 'Custom Order', menu: [] };
    else if (!restaurant) restaurant = DEFAULT_RESTAURANT;
    const existingOrder = currentUser ? session.orders.find((o: Order) => o.userId === currentUser.id) : undefined;
    const isClosed = !session.isActive || Date.now() > session.expiresAt;
    if (isClosed && !existingOrder) return <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center"><div className="bg-slate-100 p-4 rounded-full mb-4"><Clock className="w-12 h-12 text-slate-400" /></div><h2 className="text-2xl font-bold text-slate-800">Session Closed</h2><Link to="/" className="mt-6 px-6 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">Return Home</Link></div>;
    return <OrderPage session={session} restaurant={restaurant} currentUser={currentUser} existingOrder={existingOrder} onPlaceOrder={(order) => onAddOrder(sessionId, order)} onUpdateOrder={(order) => onUpdateOrder(sessionId, order)} onBack={() => navigate('/')} onGuestSubmit={(items, specialRequests) => onGuestSubmit(items, specialRequests)} />;
};

const DashboardHandler = ({ sessions, restaurants, currentUser, users, isSuperAdmin, onAddOrder, onUpdateOrder, onDeleteOrder, onBulkStatusChange, onCloseSession }: any) => {
    const { sessionId } = useParams();
    const session = sessions.find((s: Session) => s.id === sessionId);
    if (!session) return <div className="p-8 text-center">Loading dashboard...</div>;
    let restaurant = restaurants.find((r: Restaurant) => r.id === session.restaurantId);
    if (session.restaurantId === OTHER_RESTAURANT_ID) restaurant = { id: OTHER_RESTAURANT_ID, name: 'Custom Order', menu: [] };
    else if (!restaurant) restaurant = DEFAULT_RESTAURANT;
    const creator = users.find((u: User) => u.id === session.creatorId);
    return <Dashboard session={session} restaurant={restaurant} currentUser={currentUser} creatorProfile={creator} users={users} isSuperAdmin={isSuperAdmin} onAddOrder={onAddOrder} onUpdateOrder={onUpdateOrder} onDeleteOrder={onDeleteOrder} onBulkStatusChange={onBulkStatusChange} onCloseSession={onCloseSession} />;
};
