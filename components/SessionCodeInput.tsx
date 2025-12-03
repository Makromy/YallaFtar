import React, { useState } from 'react';
import { KeyRound, ArrowRight } from 'lucide-react';
import { Session } from '../types';

interface SessionCodeInputProps {
  sessions: Session[];
  onSessionFound: (session: Session) => void;
  onClose: () => void;
}

export const SessionCodeInput: React.FC<SessionCodeInputProps> = ({ 
  sessions, 
  onSessionFound, 
  onClose 
}) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    const session = sessions.find(s => s.accessCode === code && s.isActive);
    
    if (session) {
      if (Date.now() > session.expiresAt) {
        setError('This session has expired');
        setIsLoading(false);
        return;
      }
      onSessionFound(session);
    } else {
      setError('Invalid or inactive session code');
    }
    
    setIsLoading(false);
  };

  const handleCodeChange = (value: string) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setCode(numericValue);
    setError('');
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-slate-900 px-6 py-4 text-center">
          <div className="bg-orange-500 p-3 rounded-full inline-block mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-white">Join Session</h3>
          <p className="text-slate-300 text-sm">Enter the 4-digit access code</p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <input
                type="text"
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                placeholder="0000"
                maxLength={4}
                className="w-full text-center text-4xl font-mono font-bold tracking-[0.5em] px-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-xl focus:border-orange-500 focus:bg-white outline-none transition-all"
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm font-medium mt-2 text-center">{error}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={code.length !== 4 || isLoading}
              className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Join Session
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <button
            onClick={onClose}
            className="w-full mt-4 text-slate-500 hover:text-slate-900 font-medium py-2 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};