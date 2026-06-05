import { UserProfile } from '../types';

export interface LevelInfo {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  totalXP: number;
  progressPercentage: number;
  rankTitle: string;
  rankColor: string;
  rewardClaimed: boolean;
  nextUnlockName: string;
}

// Experience point breakdown:
// - 1 XP per Point of high score
// - 10 XP per Gold coin collected (lifetime)
// - 100 XP per power-up collected (lifetime)
// - 250 XP per run completed (lifetime)
export function calculatePlayerXP(profile: UserProfile): number {
  const scoreXP = profile.highScore || 0;
  const coinsXP = (profile.totalCoinsCollected || 0) * 10;
  const powerupXP = (profile.totalPowerupsCollected || 0) * 100;
  const runsXP = (profile.totalRunsPlayed || 0) * 250;
  
  return scoreXP + coinsXP + powerupXP + runsXP;
}

// Level threshold mapping (Quadratic scaling curves to make leveling satisfying yet challenging)
// Level 1: 0 XP
// Level 2: 1,500 XP
// Level 3: 4,000 XP
// Level 4: 8,000 XP
// Level 5: 15,000 XP
// Level 6: 25,000 XP
// Level 7: 40,000 XP
// Level 8: 60,000 XP
// Level 9: 90,000 XP
// Level 10+: 125,000+ XP
export function getLevelInfo(profile: UserProfile): LevelInfo {
  const totalXP = calculatePlayerXP(profile);
  
  const thresholds = [
    0,       // Lvl 1
    1500,    // Lvl 2
    4000,    // Lvl 3
    8000,    // Lvl 4
    15000,   // Lvl 5
    25000,   // Lvl 6
    40000,   // Lvl 7
    60000,   // Lvl 8
    90000,   // Lvl 9
    125000,  // Lvl 10
    170000,  // Lvl 11
    225000,  // Lvl 12
    300000,  // Lvl 13
  ];

  let level = 1;
  while (level < thresholds.length && totalXP >= thresholds[level]) {
    level++;
  }

  const currentThreshold = thresholds[level - 1];
  const nextThreshold = level < thresholds.length ? thresholds[level] : currentThreshold + 100000;
  
  const currentLevelXP = totalXP - currentThreshold;
  const nextLevelXP = nextThreshold - currentThreshold;
  const progressPercentage = Math.min(100, Math.max(0, (currentLevelXP / nextLevelXP) * 100));

  // Determine Rank visual metrics and dynamic street authority levels
  let rankTitle = 'Recruit Rider';
  let rankColor = 'border-slate-500 text-slate-400 bg-slate-500/10';
  
  if (level >= 10) {
    rankTitle = 'Astral Legend';
    rankColor = 'border-rose-500 text-rose-400 bg-rose-500/15 animate-pulse';
  } else if (level >= 8) {
    rankTitle = 'Cyber Surfer Grandmaster';
    rankColor = 'border-purple-500 text-purple-400 bg-purple-500/15';
  } else if (level >= 6) {
    rankTitle = 'Diamond Rail Blazer';
    rankColor = 'border-cyan-500 text-cyan-400 bg-cyan-500/15';
  } else if (level >= 4) {
    rankTitle = 'Gold Street Authority';
    rankColor = 'border-amber-500 text-amber-400 bg-amber-500/15';
  } else if (level >= 2) {
    rankTitle = 'Chrome Subway Competitor';
    rankColor = 'border-emerald-500 text-emerald-400 bg-emerald-500/15';
  }

  // Next cosmetic unlock hints
  let nextUnlockName = 'More Coin Rewards';
  if (level === 1) nextUnlockName = 'Tricky (Neon Outfit)';
  else if (level === 2) nextUnlockName = 'Cyber Grid map';
  else if (level === 3) nextUnlockName = 'Gamer Beats Headset';
  else if (level === 4) nextUnlockName = 'Inferno Flames Board';
  else if (level === 5) nextUnlockName = 'Temple Ancient Map';
  else if (level === 6) nextUnlockName = 'Imperial Crown';
  else if (level === 7) nextUnlockName = 'Price K (Imperial Outfit)';
  else if (level === 8) nextUnlockName = 'Cosmic Nebula Board';

  return {
    level,
    currentLevelXP,
    nextLevelXP,
    totalXP,
    progressPercentage,
    rankTitle,
    rankColor,
    rewardClaimed: false, // can claim level reward in dashboard
    nextUnlockName,
  };
}

// Dynamic reward allocation based on level progression
export function getLevelUpReward(level: number): { rewardCoins: number; itemUnlocked?: string } {
  const baseReward = level * 150;
  
  let itemUnlocked: string | undefined;
  if (level === 2) itemUnlocked = 'Neon Cap';
  else if (level === 4) itemUnlocked = 'Laser Stripes board pattern';
  else if (level === 6) itemUnlocked = 'Ancient Gate track access';
  
  return {
    rewardCoins: baseReward,
    itemUnlocked
  };
}
