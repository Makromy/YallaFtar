
import React, { useState } from 'react';
import { User } from '../types';
import { UserCircle, ArrowRight, Phone, Globe, AlertCircle } from 'lucide-react';

interface AuthProps {
  users: User[];
  onLogin: (user: User) => void;
  onRegister: (user: User) => void;
}

const COUNTRY_CODES = [
  { code: '20', label: 'Egypt (+20)', flag: '🇪🇬' },
  { code: '966', label: 'Saudi Arabia (+966)', flag: '🇸🇦' },
  { code: '971', label: 'UAE (+971)', flag: '🇦🇪' },
  { code: '1', label: 'USA (+1)', flag: '🇺🇸' },
];

export const Auth: React.FC<AuthProps> = ({ users, onLogin, onRegister }) => {
  const [countryCode, setCountryCode] = useState('20');
  const [localNumber, setLocalNumber] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  // Helper to construct full international number
  const getFullMobile = () => {
    // Remove leading zero if present (e.g. 010 -> 10)
    const cleanLocal = localNumber.replace(/^0+/, '');
    return `${countryCode}${cleanLocal}`;
  };

  const handleMobileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const fullMobile = getFullMobile();
    
    const existingUser = users.find(u => u.mobile === fullMobile);
    if (existingUser) {
      if (existingUser.isBlocked) {
          setError("Access Denied: Your account has been blocked by the administrator.");
          return;
      }
      onLogin(existingUser);
    } else {
      setIsRegistering(true);
    }
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `user_${Date.now()}`,
      mobile: getFullMobile(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      isBlocked: false
    };
    onRegister(newUser);
  };

  if (isRegistering) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Welcome to YallaFtar!</h2>
          <p className="text-slate-500 mb-6">Create your profile to start ordering.</p>
          
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">First Name</label>
                    <input
                    type="text"
                    required
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-50 focus:bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Last Name</label>
                    <input
                    type="text"
                    required
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-blue-50 focus:bg-white text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none transition-colors"
                    />
                </div>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Mobile Number</label>
                <div className="flex items-center gap-2 w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500">
                    <Phone className="w-4 h-4" />
                    <span>+{getFullMobile()}</span>
                </div>
            </div>
            <button type="submit" className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center">
              Complete Registration <ArrowRight className="w-4 h-4 ml-2" />
            </button>
            <button type="button" onClick={() => setIsRegistering(false)} className="w-full text-slate-500 text-sm hover:underline">
                Back
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-slate-200 text-center">
        <div className="bg-orange-100 p-4 rounded-full inline-flex mb-6">
            <UserCircle className="w-12 h-12 text-orange-600" />
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">YallaFtar Login</h1>
        <p className="text-slate-500 mb-8">Enter your mobile number to continue.</p>

        <form onSubmit={handleMobileSubmit} className="space-y-4">
            <div className="flex gap-2">
                {/* Country Code Select */}
                <div className="relative w-1/3">
                    <select
                        value={countryCode}
                        onChange={(e) => setCountryCode(e.target.value)}
                        className="w-full appearance-none pl-3 pr-8 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none bg-blue-50 focus:bg-white font-medium text-slate-900 transition-colors"
                    >
                        {COUNTRY_CODES.map(c => (
                            <option key={c.code} value={c.code}>
                                {c.flag} +{c.code}
                            </option>
                        ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-slate-500">
                        <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                    </div>
                </div>

                {/* Local Number Input */}
                <div className="relative w-2/3">
                    <input
                        type="tel"
                        required
                        placeholder="10xxxxxxxxx"
                        value={localNumber}
                        onChange={e => {
                            setLocalNumber(e.target.value.replace(/\D/g, ''));
                            setError('');
                        }}
                        className="w-full px-4 py-3 bg-blue-50 focus:bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none text-lg font-medium transition-colors"
                    />
                </div>
            </div>
            
            {error && (
                <div className="flex items-start gap-2 p-3 bg-red-50 text-red-700 text-xs text-left rounded-lg border border-red-200">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                </div>
            )}

            <button type="submit" disabled={localNumber.length < 8} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                Continue
            </button>
        </form>
      </div>
    </div>
  );
};
