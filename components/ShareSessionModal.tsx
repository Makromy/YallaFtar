import React, { useState } from 'react';
import { Share2, Copy, MessageCircle, X, Check, QrCode } from 'lucide-react';
import { Session } from '../types';

interface ShareSessionModalProps {
  session: Session;
  onClose: () => void;
}

export const ShareSessionModal: React.FC<ShareSessionModalProps> = ({ session, onClose }) => {
  const [copied, setCopied] = useState(false);
  
  const sessionUrl = `${window.location.origin}/#/session/${session.id}`;
  const accessCode = session.accessCode;
  
  const shareText = `🍳 Join my breakfast session "${session.name}"!\n\nGo to: ${window.location.origin}\nEnter Code: ${accessCode}\n\nOr use direct link: ${sessionUrl}`;
  
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(sessionUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = sessionUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = accessCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'YallaFtar Session',
          text: `Join my breakfast session "${session.name}"!`,
          url: sessionUrl,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Share2 className="w-5 h-5 text-orange-400" />
            Share Session
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Session Info */}
          <div className="text-center">
            <h4 className="font-bold text-slate-900 text-lg">{session.name}</h4>
            <p className="text-slate-500 text-sm">Invite others to join your session</p>
          </div>

          {/* Access Code */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Access Code</label>
            <div className="flex items-center justify-between">
              <span className="text-3xl font-mono font-bold text-slate-900 tracking-widest">{accessCode}</span>
              <button
                onClick={handleCopyCode}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                title="Copy Code"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Direct Link */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Direct Link</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={sessionUrl}
                readOnly
                className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono text-slate-600"
              />
              <button
                onClick={handleCopyLink}
                className="p-2 text-slate-500 hover:text-slate-900 hover:bg-white rounded-lg transition-all"
                title="Copy Link"
              >
                {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Share Actions */}
          <div className="grid grid-cols-1 gap-3">
            {/* WhatsApp Share */}
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-3 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 transition-colors shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              Share via WhatsApp
            </a>

            {/* Native Share (if supported) */}
            {navigator.share && (
              <button
                onClick={handleNativeShare}
                className="flex items-center justify-center gap-3 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-colors shadow-lg"
              >
                <Share2 className="w-5 h-5" />
                Share
              </button>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h5 className="font-bold text-blue-900 text-sm mb-2">How to Join:</h5>
            <ol className="text-blue-800 text-sm space-y-1">
              <li>1. Go to YallaFtar app</li>
              <li>2. Enter the 4-digit access code</li>
              <li>3. Start ordering!</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};