import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../3d/GameEngine';
import { UserProfile } from '../types';
import { Shield, Coins, Sparkles, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface GameCanvasProps {
  userProfile: UserProfile;
  mode?: 'menu' | 'playing' | 'gameover';
  onCoinCollected: (count: number) => void;
  onScoreUpdated: (score: number) => void;
  onGameOver: (finalScore: number, finalCoins: number, finalPowerUps: number) => void;
}

export default function GameCanvas({ userProfile, mode = 'playing', onCoinCollected, onScoreUpdated, onGameOver }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [isTheater, setIsTheater] = useState(false);

  // New gameplay visual States
  const [comboCount, setComboCount] = useState(0);
  const [showFireAnim, setShowFireAnim] = useState(false);
  const [comboBonusText, setComboBonusText] = useState('');
  const [speedVignette, setSpeedVignette] = useState(0);

  // Randomly select one of the three visual themes when starting a new game
  const randomThemeIdRef = useRef<string>('');
  if (!randomThemeIdRef.current) {
    const cycleThemes = ['theme_sunset', 'theme_midnight', 'theme_industrial'];
    const randomIndex = Math.floor(Math.random() * cycleThemes.length);
    randomThemeIdRef.current = cycleThemes[randomIndex];
  }

  const themesMap: Record<string, string> = {
    theme_sunset: 'Sunset City',
    theme_midnight: 'Midnight Subway',
    theme_industrial: 'Industrial Yard'
  };
  const activeThemeName = themesMap[randomThemeIdRef.current] || 'Downtown Metro';

  // HUD and powerups visual timers state
  const [hudScale, setHudScale] = useState(1);
  const [hudCoins, setHudCoins] = useState(0);
  const [hudScore, setHudScore] = useState(0);
  const [activePowerUps, setActivePowerUps] = useState<{
    magnet: { active: boolean; duration: number };
    multiplier: { active: boolean; duration: number };
    shield: { active: boolean; duration: number };
    boost: { active: boolean; duration: number };
  }>({
    magnet: { active: false, duration: 0 },
    multiplier: { active: false, duration: 0 },
    shield: { active: false, duration: 0 },
    boost: { active: false, duration: 0 }
  });

  // Keep ThreeJS viewport sized perfectly during any transitions of theater view
  useEffect(() => {
    const handleSyncResize = () => {
      if (engineRef.current) {
        engineRef.current.handleResize();
      }
    };
    
    // Trigger multiple times to accommodate layout reflows: immediately, next frame, 100ms, and 250ms
    handleSyncResize();
    requestAnimationFrame(handleSyncResize);
    const t1 = setTimeout(handleSyncResize, 100);
    const t2 = setTimeout(handleSyncResize, 250);
    
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isTheater]);

  // Synchronize HTML5 escape key or native Fullscreen status
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isHtml5Fullscreen = !!document.fullscreenElement;
      if (!isHtml5Fullscreen && isTheater) {
        setIsTheater(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isTheater]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isTheater) {
      setIsTheater(true);
      try {
        if (containerRef.current.requestFullscreen) {
          containerRef.current.requestFullscreen();
        } else if ((containerRef.current as any).webkitRequestFullscreen) {
          (containerRef.current as any).webkitRequestFullscreen();
        }
      } catch (err) {
        console.warn("Fullscreen API blocked or unsupported in iframe. Utilizing smooth, immersive CSS theater-mode overlay instead.", err);
      }
    } else {
      setIsTheater(false);
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      } catch (err) {
        console.warn("Error exiting fullscreen:", err);
      }
    }
  };

  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    // Launch engine with randomly-selected active visual theme, plus active Headwear and Board pattern customizations
    const engine = new GameEngine(
      containerRef.current,
      canvasRef.current,
      userProfile.currentSkin,
      randomThemeIdRef.current,
      userProfile.currentHeadwear || 'none',
      userProfile.currentBoardPattern || 'solid',
      {
        onCoinCollected: (count) => {
          setHudCoins(count);
          onCoinCollected(count);
          // Quick bounce animation for the coin ticker
          setHudScale(1.15);
          setTimeout(() => setHudScale(1), 0.08); // optimized debounce
        },
        onScoreUpdated: (score) => {
          setHudScore(score);
          onScoreUpdated(score);
        },
        onGameOver: (finalScore, finalCoins, finalPowerUps) => {
          onGameOver(finalScore, finalCoins, finalPowerUps);
        },
        onPowerUpActivated: (type, duration, active) => {
          setActivePowerUps(prev => ({
            ...prev,
            [type]: { active, duration }
          }));
        },
        onComboUpdated: (comboCount, showAnim, bonusScore) => {
          setComboCount(comboCount);
          if (comboCount > 0) {
            setShowFireAnim(true);
            if (bonusScore > 0) {
              setComboBonusText(`+${bonusScore}`);
            }
          } else {
            setShowFireAnim(false);
            setComboBonusText('');
          }
        },
        onSpeedUpdated: (speedFactor) => {
          setSpeedVignette(speedFactor);
        }
      }
    );

    engine.isPlaying = (mode === 'playing');
    engine.soundEnabled = userProfile.soundEnabled !== false;
    engine.soundVolume = userProfile.soundVolume ?? 80;
    engineRef.current = engine;

    // Create tick render updates
    let lastTime = performance.now();
    let frameId: number;

    const tick = (now: number) => {
      const delta = Math.min((now - lastTime) / 1000, 0.1); // cap physics step to 100ms
      lastTime = now;
      
      if (engineRef.current) {
        engineRef.current.update(delta);
      }

      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);

    // Keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current || !engineRef.current.isPlaying) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          engineRef.current.switchLane('left');
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          engineRef.current.switchLane('right');
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          engineRef.current.jump();
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          engineRef.current.slide();
          break;
        case ' ': // Spacebar
        case 'Shift':
        case 'b':
        case 'B':
          engineRef.current.activateHoverboard();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // Swipe controls for responsive touch screens
    let startX = 0;
    let startY = 0;
    let lastTapTime = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;

      const currentTime = performance.now();
      const tapLength = currentTime - lastTapTime;
      if (tapLength < 300 && tapLength > 0) {
        // Double tap: Summon board!
        if (engineRef.current && engineRef.current.isPlaying) {
          engineRef.current.activateHoverboard();
        }
      }
      lastTapTime = currentTime;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!engineRef.current || !engineRef.current.isPlaying) return;

      const diffX = e.changedTouches[0].clientX - startX;
      const diffY = e.changedTouches[0].clientY - startY;

      const minSwipeDist = 35; // optimal sensitive swipe detection

      if (Math.abs(diffX) > Math.abs(diffY)) {
        // Horizontal swiping lane shifts
        if (Math.abs(diffX) > minSwipeDist) {
          if (diffX > 0) {
            engineRef.current.switchLane('right');
          } else {
            engineRef.current.switchLane('left');
          }
        }
      } else {
        // Vertical jump or duck (slide)
        if (Math.abs(diffY) > minSwipeDist) {
          if (diffY > 0) {
            engineRef.current.slide();
          } else {
            engineRef.current.jump();
          }
        }
      }
    };

    const blockDefaultTouchMove = (e: TouchEvent) => {
      if (e.cancelable) {
        e.preventDefault(); // Lock viewport panning so that surfing swipe controls don't scroll Web pages!
      }
    };

    const container = containerRef.current;
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });
    container.addEventListener('touchmove', blockDefaultTouchMove, { passive: false });

    // Handle viewport resize updates dynamically
    const handleResize = () => {
      if (engineRef.current) {
        engineRef.current.handleResize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchmove', blockDefaultTouchMove);
      
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [userProfile]);

  // Sync sound preferences dynamically when they update
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.soundEnabled = userProfile.soundEnabled !== false;
      engineRef.current.soundVolume = userProfile.soundVolume ?? 80;
    }
  }, [userProfile.soundEnabled, userProfile.soundVolume]);

  // Sync state changes from App view model
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.isPlaying = (mode === 'playing');
    }
  }, [mode]);

  const handleDoubleClick = () => {
    if (engineRef.current && engineRef.current.isPlaying) {
      engineRef.current.activateHoverboard();
    }
  };

  const handleVirtualHoverboard = () => engineRef.current?.activateHoverboard();

  return (
    <div
      id="game_viewport_root"
      ref={containerRef}
      onDoubleClick={handleDoubleClick}
      className={
        isTheater || mode === 'menu' || mode === 'playing' || mode === 'gameover'
          ? "fixed inset-0 w-screen h-screen z-0 select-none bg-slate-950 overflow-hidden"
          : "relative w-full h-[60vh] md:h-[75vh] select-none rounded-[32px] border border-slate-900 bg-slate-950 overflow-hidden"
      }
    >
      <canvas id="subway_surf_three_canvas" ref={canvasRef} className="w-full h-full block" />

      {/* High-Speed 'Tunnel Vision' or Motion Blur Post-Processing Overlay */}
      {mode === 'playing' && speedVignette > 0.1 && (
        <div 
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-10 overflow-hidden"
          style={{
            opacity: Math.max(0, Math.min(1.0, (speedVignette - 0.1) * 1.25)), // scales opacity cleanly
          }}
        >
          {/* Edge Blur Vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_45%,rgba(0,0,0,0.5)_75%,rgba(0,0,0,0.9)_100%)] mix-blend-multiply" />
          
          {/* Cosmic/Wind High-Speed Blur Streaks */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_35%,rgba(255,255,255,0.06)_60%,rgba(255,255,255,0.25)_100%)] mix-blend-screen" />
          
          {/* Fast-pulsing dash-wind speedlines */}
          <div className="absolute inset-0 bg-[repeating-radial-gradient(circle_at_center,transparent_0px,transparent_6px,rgba(255,255,255,0.025)_8px,rgba(255,255,255,0.075)_10px)] opacity-60 animate-pulse" style={{ transform: 'scale(1.15)', animationDuration: '0.15s' }} />
        </div>
      )}

      {/* Dynamic Active Theme Banner at top center - only visible during gameplay */}
      {mode === 'playing' && (
        <div
          id="active_theme_badge_container"
          className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-950/85 border border-slate-800/80 px-4 py-1.5 rounded-full pointer-events-none flex items-center gap-2 shadow-lg shadow-black/40 backdrop-blur-md z-10 select-none animate-fadeIn"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="text-[9px] uppercase font-sans tracking-widest text-slate-400 font-extrabold">VENUE:</span>
          <span className="text-[10px] uppercase font-mono tracking-wider text-white font-extrabold">
            {activeThemeName}
          </span>
        </div>
      )}

      {/* 1. TOP HUD (HUD displays coins, multipliers, score stats) - only visible during gameplay */}
      {mode === 'playing' && (
        <div id="game_hud_overlay" className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none gap-4">
          {/* Left Stats Indicator (Coins, Multiplier, combos) */}
          <div className="flex flex-col gap-2">
            {/* Coins gathered during active run */}
            <motion.div
              id="run_coins_counter"
              animate={{ scale: hudScale }}
              className="flex items-center gap-2 bg-slate-950/80 border border-slate-800 px-4 py-1.5 rounded-full select-none"
            >
              <Coins className="w-5 h-5 text-amber-500 fill-amber-500/20" />
              <span className="font-mono font-black text-amber-400 text-lg md:text-xl">
                {hudCoins}
              </span>
            </motion.div>

            {/* ON-SCREEN COMBO MULTIPLIER DISPLAY WITH FIRE SURGES */}
            <AnimatePresence>
              {comboCount > 1 && (
                <motion.div
                  key="combo-multiplier-hud-badge"
                  initial={{ opacity: 0, scale: 0.6, x: -20 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.6, x: -20 }}
                  className="flex items-center gap-2.5 bg-orange-950/90 border border-orange-500/40 rounded-full px-3 py-1 flex-row shadow-lg select-none pointer-events-none w-fit"
                >
                  <div className="relative flex items-center justify-center">
                    <Flame className="w-4 h-4 text-orange-500 fill-orange-500/10 animate-pulse" />
                    {showFireAnim && (
                      <div className="absolute inset-x-0 w-4 h-4 rounded-full bg-orange-500/30 blur-sm scale-150 animate-ping" style={{ animationDuration: '0.6s' }} />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-[9px] font-sans font-black tracking-widest text-orange-400 uppercase">COMBO</span>
                    <span className="font-mono font-black text-orange-300 text-sm tracking-tight">
                      {comboCount}x
                    </span>
                  </div>
                  {comboBonusText && (
                    <span className="text-[10px] font-mono font-bold text-orange-400 border-l border-orange-500/20 pl-1.5">
                      {comboBonusText}
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Active core score multiplier banner if active */}
            {engineRef.current?.scoreMultiplier ? (
              <div id="multiplier_indicator" className="flex items-center gap-1 bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 px-3 py-1 rounded-full text-xs font-black select-none tracking-wider w-fit">
                <Sparkles className="w-3.5 h-3.5 animate-spin" />
                <span>X{engineRef.current.scoreMultiplier}</span>
              </div>
            ) : null}
          </div>

          {/* Right Controls Row (HUD Actions of score indicator) */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Score Board indicator */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl px-5 py-2 flex flex-col items-end">
              <span className="text-[10px] text-slate-500 tracking-wider font-mono font-bold">SCORE</span>
              <span className="font-mono font-black text-xl md:text-2xl tracking-tighter text-white">
                {hudScore.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 2. POWER-UP TIMERS (Shows remaining duration counts) - only visible during gameplay */}
      {mode === 'playing' && (
        <div id="powerups_progress_overlay" className="absolute left-4 bottom-4 flex flex-col gap-2 pointer-events-none max-w-[150px] md:max-w-[200px]">
          <AnimatePresence>
            {activePowerUps.magnet.active && (
              <motion.div
                key="powerup-magnet"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex items-center gap-2 bg-red-950/80 border border-red-500/30 rounded-xl p-2"
              >
                <Coins className="w-4 h-4 text-red-500 fill-red-500/20" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-wider">Magnet</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-red-500"
                      style={{ width: `${(activePowerUps.magnet.duration / 10000) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activePowerUps.multiplier.active && (
              <motion.div
                key="powerup-multiplier"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex items-center gap-2 bg-yellow-950/80 border border-yellow-500/30 rounded-xl p-2"
              >
                <Sparkles className="w-4 h-4 text-yellow-500 fill-yellow-500/20" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-wider">Doubler</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${(activePowerUps.multiplier.duration / 10000) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activePowerUps.shield.active && (
              <motion.div
                key="powerup-shield"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex items-center gap-2 bg-blue-950/80 border border-blue-500/30 rounded-xl p-2"
              >
                <Shield className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-white uppercase tracking-wider">Shield</p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(activePowerUps.shield.duration / 10000) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {activePowerUps.boost.active && (
              <motion.div
                key="powerup-boost"
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="flex items-center gap-2 bg-orange-950/80 border border-orange-500/40 rounded-xl p-2"
              >
                <Sparkles className="w-4 h-4 text-orange-500 animate-pulse" />
                <div className="flex-1">
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-wider flex items-center gap-1">
                    Rocket Boost
                  </p>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${(activePowerUps.boost.duration / 10000) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 3. KEYBOARD & SWIPE CONTROLS GUIDE (Prinstine, clear, readable) - only visible during active gameplay */}
      {mode === 'playing' && (
        <div id="control_guide_tooltip" className="absolute bottom-4 left-4 right-auto bg-slate-950/80 border border-slate-800 px-4 py-2.5 rounded-2xl pointer-events-none select-none max-w-[280px] md:max-w-md hidden sm:block">
          <p className="text-[10px] text-slate-400 font-semibold font-sans leading-relaxed">
            <span className="text-white font-bold uppercase tracking-wider block mb-1 text-emerald-400 text-xs">HOW TO PLAY</span>
            Swipe on touch screen or use desktop keys (<strong className="text-cyan-400 font-bold">A/D/W/S</strong> or <strong className="text-cyan-400 font-bold">Arrows</strong>). Press <strong className="text-cyan-400 font-bold">SHIFT / SPACE</strong>, double-click, or tap the <strong className="text-cyan-400 font-bold">BOARD</strong> button to activate your board!
          </p>
        </div>
      )}

      {/* 4. ON-SCREEN RESPONSIVE GAMEPAD BUTTONS (Translucent design, perfect for iframe and touchscreens) */}
      {mode === 'playing' && (
        <div id="virtual_gamepad" className="absolute bottom-4 right-4 flex items-center gap-2 z-20 pointer-events-auto">
          {/* Hoverboard trigger */}
          <button
            id="btn_summon_hoverboard"
            onClick={handleVirtualHoverboard}
            disabled={activePowerUps.shield.active || activePowerUps.boost.active}
            className="w-12 h-12 flex flex-col items-center justify-center bg-cyan-950/80 hover:bg-cyan-900/90 disabled:opacity-40 disabled:scale-100 disabled:cursor-not-allowed hover:border-cyan-400 border border-cyan-500/30 text-cyan-400 rounded-xl shadow-lg shadow-cyan-950/50 backdrop-blur-md active:scale-95 transition-all select-none cursor-pointer"
            title="Summon Hoverboard (SPACE / SHIFT / Double Tapping)"
          >
            <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-[7px] uppercase font-black tracking-wider text-cyan-300 mt-0.5">BOARD</span>
          </button>
        </div>
      )}
    </div>
  );
}
