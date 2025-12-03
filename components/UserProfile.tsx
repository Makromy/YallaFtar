
import React, { useState } from 'react';
import { User } from '../types';
import { Save, ArrowLeft, CreditCard } from 'lucide-react';

interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  onClose: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({ user, onUpdate, onClose }) => {
  const [instapay, setInstapay] = useState(user.instapayUsername || '');
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({
        ...user,
        firstName,
        lastName,
        instapayUsername: instapay.trim()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-slate-900 p-4 flex items-center text-white">
                <button onClick={onClose} className="mr-4 hover:bg-white/10 p-2 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold">Edit Profile</h2>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                        <input
                            type="text"
                            required
                            value={firstName}
                            onChange={e => setFirstName(e.target.value)}
                            className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                        <input
                            type="text"
                            required
                            value={lastName}
                            onChange={e => setLastName(e.target.value)}
                            className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 outline-none transition-colors"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-600" /> Instapay Link / Username
                    </label>
                    <input
                        type="text"
                        value={instapay}
                        onChange={e => setInstapay(e.target.value)}
                        placeholder="Paste your Instapay link or username"
                        className="w-full px-3 py-2 bg-blue-50 focus:bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-colors"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                        This exact link/text will be shared with users via WhatsApp for payment.
                    </p>
                </div>

                <button type="submit" className="w-full bg-slate-900 text-white font-bold py-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center">
                    <Save className="w-4 h-4 mr-2" /> Save Changes
                </button>
            </form>
        </div>
    </div>
  );
};
