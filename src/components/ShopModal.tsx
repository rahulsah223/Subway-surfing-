import React, { useState } from 'react';
import { ShoppingBag, Check, Lock, Palette, Map, Crown, Layers, X, Smile } from 'lucide-react';
import { SKINS, ENVIRONMENTS, HEADWEARS, BOARD_PATTERNS } from '../constants';
import { UserProfile, Skin, GameEnvironment, Headwear, BoardPattern } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface ShopModalProps {
  key?: React.Key;
  userProfile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
  initialTab?: 'skins' | 'headwear' | 'board_patterns' | 'environments';
}

export default function ShopModal({ userProfile, onClose, onUpdateProfile, initialTab = 'skins' }: ShopModalProps) {
  const [activeTab, setActiveTab] = useState<'skins' | 'headwear' | 'board_patterns' | 'environments'>(initialTab);
  const [purchasingId, setPurchasingId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Fallbacks for legacy accounts
  const unlockedHeadwear = userProfile.unlockedHeadwear || ['none'];
  const unlockedBoardPatterns = userProfile.unlockedBoardPatterns || ['solid'];
  const currentHeadwearSelected = userProfile.currentHeadwear || 'none';
  const currentBoardPatternSelected = userProfile.currentBoardPattern || 'solid';

  const handleSelectSkin = async (skinId: string) => {
    if (!userProfile.unlockedSkins.includes(skinId)) return;
    try {
      await onUpdateProfile({ currentSkin: skinId });
    } catch (e) {
      setErrorText("Failed to set character skin. Try again.");
    }
  };

  const handleSelectEnv = async (envId: string) => {
    if (!userProfile.unlockedEnvironments.includes(envId)) return;
    try {
      await onUpdateProfile({ currentEnvironment: envId });
    } catch (e) {
      setErrorText("Failed to select environment. Try again.");
    }
  };

  const handleSelectHeadwear = async (id: string) => {
    if (!unlockedHeadwear.includes(id)) return;
    try {
      await onUpdateProfile({ currentHeadwear: id });
    } catch (e) {
      setErrorText("Failed to set headwear. Try again.");
    }
  };

  const handleSelectBoardPattern = async (id: string) => {
    if (!unlockedBoardPatterns.includes(id)) return;
    try {
      await onUpdateProfile({ currentBoardPattern: id });
    } catch (e) {
      setErrorText("Failed to set board pattern. Try again.");
    }
  };

  const handleBuySkin = async (skin: Skin) => {
    if (userProfile.coins < skin.cost) {
      setErrorText("Not enough custom subway coins! Go run and gather more gold!");
      setTimeout(() => setErrorText(null), 3000);
      return;
    }
    setPurchasingId(skin.id);
    try {
      const updatedSkins = [...userProfile.unlockedSkins, skin.id];
      await onUpdateProfile({
        coins: userProfile.coins - skin.cost,
        unlockedSkins: updatedSkins,
        currentSkin: skin.id
      });
    } catch (e) {
      setErrorText("Transaction failed. Check connection.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleBuyEnv = async (env: GameEnvironment) => {
    if (userProfile.coins < env.cost) {
      setErrorText("Not enough custom subway coins! Keep surfing to gather more gold!");
      setTimeout(() => setErrorText(null), 3000);
      return;
    }
    setPurchasingId(env.id);
    try {
      const updatedEnvs = [...userProfile.unlockedEnvironments, env.id];
      await onUpdateProfile({
        coins: userProfile.coins - env.cost,
        unlockedEnvironments: updatedEnvs,
        currentEnvironment: env.id
      });
    } catch (e) {
      setErrorText("Transaction failed.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleBuyHeadwear = async (headwear: Headwear) => {
    if (userProfile.coins < headwear.cost) {
      setErrorText("Not enough custom subway coins! Surf the subway lines to secure more gold.");
      setTimeout(() => setErrorText(null), 3000);
      return;
    }
    setPurchasingId(headwear.id);
    try {
      const updatedList = [...unlockedHeadwear, headwear.id];
      await onUpdateProfile({
        coins: userProfile.coins - headwear.cost,
        unlockedHeadwear: updatedList,
        currentHeadwear: headwear.id
      });
    } catch (e) {
      setErrorText("Transaction failed.");
    } finally {
      setPurchasingId(null);
    }
  };

  const handleBuyBoardPattern = async (pattern: BoardPattern) => {
    if (userProfile.coins < pattern.cost) {
      setErrorText("Not enough custom subway coins! Ride and jump to secure more gold.");
      setTimeout(() => setErrorText(null), 3000);
      return;
    }
    setPurchasingId(pattern.id);
    try {
      const updatedList = [...unlockedBoardPatterns, pattern.id];
      await onUpdateProfile({
        coins: userProfile.coins - pattern.cost,
        unlockedBoardPatterns: updatedList,
        currentBoardPattern: pattern.id
      });
    } catch (e) {
      setErrorText("Transaction failed.");
    } finally {
      setPurchasingId(null);
    }
  };

  return (
    <div id="shop_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        id="shop_modal_container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div id="shop_modal_header" className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <ShoppingBag className="w-8 h-8 text-amber-400" />
            <div>
              <h2 className="text-2xl font-bold font-sans tracking-tight text-white">Subway Surf Depot</h2>
              <p className="text-slate-400 text-sm">Customize outfits, stylish caps, paint works and urban metros</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-amber-950/40 border border-amber-800 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-xs font-black text-slate-950">
                🪙
              </span>
              <span className="font-mono font-bold text-amber-400">{userProfile.coins} Coins</span>
            </div>
            
            <button
              id="close_shop_btn"
              onClick={onClose}
              className="p-1 px-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Tab switcher */}
        <div id="shop_tabs" className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-800 bg-slate-900/60 p-2 gap-1.5 shrink-0">
          <button
            id="tab_skins_btn"
            onClick={() => { setActiveTab('skins'); setErrorText(null); }}
            className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'skins'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Palette className="w-4 h-4 shrink-0" />
            <span>Characters</span>
          </button>
          <button
            id="tab_headwear_btn"
            onClick={() => { setActiveTab('headwear'); setErrorText(null); }}
            className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'headwear'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Smile className="w-4 h-4 shrink-0" />
            <span>Cap Styles</span>
          </button>
          <button
            id="tab_board_patterns_btn"
            onClick={() => { setActiveTab('board_patterns'); setErrorText(null); }}
            className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'board_patterns'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Boards Deck</span>
          </button>
          <button
            id="tab_envs_btn"
            onClick={() => { setActiveTab('environments'); setErrorText(null); }}
            className={`py-3 px-3 rounded-xl flex items-center justify-center gap-2 text-xs md:text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'environments'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/10'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Map className="w-4 h-4 shrink-0" />
            <span>Metro Environments</span>
          </button>
        </div>

        {/* Error notification prompt */}
        <AnimatePresence>
          {errorText && (
            <motion.div
              key="shop-error-banner"
              id="shop_error_message"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-red-500/10 border-b border-red-500/20 text-red-200 text-sm py-2 px-6 flex items-center justify-center font-medium"
            >
              {errorText}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Split Area for Dressing Room and Shop Items Grid */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 bg-slate-950/20">
          
          {/* Left Side: Dynamic Fitting Room / Customizer Dressing Room */}
          <div id="dressing_room_sidebar" className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-slate-950/60 p-5 flex flex-col justify-between shrink-0 overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-slate-400 font-extrabold text-[11px] tracking-wider uppercase">
                <Smile className="w-4 h-4 text-emerald-400 animate-bounce" />
                <span>Cosmetic Fitting Room</span>
              </div>

              {/* Outfit Character Graphics representation */}
              <div className="relative h-48 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center overflow-hidden p-4 shadow-inner">
                {/* Visual Sky Background Gradient synced with currently equipped environment! */}
                <div 
                  className="absolute inset-0 opacity-20 pointer-events-none" 
                  style={{
                    background: `linear-gradient(to bottom, ${(ENVIRONMENTS.find(e => e.id === userProfile.currentEnvironment) || ENVIRONMENTS[0]).skyColor}, ${(ENVIRONMENTS.find(e => e.id === userProfile.currentEnvironment) || ENVIRONMENTS[0]).groundColor})`
                  }}
                />

                {/* Avatar Display */}
                <div className="relative z-10 flex flex-col items-center select-none scale-100">
                  {/* Headwear / Cap Style */}
                  {currentHeadwearSelected !== 'none' && (
                    <div 
                      className="absolute -top-1.5 w-8 h-3 rounded-t-full z-20 shadow-md"
                      style={{ backgroundColor: (HEADWEARS.find(h => h.id === currentHeadwearSelected) || HEADWEARS[0]).color }}
                      title={(HEADWEARS.find(h => h.id === currentHeadwearSelected) || HEADWEARS[0]).name}
                    />
                  )}

                  {/* Face Circle */}
                  <div 
                    className="w-10 h-10 rounded-full bg-[#fbcfe8] border border-slate-800/20 shadow-md flex items-center justify-center relative overflow-hidden"
                    style={{ backgroundColor: userProfile.currentSkin === 'golden' ? '#fbbf24' : userProfile.currentSkin === 'yutani' ? '#22c55e' : '#fbcfe8' }}
                  >
                    {/* Cute cartoon eyes based on skin */}
                    <div className="flex gap-2.5 mt-[-2px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-900 animate-pulse" />
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-950 animate-pulse" />
                    </div>
                    {/* Character smirk */}
                    <div className="absolute bottom-2.5 w-3 h-1 bg-red-650 rounded-b-full border-t-0" />
                  </div>

                  {/* Torso/Jacket element */}
                  <div 
                    className="w-12 h-14 rounded-b-xl mt-0.5 border border-slate-800/10 shadow-md flex items-center justify-center relative overflow-hidden" 
                    style={{ backgroundColor: (SKINS.find(s => s.id === userProfile.currentSkin) || SKINS[0]).color }}
                  >
                    {/* Jake star stencil */}
                    {userProfile.currentSkin === 'urchin' && (
                      <span className="text-[10px] font-black text-white px-1 bg-white/20 rounded">★</span>
                    )}
                    {/* Yutani target badge */}
                    {userProfile.currentSkin === 'yutani' && (
                      <span className="w-3.5 h-3.5 rounded-full bg-yellow-400 border border-yellow-500 flex items-center justify-center text-[5px] text-pink-600 font-bold">●</span>
                    )}
                  </div>

                  {/* Surfboard pattern/deck display floating right underneath character */}
                  <div className="relative mt-2 w-16 h-3 rounded-full border border-slate-800/15 shadow-md flex items-center justify-center overflow-hidden" style={{ backgroundColor: (SKINS.find(s => s.id === userProfile.currentSkin) || SKINS[0]).boardColor }}>
                    {currentBoardPatternSelected === 'stripes' && (
                      <div className="absolute inset-x-2 h-full border-l-2 border-r-2 border-rose-500" />
                    )}
                    {currentBoardPatternSelected === 'flames' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-yellow-500 to-transparent" />
                    )}
                    {currentBoardPatternSelected === 'galaxy' && (
                      <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-purple-800 to-pink-500 opacity-80" />
                    )}
                  </div>
                </div>

                {/* Environment badge indicator */}
                <div className="absolute bottom-2 right-2 bg-slate-950/80 px-2 py-0.5 rounded-md text-[8.5px] font-bold text-slate-400 border border-slate-850">
                  🎬 {(ENVIRONMENTS.find(e => e.id === userProfile.currentEnvironment) || ENVIRONMENTS[0]).name}
                </div>
              </div>

              {/* Equipe details */}
              <div className="bg-slate-950/65 border border-slate-850 rounded-xl p-3 space-y-1.5 text-xs text-left">
                <div className="flex justify-between items-center text-[10px] text-slate-500 font-bold">
                  <span>ACTIVELY EQUIPPED:</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Hero:</span>{' '}
                  <span className="text-white font-bold">{(SKINS.find(s => s.id === userProfile.currentSkin) || SKINS[0]).name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Cap style:</span>{' '}
                  <span className="text-white font-bold">{(HEADWEARS.find(h => h.id === currentHeadwearSelected) || HEADWEARS[0]).name}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-medium">Board deck:</span>{' '}
                  <span className="text-white font-bold">{(BOARD_PATTERNS.find(b => b.id === currentBoardPatternSelected) || BOARD_PATTERNS[0]).name}</span>
                </div>
              </div>

              {/* Purely Cosmetic Reassurance Card */}
              <div className="bg-amber-950/20 border border-amber-800/30 rounded-xl p-3 text-[10px] text-amber-300 leading-normal text-left space-y-1">
                <span className="font-bold text-amber-400 block text-[11px] mb-0.5">⚠️ Purely Cosmetic Upgrade:</span>
                <p>
                  These choices are 100% cosmetic and have no effect on gameplay stats (speed, jumping heights, magnet ranges, or active multipliers remain unchanged).
                </p>
                <p className="opacity-80">
                  Build custom combinations and play fully in your style!
                </p>
              </div>
            </div>

            <div className="hidden md:block pt-3 border-t border-slate-850 text-[10px] text-slate-500 leading-tight">
              Earn subway coins entirely in the subway runs!
            </div>
          </div>

          {/* Right Side: Tab Items Area */}
          <div id="shop_grid_container" className="flex-1 overflow-y-auto p-6 md:p-8 bg-slate-950/40">
          
          {/* Characters Tab */}
          {activeTab === 'skins' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {SKINS.map((skin) => {
                const isUnlocked = userProfile.unlockedSkins.includes(skin.id);
                const isActive = userProfile.currentSkin === skin.id;
                return (
                  <div
                    key={skin.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      isActive
                        ? 'border-amber-500 bg-slate-900 shadow-md shadow-amber-500/5'
                        : isUnlocked
                        ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-900'
                        : 'border-slate-800/60 bg-slate-950/20 opacity-90'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Avatar preview dot and board strip */}
                      <div className="relative w-16 h-16 rounded-xl border border-slate-700 bg-slate-950 flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
                        {/* Hoodie simulation */}
                        <div
                          className="w-10 h-10 rounded-full mb-1"
                          style={{ backgroundColor: skin.color }}
                        />
                        {/* Board mini stripe */}
                        <div
                          className="absolute bottom-0 left-0 right-0 h-2"
                          style={{ backgroundColor: skin.boardColor }}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-lg">{skin.name}</h3>
                          {skin.isLegendary && (
                            <span className="bg-amber-950 text-amber-400 text-[10px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-800">
                              LGD
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                          {skin.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Board Style:</span>
                        <div className="w-5 h-3 rounded border border-slate-700" style={{ backgroundColor: skin.boardColor }} />
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          <Check className="w-4 h-4" /> Equipped
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleSelectSkin(skin.id)}
                          className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                        >
                          Equip Suit
                        </button>
                      ) : (
                        <button
                          disabled={purchasingId !== null}
                          onClick={() => handleBuySkin(skin)}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock {skin.cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Cap Styles Tab */}
          {activeTab === 'headwear' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {HEADWEARS.map((item) => {
                const isUnlocked = unlockedHeadwear.includes(item.id);
                const isActive = currentHeadwearSelected === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      isActive
                        ? 'border-amber-500 bg-slate-900 shadow-md shadow-amber-500/5'
                        : isUnlocked
                        ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-900'
                        : 'border-slate-800/60 bg-slate-950/20 opacity-90'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Cap preview graphic element */}
                      <div className="relative w-16 h-16 rounded-xl border border-slate-700 bg-slate-950 flex flex-col items-center justify-center overflow-hidden flex-shrink-0">
                        {item.id === 'none' ? (
                          <span className="text-slate-600 text-[10px] uppercase font-bold text-center">No Cap</span>
                        ) : (
                          <div className="relative flex flex-col items-center">
                            {/* Bill of a reverse cap */}
                            <div className="w-10 h-4 rounded-t-full relative" style={{ backgroundColor: item.color }} />
                            <div className="w-12 h-1.5 rounded-full mt-[-2px]" style={{ backgroundColor: item.color, opacity: 0.8 }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-lg">{item.name}</h3>
                          {item.cost >= 2000 && (
                            <span className="bg-amber-950 text-amber-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-800">
                              Royal
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Cap Color:</span>
                        <div className="w-4 h-4 rounded-full border border-slate-700" style={{ backgroundColor: item.color }} />
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          <Check className="w-4 h-4" /> Equipped
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleSelectHeadwear(item.id)}
                          className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                        >
                          Wear Cap
                        </button>
                      ) : (
                        <button
                          disabled={purchasingId !== null}
                          onClick={() => handleBuyHeadwear(item)}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock {item.cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Boards Deck Tab */}
          {activeTab === 'board_patterns' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {BOARD_PATTERNS.map((item) => {
                const isUnlocked = unlockedBoardPatterns.includes(item.id);
                const isActive = currentBoardPatternSelected === item.id;
                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      isActive
                        ? 'border-amber-500 bg-slate-900 shadow-md shadow-amber-500/5'
                        : isUnlocked
                        ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-900'
                        : 'border-slate-800/60 bg-slate-950/20 opacity-90'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Surfboard graphic element preview representation */}
                      <div className="relative w-16 h-16 rounded-xl border border-slate-700 bg-slate-950 flex flex-col items-center justify-center p-2 flex-shrink-0">
                        <div className="w-4 h-12 rounded-full relative overflow-hidden flex flex-col items-center justify-center border border-slate-800" style={{ backgroundColor: '#ffffff' }}>
                          {item.id === 'stripes' && (
                            <div className="absolute inset-0 flex flex-col justify-around">
                              <div className="h-1 bg-rose-500 w-full" />
                              <div className="h-1 bg-rose-500 w-full" />
                            </div>
                          )}
                          {item.id === 'flames' && (
                            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-orange-500 to-yellow-400" />
                          )}
                          {item.id === 'galaxy' && (
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-800 via-indigo-950 to-pink-500" />
                          )}
                          {item.id === 'solid' && (
                            <div className="absolute inset-0 bg-slate-900" />
                          )}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-lg">{item.name}</h3>
                          {item.cost >= 1000 && (
                            <span className="bg-amber-950 text-amber-400 text-[9px] font-black uppercase px-1.5 py-0.5 rounded border border-amber-800">
                              Cosmic
                            </span>
                          )}
                        </div>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Glove Hue:</span>
                        <div className="w-5 h-3 rounded border border-slate-700" style={{ backgroundColor: item.color }} />
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          <Check className="w-4 h-4" /> Equipped
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleSelectBoardPattern(item.id)}
                          className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                        >
                          Equip Deck
                        </button>
                      ) : (
                        <button
                          disabled={purchasingId !== null}
                          onClick={() => handleBuyBoardPattern(item)}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Unlock {item.cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Metros Tab */}
          {activeTab === 'environments' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fadeIn">
              {ENVIRONMENTS.map((env) => {
                const isUnlocked = userProfile.unlockedEnvironments.includes(env.id);
                const isActive = userProfile.currentEnvironment === env.id;
                return (
                  <div
                    key={env.id}
                    className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                      isActive
                        ? 'border-amber-500 bg-slate-900 shadow-md shadow-amber-500/5'
                        : isUnlocked
                        ? 'border-slate-800 bg-slate-900/40 hover:bg-slate-900'
                        : 'border-slate-800/60 bg-slate-950/20 opacity-90'
                    }`}
                  >
                    <div className="flex gap-4">
                      {/* Environment sky color sphere */}
                      <div
                        className="w-16 h-16 rounded-xl border border-slate-700 flex flex-col justify-around p-1.5 flex-shrink-0"
                        style={{ background: `linear-gradient(to bottom, ${env.skyColor}, ${env.groundColor})` }}
                      >
                        <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: env.accentColor }} />
                        <div className="h-2 rounded" style={{ backgroundColor: env.trackColor }} />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold text-white text-lg">{env.name}</h3>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                          {env.description}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-800/60 flex items-center justify-between">
                      <div className="flex gap-1.5">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: env.skyColor }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: env.trackColor }} />
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: env.accentColor }} />
                      </div>

                      {isActive ? (
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
                          <Check className="w-4 h-4" /> Active Domain
                        </div>
                      ) : isUnlocked ? (
                        <button
                          onClick={() => handleSelectEnv(env.id)}
                          className="px-4 py-1.5 bg-slate-800 text-white rounded-xl text-sm font-semibold tracking-wide hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                        >
                          Select Map
                        </button>
                      ) : (
                        <button
                          disabled={purchasingId !== null}
                          onClick={() => handleBuyEnv(env)}
                          className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-sm font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>Deploy {env.cost} Coins</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

        {/* Footnote */}
        <div id="shop_modal_footer" className="p-4 border-t border-slate-800 bg-slate-900/40 text-center text-slate-500 text-[10px] tracking-wide shrink-0">
          Subway coins are earned entirely in-game by collecting golden coins dangling along tracks! Keep surfing to progress.
        </div>
      </motion.div>
    </div>
  );
}
