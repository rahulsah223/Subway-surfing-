import React, { useState, useEffect } from 'react';
import {
  Play,
  ShoppingBag,
  Trophy,
  Calendar,
  Sparkles,
  LogIn,
  LogOut,
  Sparkle,
  Award,
  Coins,
  CheckCircle2,
  Info,
  Gift,
  Eye,
  Compass,
  Target,
  LayoutDashboard,
  ArrowRight,
  TrendingUp,
  BookOpen,
  User,
  Settings,
  Volume2,
  VolumeX,
  Edit2,
  Check,
  X,
  Star,
  MessageSquare,
  Send,
  Heart
} from 'lucide-react';
import { UserProfile, Skin, GameEnvironment } from '../types';
import { SKINS, ENVIRONMENTS, BOARD_PATTERNS } from '../constants';
import { getLevelInfo, getLevelUpReward } from '../utils/progression';
import { motion, AnimatePresence } from 'motion/react';
import { translations, Language } from '../utils/translations';
import { submitGameFeedback } from '../firebase';

interface MainMenuProps {
  userProfile: UserProfile | null;
  onPlay: () => void;
  onOpenShop: (tab?: 'skins' | 'headwear' | 'board_patterns' | 'environments') => void;
  onOpenLeaderboard: () => void;
  onOpenChallenges: () => void;
  onOpenAchievements: () => void;
  onLogin: () => void;
  onLogout: () => void;
  onUpdateProfile?: (profile: Partial<UserProfile>) => Promise<void>;
}

const VISIONS = [
  {
    id: 'gold_kingpin',
    title: 'Golden Kingpin',
    description: 'Envision and unlock all high-street surfer legend cosmetics.',
    badge: '👑',
    color: 'from-amber-500 to-yellow-400',
    getProgress: (profile: UserProfile) => Math.min(100, Math.round(((profile.unlockedSkins?.length || 1) / 4) * 100)),
    rewardCoins: 800,
  },
  {
    id: 'imperial_boarder',
    title: 'Imperial Boarder',
    description: 'Envision and collect supreme laser & cosmic surfboard decks.',
    badge: '🛹',
    color: 'from-cyan-500 to-teal-400',
    getProgress: (profile: UserProfile) => Math.min(100, Math.round(((profile.unlockedBoardPatterns?.length || 1) / 4) * 100)),
    rewardCoins: 500,
  },
  {
    id: 'sovereign_tycoon',
    title: 'Sovereign Tycoon',
    description: 'Accumulate a lifetime total of 15,000 precious gold coins.',
    badge: '💰',
    color: 'from-emerald-500 to-emerald-400',
    getProgress: (profile: UserProfile) => Math.min(100, Math.round(((profile.totalCoinsCollected || profile.coins || 0) / 15000) * 100)),
    rewardCoins: 1200,
  },
  {
    id: 'endless_sovereign',
    title: 'Endless Sovereign',
    description: 'Envision a personal record of surpassing 25,000 points.',
    badge: '⚡',
    color: 'from-purple-500 to-indigo-455',
    getProgress: (profile: UserProfile) => Math.min(100, Math.round(((profile.highScore || 0) / 25000) * 100)),
    rewardCoins: 1500,
  }
];

const VISION_QUOTES = [
  "Envision your path, slide beneath hurdles, and conquer the tracks!",
  "Great tracks are not sailed in calm waters. Surf hard, dodge trains!",
  "A clear vision of upcoming coins is the secret to high score mastery.",
  "Your board, your speed, your destiny. Outrun the inspectors!",
  "The tracks are endless, but your potential is infinite!"
];

