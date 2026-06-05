import React, { useState } from 'react';
import {
  Award,
  Coins,
  RefreshCw,
  Undo2,
  Trophy,
  Sparkles,
  Share2,
  Twitter,
  Facebook,
  Copy,
  Check,
  Send
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../utils/translations';

interface GameOverProps {
  score: number;
  coinsCollected: number;
  isNewHighScore: boolean;
  onRetry: () => void;
  onBackToMenu: () => void;
  language?: 'en' | 'es' | 'fr';
}

export default function GameOver({ score, coinsCollected, isNewHighScore, onRetry, onBackToMenu, language = 'en' }: GameOverProps) {
  const t = translations[language as Language] || translations.en;
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState('');

  const getShareText = () => {
    return `🛹 Just finished a wild subway run in Subway Surf 3D! Score: ${score.toLocaleString()} points | Collected: ${coinsCollected} coins. ${
      isNewHighScore ? "🔥 NEW PERSONAL HIGH SCORE! " : ""
    }Can you outrun the collector? Play now! 🚨`;
  };

  const handleShareTwitter = () => {
    const text = getShareText();
    const url = window.location.href;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    triggerToast("Opening Twitter / X share card!");
  };

  const handleShareWhatsapp = () => {
    const text = getShareText();
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + window.location.href)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    triggerToast("Opening WhatsApp share card!");
  };

  const handleShareFacebook = () => {
    const url = window.location.href;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    triggerToast("Opening Facebook share card!");
  };

  const handleCopyClipboard = () => {
    navigator.clipboard.writeText(`${getShareText()} Run URL: ${window.location.href}`);
    setCopied(true);
    triggerToast("Stats copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const triggerToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast((prev) => (prev === msg ? '' : prev)), 3000);
  };

  return (
    <div id="gameover_overlay" className="absolute inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex flex-col justify-center items-center p-6 text-center select-none animate-fadeIn overflow-y-auto">
      <motion.div
        id="gameover_card"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 my-auto"
      >
        {/* Slogan */}
        <div className="space-y-1">
          <h2 className="text-4xl font-extrabold font-sans text-red-500 uppercase tracking-tight">{t.wipedOut}</h2>
          <p className="text-slate-400 text-xs uppercase font-bold tracking-widest">{t.inspectorsCaught}</p>
        </div>

        {/* High Score Celebration Burst */}
        {isNewHighScore && (
          <motion.div
            id="highscore_celebration"
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
            className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-3 flex items-center justify-center gap-2 text-yellow-400 font-bold text-sm"
          >
            <Sparkles className="w-5 h-5 text-yellow-400 animate-spin" />
            <span>{t.personalRecord}</span>
          </motion.div>
        )}

        {/* Stats grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2.5xl flex flex-col items-center">
            <Trophy className="w-5 h-5 text-slate-500 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{t.finalScore}</span>
            <span className="font-mono text-xl font-bold text-white mt-1">
              {score.toLocaleString()}
            </span>
          </div>

          <div className="bg-slate-950 border border-slate-850 p-4 rounded-2.5xl flex flex-col items-center">
            <Coins className="w-5 h-5 text-amber-500 mb-1" />
            <span className="text-[10px] text-slate-500 uppercase font-black tracking-wider">{t.coinsSaved}</span>
            <span className="font-mono text-xl font-bold text-amber-400 mt-1">
              +{coinsCollected}
            </span>
          </div>
        </div>

        {/* Social brag module */}
        <div className="bg-slate-950 border border-slate-850/60 p-4 rounded-2.5xl space-y-3">
          <p className="text-[11px] font-black uppercase text-yellow-500 tracking-wider flex items-center justify-center gap-1.5 leading-none">
            <Share2 className="w-3.5 h-3.5" />
            Brag / Share Your Run
          </p>
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handleShareTwitter}
              className="p-2.5 bg-slate-900 hover:bg-slate-850 text-sky-400 hover:text-sky-300 rounded-xl transition-all cursor-pointer border border-slate-800"
              title="Share on Twitter / X"
            >
              <Twitter className="w-5 h-5" />
            </button>
            <button
              onClick={handleShareWhatsapp}
              className="p-2.5 bg-slate-900 hover:bg-slate-850 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all cursor-pointer border border-slate-800"
              title="Share on WhatsApp"
            >
              <Send className="w-5 h-5" />
            </button>
            <button
              onClick={handleShareFacebook}
              className="p-2.5 bg-slate-900 hover:bg-slate-850 text-blue-500 hover:text-blue-400 rounded-xl transition-all cursor-pointer border border-slate-800"
              title="Share on Facebook"
            >
              <Facebook className="w-5 h-5" />
            </button>
            <button
              onClick={handleCopyClipboard}
              className="p-2.5 bg-slate-900 hover:bg-slate-850 text-yellow-500 hover:text-yellow-400 rounded-xl transition-all cursor-pointer border border-slate-800"
              title="Copy details to clipboard"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-400" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Action button triggers */}
        <div className="flex flex-col gap-3 pt-2">
          <button
            id="retry_run_btn"
            onClick={onRetry}
            className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-500/15 active:scale-98 transform transition-transform"
            title="Quick Restart Run"
          >
            <RefreshCw className="w-4 h-4 text-slate-950 animate-spin" style={{ animationDuration: '3s' }} /> {t.surfAgain} (QUICK RESTART)
          </button>

          <button
            id="back_to_menu_btn"
            onClick={onBackToMenu}
            className="w-full h-12 bg-slate-800 hover:bg-slate-750 text-slate-100 font-bold uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-colors active:scale-98 transform transition-transform"
          >
            <Undo2 className="w-4 h-4" /> {t.returnToDepot}
          </button>
        </div>
      </motion.div>

      {/* Embedded sharing toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 bg-yellow-500 text-slate-950 text-xs font-bold px-4 py-2 rounded-full shadow-lg z-50 flex items-center gap-2"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>{toast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
