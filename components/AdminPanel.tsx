
import React, { useState, useRef, useEffect } from 'react';
import { Restaurant, Session, SessionFees, MenuItem, User } from '../types';
import { Lock, Plus, Download, Store, Trash2, Percent, FileSpreadsheet, Upload, Eye, StopCircle, Clock, DollarSign, Users, Shield, ShieldOff, Edit, X, Save, AlertTriangle, Database, Settings, Copy, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { systemConfig, api } from '../services/supabase';

interface AdminPanelProps {
  restaurants: Restaurant[];
  onAddRestaurant: (r: Restaurant) => void;
  onUpdateRestaurant: (r: Restaurant) => void;
  onDeleteRestaurant: (id: string) => void;
  onCreateSession: (name: string, restaurantId: string, fees: SessionFees) => void;
  onCloseSession: (id: string) => void;
  onDeleteSession: (id: string) => void;
  sessions: Session[];
  users?: User[];
  onToggleUserBlock?: (userId: string) => void;
  onDeleteUser?: (userId: string) => void;
  onUpdateUser?: (user: User) => void; 
  embeddedCreationMode?: boolean;
  isAuthenticated: boolean;
  onLoginSuccess: () => void;
  onLogout: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  restaurants, 
  onAddRestaurant, 
  onUpdateRestaurant, 
  onDeleteRestaurant,
  onCreateSession,
  onCloseSession,
  onDeleteSession,
  sessions,
  users = [],
  onToggleUserBlock,
  onDeleteUser,
  onUpdateUser,
  embeddedCreationMode = false,
  isAuthenticated,
  onLoginSuccess,
  onLogout
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'create_session' | 'manage_restaurants' | 'manage_users' | 'settings'>('create_session');
  
  // Custom Confirmation Modal State
  const [confirmModal, setConfirmModal] = useState<{
      title: string;
      message: string;
      onConfirm: () => void;
      isDestructive?: boolean;
  } | null>(null);

  // Session Creation State
  const [sessionName, setSessionName] = useState('');
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [fees, setFees] = useState<SessionFees>({ vatPercentage: 0, serviceFeePercentage: 0, deliveryFeeRaw: 0 });

  // User Editing State
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Settings State
  const currentConfig = systemConfig.getCredentials();
  const [configUrl, setConfigUrl] = useState(currentConfig.url || '');
  const [configKey, setConfigKey] = useState(currentConfig.key || '');
  const [configMessage, setConfigMessage] = useState('');
  const [copiedSql, setCopiedSql] = useState(false);

  const SQL_POLICIES = `
-- 1. Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- 2. Create Permissive Policies (since Auth is handled by App)
CREATE POLICY "Public Access Users" ON users FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Restaurants" ON restaurants FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Public Access Sessions" ON sessions FOR ALL TO anon USING (true) WITH CHECK (true);
  `.trim();

  const handleCopySql = () => {
      navigator.clipboard.writeText(SQL_POLICIES);
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2000);
  };

  // File Upload Refs
  const fileInputRefs = useRef<{[key: string]: HTMLInputElement | null}>({});

  // Initial Restaurant Selection Effect
  useEffect(() => {
      if (!selectedRestaurantId && restaurants.length > 0) {
          setSelectedRestaurantId(restaurants[0].id);
      }
  }, [restaurants, selectedRestaurantId]);

  // Force switch to settings if not configured and accessing admin panel directly
  useEffect(() => {
      if (!systemConfig.isConfigured() && !embeddedCreationMode) {
          setActiveTab('settings');
      }
  }, [embeddedCreationMode]);

  // Restaurant Creation State
  const [newRestaurantName, setNewRestaurantName] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'paysky') {
      onLoginSuccess();
      setError('');
    } else {
      setError('Invalid password');
    }
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
      e.preventDefault();
      setConfigMessage('Saving and connecting...');
      
      // Basic validation
      if(!configUrl.startsWith('https://') || configKey.length < 20) {
          setConfigMessage('Error: Invalid URL or Key format.');
          return;
      }

      // Save
      systemConfig.saveCredentials(configUrl, configKey);
      // Page will reload in saveCredentials, but if not:
      setConfigMessage('Configuration Saved. Reloading...');
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRestaurantId) {
        alert("Please select a restaurant.");
        return;
    }

    let finalSessionName = sessionName.trim();
    if (!finalSessionName) {
        const restaurant = restaurants.find(r => r.id === selectedRestaurantId);
        const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        finalSessionName = `${restaurant?.name || 'Order'} - ${dateStr}`;
    }

    onCreateSession(finalSessionName, selectedRestaurantId, fees);
    setSessionName('');
    if (!embeddedCreationMode) alert("Session Created Successfully!");
  };

  const handleAddRestaurant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRestaurantName.trim()) return;
    const newRest: Restaurant = {
      id: `rest_${Date.now()}`,
      name: newRestaurantName,
      menu: []
    };
    onAddRestaurant(newRest);
    setNewRestaurantName('');
  };

  const downloadMenuTemplate = () => {
    const headers = ["id", "name", "category", "price", "description"];
    const rows = [
        ["101", "Classic Falafel (فلافل)", "Breakfast", "10.50", "Served with tahini and salad"],
        ["102", "Foul Medames (فول مدمس)", "Breakfast", "12.00", "Fava beans with olive oil and cumin"]
    ];
    const escapeCsv = (field: string) => `"${field.replace(/"/g, '""')}"`;
    const csvContent = [
        headers.join(","),
        ...rows.map(row => row.map(escapeCsv).join(","))
    ].join("\n");

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.href = url;
    downloadAnchorNode.setAttribute("download", "menu_template.csv");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const parseCSV = (csvText: string): MenuItem[] => {
      const lines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) return [];
      const parseLine = (text: string) => {
          const result = [];
          let cur = '';
          let inQuote = false;
          for (let i = 0; i < text.length; i++) {
              const char = text[i];
              if (char === '"') {
                  if (inQuote && text[i + 1] === '"') { cur += '"'; i++; } else { inQuote = !inQuote; }
              } else if (char === ',' && !inQuote) {
                  result.push(cur.trim()); cur = '';
              } else { cur += char; }
          }
          result.push(cur.trim());
          return result;
      };
      const headers = parseLine(lines[0]).map(h => h.toLowerCase().replace(/^"|"$/g, ''));
      const items: MenuItem[] = [];
      for (let i = 1; i < lines.length; i++) {
          const row = parseLine(lines[i]);
          if (row.length < 2) continue;
          const getVal = (keys: string[], idx: number) => {
              const foundIdx = headers.findIndex(h => keys.includes(h));
              return (foundIdx > -1 ? row[foundIdx] : row[idx])?.replace(/^"|"$/g, '') || '';
          };
          const name = getVal(['name', 'item'], 1);
          if (name) {
              items.push({
                  id: getVal(['id'], 0) || `csv_${Date.now()}_${i}`,
                  name: name,
                  category: getVal(['category', 'cat'], 2) || 'General',
                  price: parseFloat(getVal(['price', 'cost'], 3).replace(/[^0-9.]/g, '')) || 0,
                  description: getVal(['description', 'desc'], 4)
              });
          }
      }
      return items;
  };

  const handleMenuUpload = (restaurantId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = e.target.files?.[0];
    if (file) {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      fileReader.readAsText(file, "UTF-8");
      fileReader.onload = event => {
        try {
            const content = event.target?.result as string;
            let validatedMenu: MenuItem[] = [];
            if (isCsv) {
                validatedMenu = parseCSV(content);
            } else {
                const parsed = JSON.parse(content);
                if (Array.isArray(parsed)) {
                    validatedMenu = parsed.map((item: any, idx) => ({
                        id: item.id || `imported_${Date.now()}_${idx}`,
                        name: item.name || "Unknown Item",
                        category: item.category || "General",
                        price: Number(item.price) || 0,
                        description: item.description || ""
                    }));
                }
            }
            if (validatedMenu.length > 0) {
                const restaurant = restaurants.find(r => r.id === restaurantId);
                if (restaurant) {
                    onUpdateRestaurant({ ...restaurant, menu: validatedMenu });
                    alert(`Successfully imported ${validatedMenu.length} items for ${restaurant.name}`);
                }
            } else {
                alert("No valid items found in file.");
            }
        } catch (err) {
            alert("Error parsing file.");
        }
        if(fileInputRefs.current[restaurantId]) fileInputRefs.current[restaurantId]!.value = "";
      };
    }
  };

  const isSessionOpen = (session: Session) => {
      if (!session.isActive) return false;
      return session.expiresAt ? Date.now() < session.expiresAt : true;
  };

  // Embedded Mode (For Users creating sessions)
  if (embeddedCreationMode) {
      return (
        <div className="bg-white">
             <form onSubmit={handleCreateSession}>
                <div className="space-y-4">
                     <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Session Name</label>
                        <input type="text" value={sessionName} onChange={(e) => setSessionName(e.target.value)} placeholder="(Optional) Default: Restaurant - Date" className="w-full px-4 py-3 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">Select Restaurant</label>
                        <select value={selectedRestaurantId} onChange={(e) => setSelectedRestaurantId(e.target.value)} className="w-full px-4 py-3 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors">
                            <option value="" disabled>Select a restaurant...</option>
                            {restaurants.map(r => ( <option key={r.id} value={r.id}>{r.name}</option> ))}
                        </select>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div><label className="block text-xs uppercase font-bold text-slate-500 mb-2 flex items-center gap-1"><Percent className="w-3 h-3"/> VAT Rate</label><input type="number" min="0" step="0.1" value={fees.vatPercentage} onChange={(e) => setFees({...fees, vatPercentage: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors"/></div>
                        <div><label className="block text-xs uppercase font-bold text-slate-500 mb-2 flex items-center gap-1"><Percent className="w-3 h-3"/> Service Fee</label><input type="number" min="0" step="0.1" value={fees.serviceFeePercentage} onChange={(e) => setFees({...fees, serviceFeePercentage: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors"/></div>
                        <div><label className="block text-xs uppercase font-bold text-slate-500 mb-2 flex items-center gap-1"><DollarSign className="w-3 h-3"/> Delivery Fee</label><input type="number" min="0" step="0.01" value={fees.deliveryFeeRaw} onChange={(e) => setFees({...fees, deliveryFeeRaw: parseFloat(e.target.value) || 0})} className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors"/></div>
                    </div>
                    <div className="pt-2">
                        <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-md transition-all">Start Session (30 min)</button>
                    </div>
                </div>
            </form>
        </div>
      );
  }

  // Main Admin Panel Logic
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md border border-slate-200">
          <div className="text-center mb-6">
            <div className="bg-slate-900 p-3 rounded-full inline-block mb-3">
                <Lock className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900">System Admin</h1>
            <p className="text-slate-500">Enter password to manage system</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-4">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-blue-50 focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-all" placeholder="Password" />
            {error && <p className="text-red-500 text-sm font-medium">{error}</p>}
            <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors">Login</button>
          </form>
          <div className="mt-6 text-center">
            <Link to="/" className="text-slate-500 hover:text-slate-900 text-sm">Back to Home</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      <header className="bg-slate-900 text-white p-4 shadow-md sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <h1 className="text-xl font-bold flex items-center gap-2">
                <Store className="w-5 h-5 text-orange-400" /> 
                System Admin
            </h1>
            <div className="flex gap-4 text-sm">
                <Link to="/" className="hover:text-orange-300 transition-colors">View App</Link>
                <button onClick={onLogout} className="hover:text-red-300 transition-colors">Logout</button>
            </div>
          </div>
      </header>

      <div className="max-w-6xl mx-auto p-6">
        {/* Tabs Navigation */}
        <div className="flex flex-wrap gap-2 bg-white p-1.5 rounded-xl border border-slate-200 mb-8 shadow-sm w-fit">
            <button onClick={() => setActiveTab('create_session')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'create_session' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>Manage Sessions</button>
            <button onClick={() => setActiveTab('manage_restaurants')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'manage_restaurants' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>Restaurants</button>
            <button onClick={() => setActiveTab('manage_users')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all ${activeTab === 'manage_users' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>Users</button>
            <button onClick={() => setActiveTab('settings')} className={`px-5 py-2.5 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'settings' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}>
                <Settings className="w-4 h-4" /> Configuration
            </button>
        </div>

        {/* TAB: SETTINGS */}
        {activeTab === 'settings' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 animate-fade-in">
                 <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
                    <div className="bg-blue-50 p-3 rounded-full text-blue-600">
                        <Settings className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900">System Configuration</h2>
                        <p className="text-slate-500 mt-1">Connect the application to your white-label Supabase backend.</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                     {/* Config Form */}
                     <div>
                        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                            <Database className="w-4 h-4 text-slate-400" /> Connection Details
                        </h3>
                        <form onSubmit={handleSaveConfig} className="space-y-5">
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Supabase Project URL</label>
                                <input 
                                    type="text" 
                                    value={configUrl}
                                    onChange={e => setConfigUrl(e.target.value)}
                                    placeholder="https://your-project.supabase.co"
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm transition-shadow"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-slate-700 mb-2">Supabase Anon Key</label>
                                <input 
                                    type="password" 
                                    value={configKey}
                                    onChange={e => setConfigKey(e.target.value)}
                                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-sm transition-shadow"
                                />
                            </div>
                            
                            <div className="flex items-center gap-3 pt-2">
                                <button type="submit" className="px-6 py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl active:scale-95 flex-1">
                                    Save & Connect
                                </button>
                                <button type="button" onClick={() => { systemConfig.clearCredentials(); }} className="px-4 py-3 border border-red-200 text-red-600 font-bold rounded-lg hover:bg-red-50 transition-colors">
                                    Reset
                                </button>
                            </div>
                            {configMessage && (
                                <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-100 text-sm font-medium animate-fade-in">
                                    {configMessage}
                                </div>
                            )}
                        </form>
                     </div>

                     {/* Database Setup Helper */}
                     <div className="bg-slate-900 rounded-xl p-6 text-blue-100">
                         <h3 className="text-lg font-bold text-white mb-2">Database Setup</h3>
                         <p className="text-sm text-blue-300 mb-4">
                             Copy the SQL below and run it in your Supabase SQL Editor to create the required tables and policies.
                         </p>

                         <div className="relative group">
                            <div className="absolute top-2 right-2 flex gap-2">
                                <button 
                                    onClick={handleCopySql}
                                    className="p-2 bg-white/10 hover:bg-white/20 rounded text-white transition-colors flex items-center gap-1 text-xs font-bold"
                                >
                                    {copiedSql ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy SQL</>}
                                </button>
                            </div>
                            <pre className="bg-black/30 p-4 rounded-lg text-[10px] font-mono overflow-x-auto border border-white/10 h-64 custom-scrollbar leading-relaxed">
                                {SQL_POLICIES}
                            </pre>
                         </div>
                     </div>
                 </div>
            </div>
        )}

        {/* TAB: MANAGE ORDERS */}
        {activeTab === 'create_session' && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* ... existing orders table code ... */}
                 <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">System Sessions</h2>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">Super Admin Access</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                            <tr>
                                <th className="py-4 px-6">Session Name</th>
                                <th className="py-4 px-6">Creator</th>
                                <th className="py-4 px-6">Restaurant</th>
                                <th className="py-4 px-6">Created</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {sessions.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">No sessions found in system.</td>
                                </tr>
                            )}
                            {sessions.map(session => {
                                const open = isSessionOpen(session);
                                return (
                                    <tr key={session.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="py-4 px-6 font-medium text-slate-900">{session.name}</td>
                                        <td className="py-4 px-6 text-slate-500 text-xs font-mono">{session.creatorId}</td>
                                        <td className="py-4 px-6 text-slate-500">{restaurants.find(r => r.id === session.restaurantId)?.name || 'Unknown'}</td>
                                        <td className="py-4 px-6 text-slate-500">{new Date(session.createdAt).toLocaleString()}</td>
                                        <td className="py-4 px-6 text-center">
                                            <button type="button" onClick={(e) => { e.stopPropagation(); onCloseSession(session.id); }} className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold border shadow-sm transition-all active:scale-95 ${open ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                                {open ? <><Clock className="w-3 h-3 mr-1.5" /> ACTIVE</> : <><StopCircle className="w-3 h-3 mr-1.5" /> CLOSED</>}
                                            </button>
                                        </td>
                                        <td className="py-4 px-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Link to={`/session/${session.id}/dashboard`} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Eye className="w-4 h-4" /></Link>
                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmModal({ title: "Delete Session", message: "Are you sure?", onConfirm: () => onDeleteSession(session.id), isDestructive: true }); }} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        )}

        {/* TAB: MANAGE USERS */}
        {activeTab === 'manage_users' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 {/* ... existing users table code ... */}
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-slate-800">Registered Users</h2>
                    <div className="flex items-center gap-2 bg-indigo-50 px-3 py-1 rounded-full text-indigo-700 text-xs font-bold">
                        <Users className="w-4 h-4" /> {users.length} Users
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-800 font-bold border-b border-slate-200">
                            <tr>
                                <th className="py-4 px-6">Name</th>
                                <th className="py-4 px-6">Mobile</th>
                                <th className="py-4 px-6">Instapay ID</th>
                                <th className="py-4 px-6 text-center">Status</th>
                                <th className="py-4 px-6 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {users.map(user => (
                                <tr key={user.id} className={`hover:bg-slate-50 transition-colors ${user.isBlocked ? 'bg-red-50/50' : ''}`}>
                                    <td className="py-4 px-6 font-medium text-slate-900">{user.firstName} {user.lastName}</td>
                                    <td className="py-4 px-6 text-slate-500 font-mono">+{user.mobile}</td>
                                    <td className="py-4 px-6 text-slate-500">{user.instapayUsername || '-'}</td>
                                    <td className="py-4 px-6 text-center">
                                        {user.isBlocked ? <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-red-100 text-red-800">Blocked</span> : <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-800">Active</span>}
                                    </td>
                                    <td className="py-4 px-6 text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            {onToggleUserBlock && (
                                                <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleUserBlock(user.id); }} title={user.isBlocked ? "Unblock" : "Block"} className={`p-2 rounded-lg transition-colors ${user.isBlocked ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'}`}>
                                                    {user.isBlocked ? <Shield className="w-4 h-4" /> : <ShieldOff className="w-4 h-4" />}
                                                </button>
                                            )}
                                            <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingUser(user); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit className="w-4 h-4" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
        )}

        {/* TAB: MANAGE RESTAURANTS */}
        {activeTab === 'manage_restaurants' && (
             <div className="space-y-6">
                 {/* ... existing restaurants logic ... */}
                 <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800 mb-4">Add New Restaurant</h2>
                    <form onSubmit={handleAddRestaurant} className="flex gap-4">
                        <input type="text" value={newRestaurantName} onChange={(e) => setNewRestaurantName(e.target.value)} placeholder="Restaurant Name" className="flex-1 px-4 py-2 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-slate-900 transition-colors" />
                        <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold flex items-center"><Plus className="w-4 h-4 mr-2" /> Add</button>
                    </form>
                     {/* ... CSV logic ... */}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {restaurants.map(restaurant => (
                        <div key={restaurant.id} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div><h3 className="text-xl font-bold text-slate-900">{restaurant.name}</h3><p className="text-sm text-slate-500">{restaurant.menu.length} menu items</p></div>
                                {restaurants.length > 1 && ( <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmModal({ title: "Delete Restaurant", message: `Delete "${restaurant.name}"?`, onConfirm: () => onDeleteRestaurant(restaurant.id), isDestructive: true }); }} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 className="w-5 h-5" /></button> )}
                            </div>
                            <div className="border-t border-slate-100 pt-4">
                                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center"><Upload className="w-3 h-3 mr-1" /> Upload Menu (CSV/JSON)</label>
                                <div className="flex gap-2"><input type="file" accept=".csv, .json" ref={(el) => { fileInputRefs.current[restaurant.id] = el }} onChange={(e) => handleMenuUpload(restaurant.id, e)} className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200" /></div>
                            </div>
                        </div>
                    ))}
                </div>
             </div>
        )}
      </div>
      
      {/* CUSTOM CONFIRMATION MODAL */}
      {confirmModal && (
          <div className="fixed inset-0 bg-black/60 z-[150] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-slate-200 transform transition-all scale-100">
                  <div className={`flex items-center gap-3 mb-4 ${confirmModal.isDestructive ? 'text-red-600' : 'text-slate-900'}`}>
                      <AlertTriangle className="w-8 h-8 flex-shrink-0" />
                      <h3 className="text-lg font-bold leading-tight">{confirmModal.title}</h3>
                  </div>
                  <p className="text-slate-600 mb-6 leading-relaxed">{confirmModal.message}</p>
                  <div className="flex gap-3">
                      <button type="button" onClick={() => setConfirmModal(null)} className="flex-1 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                      <button type="button" onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }} className={`flex-1 py-2.5 text-white rounded-lg font-bold transition-colors shadow-sm ${confirmModal.isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-800'}`}>Confirm</button>
                  </div>
              </div>
          </div>
      )}

      {/* User Edit Modal */}
      {editingUser && (
          <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in">
                  <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          <Edit className="w-4 h-4 text-orange-400" /> Edit User
                      </h3>
                      <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
                  </div>
                  <div className="p-6 space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">First Name</label><input type="text" value={editingUser.firstName} onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})} className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-colors" /></div>
                          <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Last Name</label><input type="text" value={editingUser.lastName} onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})} className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-colors" /></div>
                      </div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Mobile (Read Only)</label><div className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-sm font-mono">+{editingUser.mobile}</div></div>
                      <div><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Instapay Username</label><input type="text" value={editingUser.instapayUsername || ''} onChange={(e) => setEditingUser({...editingUser, instapayUsername: e.target.value})} className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none text-sm transition-colors" placeholder="username@instapay" /></div>
                      <div className="pt-4 flex gap-3">
                           {onDeleteUser && ( <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setConfirmModal({ title: "Delete User", message: "Delete this user?", onConfirm: () => { onDeleteUser(editingUser.id); setEditingUser(null); }, isDestructive: true }); }} className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 transition-colors flex items-center justify-center"><Trash2 className="w-4 h-4 mr-2" /> Delete User</button> )}
                           {onUpdateUser && ( <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUpdateUser(editingUser); setEditingUser(null); }} className="flex-[2] py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-colors flex items-center justify-center"><Save className="w-4 h-4 mr-2" /> Save Changes</button> )}
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
