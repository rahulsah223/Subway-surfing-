import React, { useState } from 'react';
import { Calendar, CheckCircle2, Gift, X, Coins, Sparkles, Flame, Trophy } from 'lucide-react';
import { DailyChallenge, WeeklyChallenge, UserProfile } from '../types';
import { DAILY_CHALLENGES, WEEKLY_CHALLENGES } from '../constants';
import { motion, AnimatePresence } from 'motion/react';

interface DailyChallengesModalProps {
  key?: React.Key;
  userProfile: UserProfile;
  onClose: () => void;
  onUpdateProfile: (profile: Partial<UserProfile>) => Promise<void>;
}

export default function DailyChallengesModal({ userProfile, onClose, onUpdateProfile }: DailyChallengesModalProps) {
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [successCoins, setSuccessCoins] = useState<number | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const isDailyStale = userProfile.dailyChallengeDate !== todayStr;

  const getWeekString = () => {
    const d = new Date();
    const oneJan = new Date(d.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
    const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
    return `${d.getFullYear()}-W${weekNumber}`;
  };
  const thisWeekStr = getWeekString();
  const isWeeklyStale = userProfile.weeklyChallengeDate !== thisWeekStr;

  const getDailyProgress = (id: string) => {
    switch (id) {
      case 'collect_coins':
        return isDailyStale ? 0 : userProfile.dailyChallengeProgress;
      case 'high_score':
        return userProfile.highScore;
      case 'magnets_co':
        return isDailyStale ? 0 : (userProfile.dailyPowerupsCount || 0);
      default:
        return 0;
    }
  };

  const getWeeklyProgress = (id: string) => {
    switch (id) {
      case 'weekly_coins':
        return isWeeklyStale ? 0 : (userProfile.weeklyChallengeProgress || 0);
      case 'weekly_score':
        return isWeeklyStale ? 0 : (userProfile.weeklyScoreCumulative || 0);
      case 'weekly_runs':
        return isWeeklyStale ? 0 : (userProfile.weeklyRunsPlayed || 0);
      default:
        return 0;
    }
  };

  const claimedDailyIds = isDailyStale ? [] : (userProfile.claimedDailyIds || []);
  const claimedWeeklyIds = isWeeklyStale ? [] : (userProfile.claimedWeeklyIds || []);

  const handleClaimDaily = async (challenge: DailyChallenge) => {
    const progress = getDailyProgress(challenge.id);
    if (progress < challenge.targetCount || claimedDailyIds.includes(challenge.id)) return;
    setClaimingId(challenge.id);

    try {
      const rewardVal = challenge.rewardCoins;
      const nextClaims = [...claimedDailyIds, challenge.id];
      await onUpdateProfile({
        coins: userProfile.coins + rewardVal,
        claimedDailyIds: nextClaims,
        dailyChallengeDate: todayStr
      });
      setSuccessCoins(rewardVal);
      setTimeout(() => setSuccessCoins(null), 3000);
    } catch (e) {
      console.error("Failed to claim daily challenge:", e);
    } finally {
      setClaimingId(null);
    }
  };

  const handleClaimWeekly = async (challenge: WeeklyChallenge) => {
    const progress = getWeeklyProgress(challenge.id);
    if (progress < challenge.targetCount || claimedWeeklyIds.includes(challenge.id)) return;
    setClaimingId(challenge.id);

    try {
      const rewardVal = challenge.rewardCoins;
      const nextClaims = [...claimedWeeklyIds, challenge.id];
      await onUpdateProfile({
        coins: userProfile.coins + rewardVal,
        claimedWeeklyIds: nextClaims,
        weeklyChallengeDate: thisWeekStr
      });
      setSuccessCoins(rewardVal);
      setTimeout(() => setSuccessCoins(null), 3000);
    } catch (e) {
      console.error("Failed to claim weekly challenge:", e);
    } finally {
      setClaimingId(null);
    }
  };

  // Badge notification indicators
  const dailyUnclaimedCount = DAILY_CHALLENGES.filter(
    c => getDailyProgress(c.id) >= c.targetCount && !claimedDailyIds.includes(c.id)
  ).length;

  const weeklyUnclaimedCount = WEEKLY_CHALLENGES.filter(
    c => getWeeklyProgress(c.id) >= c.targetCount && !claimedWeeklyIds.includes(c.id)
  ).length;

  return (
    <div id="challenges_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        id="challenges_modal_container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div id="challenges_modal_header" className="p-6 border-b border-slate-800 bg-slate-1000 flex justify-between items-center bg-slate-950">
          <div className="flex items-center gap-3">
            <Trophy className="w-8 h-8 text-amber-400" />
            <div>
              <h2 className="text-2xl font-bold font-sans tracking-tight text-white">Metro Challenges</h2>
              <p className="text-slate-400 text-sm">Unlock rewards through cumulative street performances</p>
            </div>
          </div>
          <button
            id="close_challenges_btn"
            onClick={onClose}
            className="p-1 px-3 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Claim Success Celebration Banner */}
        <AnimatePresence>
          {successCoins !== null && (
            <motion.div
              key="daily-claim-success-banner"
              id="claim_success_banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="bg-emerald-500 text-slate-950 text-sm font-bold py-3 px-6 flex items-center justify-center gap-2 shrink-0"
            >
              <Gift className="w-5 h-5 shrink-0" />
              <span>Congratulations! Claimed +{successCoins} Coins successfully!</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Challenge Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-950 px-6 shrink-0">
          <button
            onClick={() => setActiveTab('daily')}
            className={`flex items-center gap-2 py-4 border-b-2 px-4 transition-all text-sm font-bold tracking-wide relative ${
              activeTab === 'daily'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>Daily Missions</span>
            {dailyUnclaimedCount > 0 && (
              <span className="absolute top-2 right-1.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('weekly')}
            className={`flex items-center gap-2 py-4 border-b-2 px-4 transition-all text-sm font-bold tracking-wide relative ${
              activeTab === 'weekly'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Weekly Quests</span>
            {weeklyUnclaimedCount > 0 && (
              <span className="absolute top-2 right-1.5 w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            )}
          </button>
        </div>

        {/* Lists Container */}
        <div id="challenges_list" className="flex-1 overflow-y-auto p-6 bg-slate-950/40 space-y-5">
          {activeTab === 'daily' ? (
            DAILY_CHALLENGES.map((challenge) => {
              const progress = getDailyProgress(challenge.id);
              const isClaimed = claimedDailyIds.includes(challenge.id);
              const isCompleted = progress >= challenge.targetCount;
              const progressVal = isClaimed ? challenge.targetCount : progress;
              const percentage = Math.min((progressVal / challenge.targetCount) * 100, 100);

              return (
                <div
                  key={challenge.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    isClaimed
                      ? 'border-slate-800 bg-slate-900/10 opacity-60'
                      : isCompleted
                      ? 'border-emerald-500 bg-emerald-500/5'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight">{challenge.title}</h3>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{challenge.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-emerald-400 font-bold bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg text-xs shrink-0">
                      <Coins className="w-3.5 h-3.5 fill-emerald-500/10 text-emerald-400" />
                      <span>+{challenge.rewardCoins}</span>
                    </div>
                  </div>

                  {/* Progress Tracker bar */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Missions Tracker</span>
                      <span className="font-mono font-bold text-slate-300">
                        {isClaimed ? 'Claimed' : `${progressVal} / ${challenge.targetCount}`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isClaimed
                            ? 'bg-slate-600'
                            : isCompleted
                            ? 'bg-emerald-505 bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : 'bg-emerald-550 bg-amber-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-end">
                    {isClaimed ? (
                      <div className="flex items-center gap-1 text-slate-400 font-medium text-xs py-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Completed
                      </div>
                    ) : isCompleted ? (
                      <button
                        id={`claim_daily_btn_${challenge.id}`}
                        disabled={claimingId !== null}
                        onClick={() => handleClaimDaily(challenge)}
                        className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500 to-green-400 border-none flex items-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/15 transition-transform active:scale-95"
                      >
                        <Gift className="w-4 h-4" /> Claim Reward
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic py-1">
                        Play tracks to complete the mission
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            WEEKLY_CHALLENGES.map((challenge) => {
              const progress = getWeeklyProgress(challenge.id);
              const isClaimed = claimedWeeklyIds.includes(challenge.id);
              const isCompleted = progress >= challenge.targetCount;
              const progressVal = isClaimed ? challenge.targetCount : progress;
              const percentage = Math.min((progressVal / challenge.targetCount) * 100, 100);

              return (
                <div
                  key={challenge.id}
                  className={`rounded-2xl border p-5 flex flex-col justify-between transition-all ${
                    isClaimed
                      ? 'border-slate-800 bg-slate-900/10 opacity-60'
                      : isCompleted
                      ? 'border-amber-500 bg-amber-500/5'
                      : 'border-slate-800 bg-slate-900/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>{challenge.title}</span>
                      </h3>
                      <p className="text-slate-400 text-xs mt-1 leading-relaxed">{challenge.description}</p>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg text-xs shrink-0">
                      <Coins className="w-3.5 h-3.5 fill-amber-500/10 text-amber-400" />
                      <span>+{challenge.rewardCoins}</span>
                    </div>
                  </div>

                  {/* Progress Tracker bar */}
                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">Weekly Progress</span>
                      <span className="font-mono font-bold text-slate-300">
                        {isClaimed ? 'Claimed' : `${progressVal.toLocaleString()} / ${challenge.targetCount.toLocaleString()}`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          isClaimed
                            ? 'bg-slate-600'
                            : isCompleted
                            ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="mt-4 pt-3 border-t border-slate-800/40 flex justify-end">
                    {isClaimed ? (
                      <div className="flex items-center gap-1 text-slate-400 font-medium text-xs py-1">
                        <CheckCircle2 className="w-4 h-4 text-amber-500" /> Claimed Successfully
                      </div>
                    ) : isCompleted ? (
                      <button
                        id={`claim_weekly_btn_${challenge.id}`}
                        disabled={claimingId !== null}
                        onClick={() => handleClaimWeekly(challenge)}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold bg-gradient-to-r from-amber-500 to-yellow-400 border-none flex items-center gap-1.5 cursor-pointer shadow-lg shadow-amber-500/15 transition-transform active:scale-95"
                      >
                        <Gift className="w-4 h-4" /> Claim Weekly Reward
                      </button>
                    ) : (
                      <div className="text-[11px] text-slate-500 italic py-1">
                        Accumulate milestones across multiple runs
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Reset warnings footer */}
        <div id="challenges_modal_footer" className="p-4 border-t border-slate-800 bg-slate-950 text-center text-slate-500 text-xs shrink-0">
          Missions rotate every 24 hours. Weekly quests refresh every Sunday. Keep riding!
        </div>
      </motion.div>
    </div>
  );
}
