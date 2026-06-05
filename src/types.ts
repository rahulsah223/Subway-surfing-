export interface UserProfile {
  userId: string;
  username: string;
  highScore: number;
  coins: number;
  currentSkin: string;
  currentEnvironment: string;
  currentHeadwear?: string; // added headwear custom slot
  currentBoardPattern?: string; // added board pattern custom slot
  dailyChallengeProgress: number; // e.g., coins collected today or total challenge progress
  dailyChallengeDate: string; // YYYY-MM-DD
  weeklyChallengeProgress?: number; // added weekly progress tracking
  weeklyChallengeDate?: string; // e.g., YYYY-[Week Number]
  unlockedSkins: string[]; // list of skinIds
  unlockedEnvironments: string[]; // list of environmentIds
  unlockedHeadwear?: string[]; // unlocked heads
  unlockedBoardPatterns?: string[]; // unlocked board designs
  friends?: string[]; // list of friend userIds
  claimedDailyIds?: string[]; // track which specific dailies are claimed
  claimedWeeklyIds?: string[]; // track which weekly missions are claimed
  dailyPowerupsCount?: number; // tracker for daily powerups Pickups
  weeklyScoreCumulative?: number; // tracker for weekly cumulative points
  weeklyRunsPlayed?: number; // tracker for weekly runs count
  claimedAchievementIds?: string[]; // track which achievements are claimed
  claimedLevelRewards?: number[]; // track which level rewards are claimed
  totalCoinsCollected?: number; // total lifetime coins collected
  totalPowerupsCollected?: number; // total lifetime power-ups collected
  totalRunsPlayed?: number; // total runs played lifetime
  language?: 'en' | 'es' | 'fr';
  soundEnabled?: boolean;
  soundVolume?: number;
  activeVisionId?: string;
  unlockedVisionIds?: string[];
  claimedVisionIds?: string[];
  activeVisionQuoteIndex?: number;
  updatedAt: Date | string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'score' | 'coins' | 'powerups' | 'runs';
  targetCount: number;
  rewardCoins: number;
}

export interface LeaderboardEntry {
  userId: string;
  username: string;
  score: number;
  activeSkin: string;
  timestamp: Date | string;
}

export interface Skin {
  id: string;
  name: string;
  description: string;
  cost: number;
  color: string; // Hex code or string for 3D render styling
  boardColor: string; // Color of the surfboard
  isLegendary?: boolean;
}

export interface GameEnvironment {
  id: string;
  name: string;
  description: string;
  cost: number;
  skyColor: string;
  groundColor: string;
  trackColor: string;
  accentColor: string;
}

export interface Headwear {
  id: string;
  name: string;
  description: string;
  cost: number;
  color: string;
}

export interface BoardPattern {
  id: string;
  name: string;
  description: string;
  cost: number;
  color: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  rewardCoins: number;
  type: 'coins' | 'score' | 'powerups'; // Type filter
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  targetCount: number;
  rewardCoins: number;
  type: 'coins' | 'score_cumulative' | 'runs_played';
}

export interface ObstacleType {
  x: number; // Lane index (-1 = left, 0 = middle, 1 = right)
  z: number; // Z-coordinate along the track
  type: 'train' | 'barrier_low' | 'barrier_high' | 'ramp';
  id: string;
  height: number;
  width: number;
}

export interface CoinType {
  x: number; // Lane index (-1, 0, 1)
  z: number; // Z-coordinate along the track
  y: number; // Elevation above ground
  id: string;
  collected?: boolean;
  isSuperCoin?: boolean; // Advanced tier coin indicators
  superCoinValue?: number; // Advanced coin double/mega points
}

export interface PowerUpType {
  x: number; // Lane index
  z: number;
  type: 'magnet' | 'multiplier' | 'shield' | 'boost';
  id: string;
  collected?: boolean;
}

export interface ParticleEffect {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
  type?: 'coin' | 'crash' | 'trail' | 'spark' | 'smoke' | 'bubble' | 'firework';
  drag?: number; // air resistance
  gravity?: number; // custom gravity value
  spinAngle?: number;
  spinSpeed?: number;
}
