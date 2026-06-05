import React, { useState } from 'react';
import { Trophy, Check, Lock, X, Sparkles, Coins, Award } from 'lucide-react';
import { ACHIEVEMENTS } from '../constants';
import { UserProfile, Achievement } from '../types';
import { motion, AnimatePresence } from 'motion/react';

interface AchievementsModalProps {
  key?: React.Key;
  userProfile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export default function AchievementsModal({ userProfile, onClose, onUpdateProfile }: AchievementsModalProps) {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);

  // Fallback defaults for older guest configurations
  const claimedIds = userProfile.claimedAchievementIds || [];
  const totalCoins = userProfile.totalCoinsCollected || 0;
  const totalPowerups = userProfile.totalPowerupsCollected || 0;
  const totalRuns = userProfile.totalRunsPlayed || 0;
  const highScore = userProfile.highScore || 0;

  // Resolve user current value for an achievement's progress tracker
  const getProgressValue = (achievement: Achievement): number => {
    switch (achievement.category) {
      case 'score':
        return highScore;
      case 'coins':
        return totalCoins;
      case 'powerups':
        return totalPowerups;
      case 'runs':
        return totalRuns;
      default:
        return 0;
    }
  };

  const handleClaim = async (achievement: Achievement) => {
    if (claimingId) return;
    
    const currValue = getProgressValue(achievement);
    if (currValue < achievement.targetCount) return; // Not met yet
    if (claimedIds.includes(achievement.id)) return; // Already claimed

    setClaimingId(achievement.id);
    try {
      const nextClaimed = [...claimedIds, achievement.id];
      const nextCoins = userProfile.coins + achievement.rewardCoins;
      
      await onUpdateProfile({
        coins: nextCoins,
        claimedAchievementIds: nextClaimed
      });

      setSuccessInfo(`Claimed "${achievement.title}"! +${achievement.rewardCoins} gold coins!`);
      setTimeout(() => setSuccessInfo(null), 3500);
    } catch (e) {
      console.error(e);
    } finally {
      setClaimingId(null);
    }
  };

  return (
    <div id="achievements_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        id="achievements_modal_container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div id="achievements_modal_header" className="p-6 border-b border-slate-800 bg-slate-950 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            <div>
              <h2 className="text-2xl font-bold font-sans tracking-tight text-white">Milestones & Medals</h2>
              <p className="text-slate-400 text-sm">Unlock street credentials and claim subway gold rewards</p>
            </div>
          </div>
          
          <div id="achievements_header_coins" className="flex items-center gap-4">
            <div className="bg-amber-950/40 border border-amber-800 rounded-full px-4 py-1.5 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center text-xs font-black text-slate-950">
                $
              </span>
              <span className="font-mono font-bold text-amber-400">{userProfile.coins}</span>
            </div>
            
            <button
              id="close_achievements_btn"
              onClick={onClose}
              className="p-1 px-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Success alert banner */}
        <AnimatePresence>
          {successInfo && (
            <motion.div
              key="achievement-success-banner"
              id="achievements_success_banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500/10 border-b border-emerald-500/20 text-emerald-400 text-xs md:text-sm py-2 px-6 flex items-center justify-center gap-2 font-bold"
            >
              <Sparkles className="w-4 h-4 text-emerald-400 animate-spin" />
              <span>{successInfo}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Summary Panel */}
        <div id="achievements_stats_summary" className="grid grid-cols-4 border-b border-slate-800 bg-slate-900/40 p-3 text-center text-xs text-slate-400">
          <div>
            <div className="font-mono text-white text-base font-bold">{highScore.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Max Score</div>
          </div>
          <div>
            <div className="font-mono text-white text-base font-bold">{totalCoins.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500 font-sans">Total Coins</div>
          </div>
          <div>
            <div className="font-mono text-white text-base font-bold">{totalPowerups.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Powerups</div>
          </div>
          <div>
            <div className="font-mono text-white text-base font-bold">{totalRuns.toLocaleString()}</div>
            <div className="text-[10px] text-slate-500">Runs Surfed</div>
          </div>
        </div>

        {/* Main milestones list */}
        <div id="achievements_list" className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-950/40">
          {ACHIEVEMENTS.map((ach) => {
            const currentVal = getProgressValue(ach);
            const isCompleted = currentVal >= ach.targetCount;
            const isClaimed = claimedIds.includes(ach.id);
            const pct = Math.min(100, Math.floor((currentVal / ach.targetCount) * 100));

            return (
              <div
                key={ach.id}
                id={`achievement_card_${ach.id}`}
                className={`relative rounded-2xl border p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all ${
                  isClaimed
                    ? 'border-slate-800/40 bg-slate-900/10 opacity-60'
                    : isCompleted
                    ? 'border-yellow-500/40 bg-slate-900/80 shadow-md shadow-yellow-500/5'
                    : 'border-slate-800 bg-slate-900/40'
                }`}
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      isClaimed ? 'bg-slate-800 text-slate-400' : isCompleted ? 'bg-yellow-500/20 text-yellow-400' : 'bg-slate-800 text-slate-300'
                    }`}>
                      {isClaimed ? (
                        <Check className="w-4 h-4" />
                      ) : isCompleted ? (
                        <Award className="w-4 h-4" />
                      ) : (
                        <Lock className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base flex items-center gap-2">
                        {ach.title}
                        {isCompleted && !isClaimed && (
                          <span className="bg-rose-500 animate-pulse text-[9px] font-black uppercase px-1 rounded text-white tracking-wider">
                            Ready
                          </span>
                        )}
                      </h3>
                      <p className="text-slate-400 text-xs">{ach.description}</p>
                    </div>
                  </div>

                  {/* Progress bar container */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-500">PROGRESS:</span>
                      <span className={isCompleted ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                        {currentVal.toLocaleString()} / {ach.targetCount.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full transition-all duration-300 ${
                          isClaimed
                            ? 'bg-slate-600'
                            : isCompleted
                            ? 'bg-emerald-400'
                            : 'bg-gradient-to-r from-yellow-600 to-yellow-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Right hand selector / claim state */}
                <div className="shrink-0 flex items-center justify-end">
                  {isClaimed ? (
                    <div className="text-slate-500 text-sm font-semibold flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
                      <Check className="w-4 h-4" /> Unlocked
                    </div>
                  ) : isCompleted ? (
                    <button
                      disabled={claimingId !== null}
                      onClick={() => handleClaim(ach)}
                      className="px-4 py-2 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-slate-950 font-black text-xs md:text-sm tracking-wide rounded-xl shadow-lg hover:shadow-yellow-500/20 transform active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer border border-yellow-300/30"
                    >
                      <Coins className="w-4 h-4 animate-bounce" />
                      <span>CLAIM ${ach.rewardCoins}</span>
                    </button>
                  ) : (
                    <div className="text-slate-500 text-xs font-medium bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
                      Reward: <span className="text-amber-400 font-bold">${ach.rewardCoins}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