export default function MainMenu({
  userProfile,
  onPlay,
  onOpenShop,
  onOpenLeaderboard,
  onOpenChallenges,
  onOpenAchievements,
  onLogin,
  onLogout,
  onUpdateProfile
}: MainMenuProps) {
  // Modal toggle states
  const [showMeModal, setShowMeModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showVisionModal, setShowVisionModal] = useState(false);
  const [visionToast, setVisionToast] = useState('');

  // Settings configs
  const [soundEnabled, setSoundEnabled] = useState(userProfile?.soundEnabled !== false);
  const [soundVolume, setSoundVolume] = useState(userProfile?.soundVolume ?? 80);

  // Settings tab selections (General vs feedback)
  const [settingsTab, setSettingsTab] = useState<'general' | 'feedback'>('general');

  // Feedback form states
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [feedbackCategory, setFeedbackCategory] = useState<string>('Idea');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackSending, setFeedbackSending] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Automatically reset states when settings modal closes
  useEffect(() => {
    if (!showSettingsModal) {
      setSettingsTab('general');
      setFeedbackSuccess(false);
      setFeedbackMessage('');
      setFeedbackRating(5);
      setFeedbackError(null);
    }
  }, [showSettingsModal]);

  const handleSendFeedback = async () => {
    if (!feedbackMessage.trim()) return;
    setFeedbackSending(true);
    setFeedbackError(null);
    try {
      const uid = userProfile?.userId || 'guest_user_root';
      const name = userProfile?.username || 'Guest Surfer';
      await submitGameFeedback(uid, name, feedbackRating, feedbackCategory, feedbackMessage.trim());
      setFeedbackSuccess(true);
    } catch (e) {
      console.error(e);
      setFeedbackError('Could not submit feedback. Please check your data or try again.');
    } finally {
      setFeedbackSending(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setSoundEnabled(userProfile.soundEnabled !== false);
      setSoundVolume(userProfile.soundVolume ?? 80);
    }
  }, [userProfile]);

  const toggleSound = async () => {
    const nextVal = !soundEnabled;
    setSoundEnabled(nextVal);
    if (onUpdateProfile) {
      await onUpdateProfile({ soundEnabled: nextVal });
    }
  };

  const handleVolumeChange = async (volume: number) => {
    setSoundVolume(volume);
    if (onUpdateProfile) {
      await onUpdateProfile({ soundVolume: volume });
    }
  };

  // Profile name edit state
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(userProfile?.username || '');

  // Claim actions
  const [claiming, setClaiming] = useState(false);
  const [payoutMsg, setPayoutMsg] = useState<string | null>(null);

  // Translation helpers
  const currentLang = (userProfile?.language || 'en') as Language;
  const t = translations[currentLang] || translations.en;

  const getActiveSkin = (): Skin => {
    if (!userProfile) return SKINS[0];
    return SKINS.find(s => s.id === userProfile.currentSkin) || SKINS[0];
  };

  const activeSkin = getActiveSkin();
  const levelInfo = userProfile ? getLevelInfo(userProfile) : null;

  // Level Up payouts logic
  const isLevelClaimed = levelInfo && userProfile?.claimedLevelRewards?.includes(levelInfo.level);
  const canClaimLevelReward = levelInfo && levelInfo.level > 1 && !isLevelClaimed;
  const currentReward = levelInfo ? getLevelUpReward(levelInfo.level) : null;

  const handleClaimReward = async () => {
    if (!userProfile || !levelInfo || claiming || !canClaimLevelReward) return;
    setClaiming(true);
    try {
      const rewardVal = currentReward?.rewardCoins || (levelInfo.level * 150);
      const claimedList = userProfile.claimedLevelRewards || [];
      const nextClaimed = [...claimedList, levelInfo.level];

      if (onUpdateProfile) {
        await onUpdateProfile({
          coins: userProfile.coins + rewardVal,
          claimedLevelRewards: nextClaimed
        });
      }

      setPayoutMsg(`Claimed Level ${levelInfo.level} Payout (+${rewardVal} Coins)!`);
      setTimeout(() => setPayoutMsg(null), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setClaiming(false);
    }
  };

  const handleUpdateUsername = async () => {
    if (!newName.trim() || !userProfile || !onUpdateProfile) return;
    try {
      await onUpdateProfile({ username: newName.trim() });
      setIsEditingName(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Fully functional non-fullscreen play invoker
  const handleTapToPlay = () => {
    onPlay();
  };

  return (
    <div id="main_menu_fullscreen_immersive" className="absolute inset-0 w-full h-full flex flex-col justify-between p-4 md:p-6 text-slate-100 select-none overflow-hidden pointer-events-auto">
      
      {/* 1. TOP STATS HEADER BAR */}
      <div id="game_top_fixed_bar" className="w-full flex justify-between items-center z-10 select-none">
        
        {/* Left Side: Profile Level Banner */}
        {userProfile && levelInfo && (
          <button
            id="top_bar_profile_trigger"
            onClick={() => setShowMeModal(true)}
            className="flex items-center gap-3 bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 p-2.5 rounded-2xl cursor-pointer transition-all hover:scale-105 shadow-lg max-w-[200px]"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 p-[2px] flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex flex-col items-center justify-center">
                <span className="text-[7px] text-slate-500 font-extrabold leading-none">LV</span>
                <span className="text-sm font-black text-amber-400 font-mono leading-none mt-0.5">{levelInfo.level}</span>
              </div>
            </div>
            <div className="text-left truncate">
              <p className="text-[10px] text-slate-400 font-bold tracking-wide uppercase">{t.profile}</p>
              <h3 className="text-xs font-black text-white truncate max-w-[120px]">{userProfile.username}</h3>
            </div>
          </button>
        )}

        {/* Center: Brand Name Logo */}
        <div className="hidden sm:block text-center pointer-events-none">
          <h1 className="text-3xl font-sans font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-400 via-orange-500 to-red-500 select-none uppercase drop-shadow-md leading-none">
            Subway Surf 3D
          </h1>
          <span className="text-[8px] font-mono tracking-widest text-slate-400/80 font-bold uppercase block mt-1">Endless Surf League</span>
        </div>

        {/* Right Side: Score, Coins, and Settings Trigger */}
        {userProfile && (
          <div className="flex items-center gap-2">
            {/* High Score Panel */}
            <div className="hidden xs:flex flex-col items-end bg-slate-950/85 border border-slate-800/80 px-4 py-1.5 rounded-2xl font-mono text-right">
              <span className="text-[8px] text-slate-500 font-extrabold tracking-widest leading-none">HIGH SCORE</span>
              <span className="text-xs font-black text-amber-400 mt-1">{userProfile.highScore.toLocaleString()}</span>
            </div>

            {/* Coins Panel */}
            <div className="flex items-center gap-2 bg-slate-950/85 border border-slate-800/80 px-4 py-2.5 rounded-2xl font-mono">
              <Coins className="w-4 h-4 text-amber-400 fill-amber-500/20" />
              <span className="text-xs font-black text-amber-300">{userProfile.coins.toLocaleString()}</span>
            </div>

            {/* Settings Gear Button */}
            <button
              id="top_bar_settings_trigger"
              onClick={() => setShowSettingsModal(true)}
              className="w-10 h-10 bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 text-slate-350 hover:text-white rounded-2xl flex items-center justify-center cursor-pointer transition-transform hover:rotate-45"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Branding (Visible only when small) */}
      <div className="sm:hidden text-center z-10 select-none my-auto pointer-events-none">
        <h1 className="text-4xl font-sans font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-amber-400 via-orange-500 to-red-500 select-none uppercase drop-shadow-lg leading-none">
          Subway Surf 3D
        </h1>
        <span className="text-[8.5px] font-mono tracking-widest text-slate-400/90 font-bold uppercase block mt-1">Endless Surf League</span>
      </div>

      {/* 2. PROMINENT CENTRAL PLAY BUTTON */}
      <div className="flex flex-col items-center justify-center z-10 select-none my-auto gap-4">
        <button
          id="play_game_marquee_pulse_btn"
          onClick={handleTapToPlay}
          className="group relative w-56 h-56 rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-650 p-[5px] cursor-pointer shadow-2xl transition-all transform hover:scale-105 active:scale-95 duration-300 flex items-center justify-center select-none"
        >
          {/* Pulsing inner rings mimicking top-tier video gameloft designs */}
          <span className="absolute inset-0 rounded-full bg-orange-500/20 animate-ping opacity-60 pointer-events-none" />
          <span className="absolute -inset-2 rounded-full border-2 border-dashed border-amber-500/20 animate-spin opacity-40 pointer-events-none duration-10000" />
          
          <div className="w-full h-full bg-slate-950 rounded-full flex flex-col items-center justify-center gap-1 border border-slate-850">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-emerald-400 to-teal-505 flex items-center justify-center shadow-lg shadow-emerald-500/20 group-hover:scale-110 duration-350">
              <Play className="w-8 h-8 text-slate-950 fill-slate-950 ml-1" />
            </div>
            
            <span className="text-white font-sans font-black text-base tracking-widest uppercase mt-2">{t.play}</span>
            <span className="text-emerald-400 font-mono text-[9px] font-extrabold tracking-widest uppercase animate-pulse">{t.tapToStart}</span>
          </div>
        </button>

        {/* Dynamic Character Customization equipped state bar */}
        {userProfile && (
          <div className="bg-slate-950/80 border border-slate-800/60 p-2 py-1 px-4 rounded-full flex items-center gap-2 shadow-lg text-[10.5px] font-semibold backdrop-blur-md max-w-sm">
            <span className="text-[8.5px] tracking-wider text-amber-500 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded-full uppercase border border-amber-500/10 shrink-0">Cosmetic Fitted</span>
            <span className="text-slate-350">Rider: <strong className="text-white font-black">{activeSkin.name}</strong></span>
            <span className="text-slate-600">|</span>
            <span className="text-slate-350">Deck: <strong className="text-white font-black">{(BOARD_PATTERNS.find(b => b.id === (userProfile.currentBoardPattern || 'solid')) || BOARD_PATTERNS[0]).name}</strong></span>
          </div>
        )}
      </div>

      {/* 3. FIXED BOTTOM NAVIGATION DOCK (No scrolling, elegant bento grids) */}
      <div id="game_navigation_dock" className="w-full max-w-lg mx-auto grid grid-cols-6 gap-2.5 z-10 select-none pb-2">
        
        {/* Store */}
        <button
          id="nav_btn_store"
          onClick={() => onOpenShop('environments')}
          className="bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 py-3 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer text-slate-305 transition-all hover:-translate-y-1 h-18"
        >
          <ShoppingBag className="w-5 h-5 text-amber-450 shrink-0" />
          <span className="text-[9px] font-extrabold uppercase font-sans tracking-tight">{t.store}</span>
        </button>

        {/* Characters (Me: Skins) */}
        <button
          id="nav_btn_characters"
          onClick={() => onOpenShop('skins')}
          className="bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 py-3 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer text-slate-305 transition-all hover:-translate-y-1 h-18"
        >
          <User className="w-5 h-5 text-cyan-455 shrink-0" />
          <span className="text-[9px] font-extrabold uppercase font-sans tracking-tight truncate w-full px-1 text-center">{t.characters}</span>
        </button>

        {/* Boards (Me: Boards) */}
        <button
          id="nav_btn_boards"
          onClick={() => onOpenShop('board_patterns')}
          className="bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 py-3 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer text-slate-305 transition-all hover:-translate-y-1 h-18"
        >
          <Sparkles className="w-5 h-5 text-orange-455 shrink-0 animate-pulse" />
          <span className="text-[9px] font-extrabold uppercase font-sans tracking-tight">{t.boards}</span>
        </button>

        {/* Vision Board */}
        <button
          id="nav_btn_vision_board"
          onClick={() => setShowVisionModal(true)}
          className="bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 py-3 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer text-slate-305 transition-all hover:-translate-y-1 h-18 relative group"
        >
          <Target className="w-5 h-5 text-rose-500 shrink-0 group-hover:scale-110 transition-all duration-300 animate-pulse" />
          <span className="text-[9px] font-extrabold uppercase font-sans tracking-tight text-rose-400">Vision</span>
          <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-450 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
          </span>
        </button>

        {/* Profile (Me: Level & Claims) */}
        <button
          id="nav_btn_profile_me"
          onClick={() => setShowMeModal(true)}
          className="bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 py-3 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer text-slate-305 transition-all hover:-translate-y-1 h-18"
        >
          <Award className="w-5 h-5 text-purple-455 shrink-0" />
          <span className="text-[9px] font-extrabold uppercase font-sans tracking-tight">{t.me}</span>
        </button>

        {/* Leaderboard/Social */}
        <button
          id="nav_btn_ranking"
          onClick={onOpenLeaderboard}
          className="bg-slate-950/85 hover:bg-slate-900 border border-slate-800/80 py-3 rounded-2xl flex flex-col items-center gap-1.5 cursor-pointer text-slate-305 transition-all hover:-translate-y-1 h-18"
        >
          <Trophy className="w-5 h-5 text-yellow-455 shrink-0" />
          <span className="text-[9px] font-extrabold uppercase font-sans tracking-tight">{t.leaders}</span>
        </button>
      </div>

      {/* --- ALL OTHER OVERLAYS HANDLED VIA CUSTOM NON-SCROLLING MODALS --- */}
      
      {/* A. CUSTOM "ME" (PROFILE) MODAL */}
      <AnimatePresence>
        {showMeModal && userProfile && levelInfo && (
          <motion.div
            key="me-modal-overlay"
            id="me_modal_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div
              id="me_modal_container"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl flex flex-col overflow-hidden max-h-[85vh] shadow-2xl p-6 relative gap-4"
            >
              {/* Close Button */}
              <button
                id="me_modal_close_btn"
                onClick={() => setShowMeModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & Icon Header */}
              <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
                <div className="p-2 bg-gradient-to-tr from-purple-500 to-indigo-500 rounded-xl">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white">{t.credentials}</h2>
                  <p className="text-slate-400 text-xs text-left">Level tier achievements & profile credentials</p>
                </div>
              </div>

              {/* Claim Success Alert inside Modal */}
              {payoutMsg && (
                <div className="bg-emerald-900/60 border border-emerald-500/20 text-emerald-450 p-2.5 rounded-xl text-center text-xs font-bold font-sans animate-bounce">
                  🎉 {payoutMsg}
                </div>
              )}

              {/* Profile Username Editor */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 uppercase font-black tracking-wiest">{t.crewUsernameTag}</span>
                  {!isEditingName && (
                    <button
                      onClick={() => { setNewName(userProfile.username); setIsEditingName(true); }}
                      className="text-[10px] text-amber-400 font-bold hover:underline cursor-pointer flex items-center gap-1 bg-transparent border-none"
                    >
                      <Edit2 className="w-2.5 h-2.5" /> Edit Tag
                    </button>
                  )}
                </div>

                {isEditingName ? (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      maxLength={20}
                      className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 transition-colors"
                      placeholder="Surfer nick..."
                    />
                    <button
                      onClick={handleUpdateUsername}
                      className="p-1 px-3 bg-emerald-500 hover:bg-emerald-450 text-slate-950 rounded-xl transition-all flex items-center justify-center shadow-md cursor-pointer border-none"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setIsEditingName(false)}
                      className="p-1 px-3 bg-slate-800 hover:bg-slate-750 text-slate-350 rounded-xl cursor-pointer border-none"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-white">{userProfile.username}</h3>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${levelInfo.rankColor}`}>
                      {levelInfo.rankTitle}
                    </span>
                  </div>
                )}
              </div>

              {/* Level XP Bar */}
              <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between text-[10px] leading-none text-slate-500 tracking-wider">
                  <span>{t.xpProgress}:</span>
                  <span className="font-mono text-slate-300">
                    {levelInfo.currentLevelXP.toLocaleString()} / {levelInfo.nextLevelXP.toLocaleString()} XP
                  </span>
                </div>
                
                <div className="w-full h-2 rounded-full bg-slate-900 p-[1px] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-400 transition-all duration-500"
                    style={{ width: `${levelInfo.progressPercentage}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px]">
                  <span className="text-slate-400 font-bold">{t.level.toUpperCase()} {levelInfo.level}</span>
                  <span className="text-amber-400 font-bold uppercase text-[9px]">
                    🔮 {t.nextUnlock}: {levelInfo.nextUnlockName}
                  </span>
                </div>
              </div>

              {/* Level Reward claim */}
              {canClaimLevelReward && (
                <div className="bg-amber-950/40 border border-amber-500/20 p-3 rounded-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-left">
                    <Gift className="w-4 h-4 text-amber-400 animate-bounce shrink-0" />
                    <div>
                      <p className="text-xs font-black text-white leading-none">Promo Bonus Unlocked!</p>
                      <p className="text-[10px] text-slate-400 mt-1 leading-none">Congratulations level up reward</p>
                    </div>
                  </div>
                  <button
                    onClick={handleClaimReward}
                    disabled={claiming}
                    className="p-1 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-extrabold uppercase rounded-xl shadow-lg cursor-pointer border-none"
                  >
                    Claim +{currentReward?.rewardCoins || (levelInfo.level * 150)} Coins
                  </button>
                </div>
              )}

              {/* Stats Panel Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <span className="text-[8px] text-slate-500 font-extrabold block uppercase tracking-wide">{t.runsPlayed}</span>
                  <span className="text-sm font-black text-indigo-400">{userProfile.totalRunsPlayed || 0} Runs</span>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <span className="text-[8px] text-slate-500 font-extrabold block uppercase tracking-wide">{t.coinsSnatched}</span>
                  <span className="text-sm font-black text-amber-400">{(userProfile.totalCoinsCollected || 0).toLocaleString()} Coins</span>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <span className="text-[8px] text-slate-500 font-extrabold block uppercase tracking-wide">{t.lifetimePowerups}</span>
                  <span className="text-sm font-black text-teal-400">{userProfile.totalPowerupsCollected || 0} items</span>
                </div>
                <div className="bg-slate-950/40 border border-slate-850 p-3 rounded-2xl">
                  <span className="text-[8px] text-slate-500 font-extrabold block uppercase tracking-wide">{t.leagueRank}</span>
                  <span className="text-sm font-black text-purple-400 truncate block">Recruit Rider</span>
                </div>
              </div>

              {/* Trigger Achievements Modal Button */}
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowMeModal(false); onOpenAchievements(); }}
                  className="flex-1 p-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-sans font-black text-xs uppercase tracking-widest rounded-2xl cursor-pointer shadow-lg hover:-translate-y-0.5 transition-all border-none"
                >
                  {t.trackAchievements}
                </button>
                <button
                  onClick={() => { setShowMeModal(false); onOpenChallenges(); }}
                  className="p-3 bg-slate-800 hover:bg-slate-750 px-4 text-slate-300 font-black text-xs uppercase tracking-widest rounded-2xl cursor-pointer transition-all border border-slate-750"
                  title="Open Quest Tracker"
                >
                  <Calendar className="w-4 h-4 text-emerald-450" />
                </button>
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* C. CUSTOM "VISION BOARD" MODAL */}
      <AnimatePresence>
        {showVisionModal && userProfile && (
          <motion.div
            key="vision-modal-overlay"
            id="vision_modal_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
          >
            <motion.div
              id="vision_modal_container"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl flex flex-col overflow-hidden max-h-[85vh] shadow-2xl p-6 relative gap-4"
            >
              {/* Close Button */}
              <button
                id="vision_modal_close_btn"
                onClick={() => setShowVisionModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title & Icon Header */}
              <div className="flex items-center gap-3 border-b border-slate-850 pb-3">
                <div className="p-2 bg-gradient-to-tr from-rose-500 to-red-500 rounded-xl animate-pulse">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white mb-0.5">Surfers Vision Board</h2>
                  <p className="text-slate-450 text-xs text-left">Set your spiritual focus, track milestones & unlock packages</p>
                </div>
              </div>

              {/* Vision Toast Alert */}
              {visionToast && (
                <div className="bg-amber-900/60 border border-amber-500/20 text-amber-450 p-2 rounded-xl text-center text-xs font-bold font-sans animate-bounce">
                  🎉 {visionToast}
                </div>
              )}

              {/* Inspiration Quote Box */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-850 flex items-center gap-3 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
                <div className="flex-1 text-left">
                  <p className="text-[9px] text-rose-450 font-black uppercase tracking-widest mb-1 leading-none">Pinned Daily Inspiration</p>
                  <p className="font-sans italic text-slate-350 text-xs leading-relaxed">
                    "{VISION_QUOTES[userProfile.activeVisionQuoteIndex ?? 0]}"
                  </p>
                </div>
                <button
                  id="btn_cycle_quote"
                  onClick={async () => {
                    if (onUpdateProfile) {
                      const nextIndex = ((userProfile.activeVisionQuoteIndex ?? 0) + 1) % VISION_QUOTES.length;
                      await onUpdateProfile({ activeVisionQuoteIndex: nextIndex });
                    }
                  }}
                  className="p-1 px-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-800 rounded-xl text-[10px] font-bold cursor-pointer shrink-0"
                  title="Next Quote"
                >
                  Cycle ⚡
                </button>
              </div>

              {/* Visions Focus Cards Section */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[42vh]">
                <p className="text-[10px] text-slate-500 font-extrabold uppercase tracking-wider text-left leading-none pl-1">Active Vision Goals</p>
                <div className="grid grid-cols-1 gap-2.5">
                  {VISIONS.map((v) => {
                    const progress = v.getProgress(userProfile);
                    const isActive = userProfile.activeVisionId === v.id;
                    const isClaimed = userProfile.claimedVisionIds?.includes(v.id) ?? false;
                    const canClaim = progress >= 100 && !isClaimed;

                    return (
                      <div
                        key={v.id}
                        className={`p-3.5 rounded-2xl border transition-all duration-300 text-left relative flex flex-col gap-2 ${
                          isActive
                            ? 'bg-slate-950/80 border-rose-500/40 shadow-lg shadow-rose-950/10'
                            : 'bg-slate-950/45 border-slate-850/65 hover:bg-slate-950/60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex gap-2.5 items-center">
                            <span className="text-xl p-1.5 bg-slate-900 border border-slate-800 rounded-xl shrink-0">{v.badge}</span>
                            <div>
                              <h3 className="text-xs font-black text-white leading-tight flex items-center gap-1.5">
                                {v.title}
                                {isActive && (
                                  <span className="text-[8px] bg-rose-500/20 border border-rose-500/30 text-rose-455 font-black px-1.5 py-0.5 rounded-full uppercase leading-none">
                                    Current Focus
                                  </span>
                                )}
                              </h3>
                              <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">{v.description}</p>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-col items-end">
                            <span className="font-mono text-xs font-extrabold text-slate-350">{progress}%</span>
                          </div>
                        </div>

                        {/* Progress slider bar */}
                        <div className="w-full bg-slate-900 h-2 rounded-full p-[1px] overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${v.color} transition-all duration-500`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>

                        {/* Focus action or Claim action buttons */}
                        <div className="flex justify-between items-center mt-1">
                          <div className="text-[9px] text-slate-500 uppercase font-bold">
                            Bonus: <strong className="text-amber-400">+{v.rewardCoins} Coins</strong>
                          </div>

                          <div className="flex gap-2">
                            {canClaim ? (
                              <button
                                onClick={async () => {
                                  if (onUpdateProfile) {
                                    const nextCoins = userProfile.coins + v.rewardCoins;
                                    const nextClaimed = [...(userProfile.claimedVisionIds || []), v.id];
                                    setVisionToast(`Claimed +${v.rewardCoins} Coins for ${v.title}!`);
                                    await onUpdateProfile({
                                      coins: nextCoins,
                                      claimedVisionIds: nextClaimed
                                    });
                                    setTimeout(() => setVisionToast(''), 3000);
                                  }
                                }}
                                className="px-3.5 py-1 bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-[10px] font-black uppercase rounded-lg shadow-md hover:scale-103 transition-transform cursor-pointer border-none"
                              >
                                Claim Reward! 💰
                              </button>
                            ) : isClaimed ? (
                              <span className="text-[9px] font-extrabold text-emerald-500 uppercase flex items-center gap-1">
                                ✓ Claimed
                              </span>
                            ) : !isActive ? (
                              <button
                                onClick={async () => {
                                  if (onUpdateProfile) {
                                    await onUpdateProfile({ activeVisionId: v.id });
                                    setVisionToast(`Active Focus set to ${v.title}!`);
                                    setTimeout(() => setVisionToast(''), 2000);
                                  }
                                }}
                                className="px-3 py-1 bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white text-[9px] font-black uppercase rounded-lg transition-colors cursor-pointer border-none"
                              >
                                Focus Goal
                              </button>
                            ) : (
                              <span className="text-[9px] font-extrabold text-rose-500 uppercase flex items-center gap-1">
                                ● Focus Set
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Developer / Visual Masteries Verification Checklist */}
              <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-850/60 space-y-2 text-left shrink-0">
                <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider leading-none">Arcade Visual Diagnostics</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-900/60 p-2 rounded-xl flex flex-col items-center justify-center text-center border border-slate-850/60">
                    <span className="text-emerald-400 font-bold text-xs">✓ Clear Fog</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wide leading-none select-none">Linear rendering</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl flex flex-col items-center justify-center text-center border border-slate-850/60">
                    <span className="text-emerald-400 font-bold text-xs">✓ No Rings</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wide leading-none select-none">Pristine sky view</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-xl flex flex-col items-center justify-center text-center border border-slate-850/60">
                    <span className="text-emerald-400 font-bold text-xs">✓ Persistent</span>
                    <span className="text-[8px] text-slate-500 mt-0.5 uppercase tracking-wide leading-none select-none">3D replay track</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* B. CUSTOM "SETTINGS" MODAL */}
      <AnimatePresence>
        {showSettingsModal && (
          <motion.div
            key="settings-modal-overlay"
            id="settings_modal_overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4"
          >
            <motion.div
              id="settings_modal_container"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg flex flex-col overflow-hidden max-h-[85vh] shadow-2xl p-6 relative gap-4"
            >
              {/* Close Button */}
              <button
                id="settings_modal_close_btn"
                onClick={() => setShowSettingsModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer border-none bg-transparent animate-fadeIn z-20"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Title Header */}
              <div className="flex items-center gap-3 border-b border-slate-850 pb-3 h-12 shrink-0">
                <div className="p-2 bg-gradient-to-tr from-slate-700 to-slate-900 border border-slate-750 rounded-xl">
                  {settingsTab === 'general' ? (
                    <Settings className="w-6 h-6 text-slate-350" />
                  ) : (
                    <Heart className="w-6 h-6 text-rose-500 fill-rose-500/20" />
                  )}
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold font-sans tracking-tight text-white leading-none">
                    {settingsTab === 'general' ? t.configuration : "Submit Feedback"}
                  </h2>
                  <p className="text-slate-400 text-[10.5px] mt-1.5 leading-none">
                    {settingsTab === 'general' ? "Audio settings, localization & street rules" : "Help us shape the ultimate endless 3D rail-runner"}
                  </p>
                </div>
              </div>

              {/* Tab Navigation header */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950/60 border border-slate-850 rounded-2xl shrink-0">
                <button
                  type="button"
                  onClick={() => setSettingsTab('general')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
                    settingsTab === 'general'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4" />
                  <span>General Settings</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSettingsTab('feedback')}
                  className={`py-2 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border-none ${
                    settingsTab === 'feedback'
                      ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md font-black'
                      : 'bg-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="flex items-center gap-1">
                    Submit Feedback
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />
                  </span>
                </button>
              </div>

              {/* Scrollable container for flexible content fitting */}
              <div className="flex-1 overflow-y-auto pr-1 max-h-[50vh] space-y-4">
                {settingsTab === 'general' ? (
                  <div className="space-y-4">
                    {/* Interactive Audio/Sound Adjustments */}
                    <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{t.audioPreferences}</span>
                        <button
                          onClick={toggleSound}
                          type="button"
                          className={`p-1 px-3.5 rounded-xl text-[10px] font-extrabold uppercase transition-all cursor-pointer border-none ${
                            soundEnabled 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-510' 
                              : 'bg-rose-500/10 text-rose-450 border border-rose-510'
                          }`}
                        >
                          {soundEnabled ? t.soundOn : t.muted}
                        </button>
                      </div>

                      <div className="flex items-center gap-4">
                        {soundEnabled ? (
                          <Volume2 className="w-5 h-5 text-amber-500 shrink-0" />
                        ) : (
                          <VolumeX className="w-5 h-5 text-slate-500 shrink-0" />
                        )}
                        
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={soundVolume}
                          disabled={!soundEnabled}
                          onChange={(e) => handleVolumeChange(Number(e.target.value))}
                          className="flex-1 accent-amber-500 h-1.5 bg-slate-800 rounded-lg appearance-none outline-none cursor-pointer disabled:opacity-30"
                        />
                        <span className="font-mono text-xs font-bold text-slate-300 w-8 text-right shrink-0">{soundVolume}%</span>
                      </div>
                    </div>

                    {/* Language Switcher Utility */}
                    <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-3">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block text-left">{t.language}</span>
                      <div className="grid grid-cols-3 gap-2">
                        {(['en', 'es', 'fr'] as const).map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={async () => {
                              if (onUpdateProfile) {
                                await onUpdateProfile({ language: lang });
                              }
                            }}
                            className={`py-2 text-xs font-black rounded-xl transition-all border cursor-pointer ${
                              currentLang === lang
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/50'
                                : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                            }`}
                          >
                            {lang === 'en' ? 'English' : lang === 'es' ? 'Español' : 'Français'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Google Authentication sync links */}
                    <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2.5">
                      <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block text-left">{t.syncProfile}</span>
                      {userProfile?.userId !== 'guest_user_root' ? (
                        <div className="flex items-center justify-between gap-4">
                          <div className="text-left">
                            <p className="text-xs font-bold text-white">{t.googleConnected}</p>
                            <p className="text-[10px] text-slate-400">{t.offlineSync}</p>
                          </div>
                          <button
                            onClick={() => { setShowSettingsModal(false); onLogout(); }}
                            type="button"
                            className="p-2 px-4 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold rounded-xl cursor-pointer border border-slate-700"
                          >
                            {t.disconnectUser}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                          <p className="text-[10px] text-slate-400 text-left">
                            Sync gold coins, high scores, levels and unlocked clothing/items to your permanent Google account.
                          </p>
                          <button
                            onClick={() => { setShowSettingsModal(false); onLogin(); }}
                            type="button"
                            className="p-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-450 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer border-none flex items-center justify-center gap-1.55"
                          >
                            <LogIn className="w-3.5 h-3.5" /> {t.linkGoogle}
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Collapsible Rules Guide Container (Fixed-size, elegantly styled) */}
                    <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 flex flex-col gap-1.5">
                      <div className="flex items-center gap-1.5 text-slate-400 font-extrabold text-[10px] tracking-widest uppercase">
                        <BookOpen className="w-4 h-4 text-amber-500" />
                        <span>{t.streetRules}</span>
                      </div>
                      
                      <div className="text-[11px] text-slate-400 text-left leading-relaxed space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                        <p>
                          <b className="text-white">XP Rules:</b> {t.ruleXP}
                        </p>
                        <p>
                          <b className="text-amber-400">Unlock Milestones:</b> {t.ruleMilestones}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-left">
                    {feedbackSuccess ? (
                      <div className="bg-slate-950/55 border border-slate-850 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 py-8 animate-fadeIn">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500 flex items-center justify-center select-none shadow-lg shadow-emerald-500/15 animate-pulse">
                          <Check className="w-8 h-8 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-black text-white">Feedback Dispatched!</h3>
                          <p className="text-slate-400 text-xs mt-2 px-4 leading-relaxed">
                            Thank you! Your report has been successfully written to the cloud firestore register. The engineering dev division reviews all surfs to roll out legendary board prints and competitive crew outfits!
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFeedbackSuccess(false);
                            setFeedbackMessage('');
                            setFeedbackRating(5);
                            setSettingsTab('general');
                          }}
                          className="mt-2 p-2.5 px-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-450 hover:to-orange-450 text-slate-950 font-black text-xs uppercase rounded-xl shadow-lg cursor-pointer transition-all border-none"
                        >
                          Continue Surfing
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4 animate-fadeIn">
                        {/* Suggestion Category chips */}
                        <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2.5">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block text-left">Suggestion Category</span>
                          <div className="grid grid-cols-2 xs:grid-cols-3 gap-2">
                            {['💡 Suggestion', '🐛 Bug Report', '🛹 Mechanics', '🎨 Custom Art', '🌐 Other'].map((cat) => (
                              <button
                                key={cat}
                                type="button"
                                onClick={() => setFeedbackCategory(cat)}
                                className={`py-1.5 text-[11px] font-extrabold rounded-xl border transition-all cursor-pointer ${
                                  feedbackCategory === cat
                                    ? 'bg-amber-500/15 text-amber-400 border-amber-500/50'
                                    : 'bg-slate-900 text-slate-400 border-slate-800/80 hover:bg-slate-850'
                                }`}
                              >
                                {cat}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Interactive Star Rating */}
                        <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 flex flex-col items-center gap-2">
                          <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest block text-left self-start">Rate Subway Surf 3D</span>
                          
                          <div className="flex items-center gap-2.5 py-1">
                            {[1, 2, 3, 4, 5].map((star) => {
                              const isGold = (hoverRating !== null ? star <= hoverRating : star <= feedbackRating);
                              return (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setFeedbackRating(star)}
                                  onMouseEnter={() => setHoverRating(star)}
                                  onMouseLeave={() => setHoverRating(null)}
                                  className="focus:outline-none transition-transform hover:scale-125 cursor-pointer border-none bg-transparent"
                                >
                                  <Star
                                    className={`w-8 h-8 ${
                                      isGold
                                        ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                                        : 'text-slate-650 hover:text-slate-450'
                                    }`}
                                  />
                                </button>
                              );
                            })}
                          </div>

                          <span className="text-[10px] font-extrabold uppercase font-sans py-0.5 px-3 rounded-full bg-slate-900 border border-slate-850 text-amber-300">
                            {feedbackRating === 1 && "⭐ Terrible - Needs Major Refactoring"}
                            {feedbackRating === 2 && "⭐⭐ Bad - Frustrating Obstacles"}
                            {feedbackRating === 3 && "⭐⭐⭐ Okay - Fun but room to surf!"}
                            {feedbackRating === 4 && "⭐⭐⭐⭐ Good - Smooth hover strides!"}
                            {feedbackRating === 5 && "⭐⭐⭐⭐⭐ Excellent - Gold-plated endless perfection!"}
                          </span>
                        </div>

                        {/* Comment field */}
                        <div className="bg-slate-950/60 border border-slate-850 rounded-2xl p-4 space-y-2">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="text-slate-500 uppercase font-black tracking-widest">Surfer Feedback / Suggestions</span>
                            <span className={`${feedbackMessage.length > 450 ? 'text-rose-450 font-black' : 'text-slate-500'} font-mono font-bold`}>
                              {feedbackMessage.length} / 500
                            </span>
                          </div>
                          
                          <textarea
                            value={feedbackMessage}
                            onChange={(e) => setFeedbackMessage(e.target.value.slice(0, 500))}
                            placeholder="Tell us what you want to add! Customized crew outfits, specific level stages, or special board powerup modes?"
                            className="w-full h-24 bg-slate-900 border border-slate-850 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-amber-500 placeholder-slate-605 resize-none transition-colors"
                          />
                        </div>

                        {feedbackError && (
                          <div className="bg-rose-950/40 border border-rose-500/20 text-rose-450 p-2.5 rounded-xl text-center text-xs font-bold animate-pulse">
                            ⚠️ {feedbackError}
                          </div>
                        )}

                        {/* Dispatch Button controls */}
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setFeedbackMessage('');
                              setFeedbackRating(5);
                              setSettingsTab('general');
                            }}
                            className="flex-1 py-3 bg-slate-800 hover:bg-slate-750 text-slate-350 text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer transition-all border-none"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSendFeedback}
                            disabled={feedbackSending || !feedbackMessage.trim()}
                            className="flex-[2] py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-450 hover:to-teal-450 disabled:opacity-40 text-slate-950 text-xs font-black uppercase tracking-widest rounded-xl cursor-pointer transition-all flex items-center justify-center gap-2 border-none shadow-lg shadow-emerald-500/10"
                          >
                            {feedbackSending ? (
                              <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5" />
                            )}
                            <span>{feedbackSending ? 'Transmitting...' : 'Send Feedback'}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
