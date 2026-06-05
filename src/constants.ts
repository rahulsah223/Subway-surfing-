import { Skin, GameEnvironment, DailyChallenge, WeeklyChallenge, Headwear, BoardPattern, Achievement } from './types';

export const SKINS: Skin[] = [
  {
    id: 'urchin',
    name: 'Jake (Street Legend)',
    description: 'The iconic face of Subway Surfers, sporting his classic red hoodie, denim pants, and backwards graffiti cap.',
    cost: 0,
    color: '#ef4444', // Red hoodie
    boardColor: '#facc15', // Yellow board
  },
  {
    id: 'neon',
    name: 'Tricky (Beanie Girl)',
    description: 'The high-velocity skater girl featuring signature blonde side-bangs and a bold red beanie.',
    cost: 500,
    color: '#475569', // Gray vest skater tee
    boardColor: '#ec4899', // Hot Pink
  },
  {
    id: 'speedster',
    name: 'Fresh (Groovy Radio)',
    description: 'Cool style retro kid rocking a block-tall flat top fade hair, vintage green windbreaker, and retro boom sound waves.',
    cost: 1500,
    color: '#10b981', // Retro green
    boardColor: '#06b6d4', // Cyan track deck
  },
  {
    id: 'yutani',
    name: 'Yutani (Sci-Fi Alien)',
    description: 'A brilliant code scientist inside a bright green three-eyed alien costume with wiggly antennas.',
    cost: 3000,
    color: '#22c55e', // Lime alien green
    boardColor: '#a855f7', // Mystic purple
    isLegendary: true,
  },
  {
    id: 'golden',
    name: 'Prince K (Imperial Gold)',
    description: 'Shrouded in ultimate gold luxury plates, expensive diamond shades, and golden gravity hoverboards.',
    cost: 6000,
    color: '#fbbf24', // Shiny yellow gold
    boardColor: '#78350f', // Dark amber/brown deck
    isLegendary: true,
  }
];

export const HEADWEARS: Headwear[] = [
  { id: 'none', name: 'Bare Headed', description: 'No hat or headgear. Safe and classic.', cost: 0, color: '#fbcfe8' },
  { id: 'cap', name: 'Metro Cap', description: 'Cool urban sports cap worn backwards.', cost: 200, color: '#f87171' },
  { id: 'bandana', name: 'Punk Bandana', description: 'Rebellious graffiti style violet face wrap.', cost: 500, color: '#a78bfa' },
  { id: 'headphones', name: 'Gamer Beats', description: 'Sleek cyan noise canceling gamer gear.', cost: 1000, color: '#22d3ee' },
  { id: 'crown', name: 'Imperial Crown', description: 'Bejeweled gold royal crown fit for emperors.', cost: 2500, color: '#fbbf24' },
];

export const BOARD_PATTERNS: BoardPattern[] = [
  { id: 'solid', name: 'Classic Solid', description: 'Clean uniform color background pattern.', cost: 0, color: '#000000' },
  { id: 'stripes', name: 'Laser Stripes', description: 'Dashing laser track lines running down the board.', cost: 300, color: '#f43f5e' },
  { id: 'flames', name: 'Inferno Flames', description: 'Hot fiery sparks airbrushed onto the deck.', cost: 800, color: '#f97316' },
  { id: 'galaxy', name: 'Cosmic Nebula', description: 'Space dust aura of glowing violet coordinates.', cost: 1500, color: '#a855f7' },
];

export const ENVIRONMENTS: GameEnvironment[] = [
  {
    id: 'downtown',
    name: 'Sunny Downtown',
    description: 'Bright sunlit city morning tracks surrounded by urban brick arches, billboards, and warm day vibes.',
    cost: 0,
    skyColor: '#38bdf8', // Crisp morning blue sky
    groundColor: '#475569', // Clear grey pavement
    trackColor: '#1e293b', // Rail tracks
    accentColor: '#f59e0b', // Glowing sunlit billboards
  },
  {
    id: 'cyber',
    name: 'Cyber Daylight',
    description: 'A futuristic digital metro grid glistening under a ultra-bright cyan and pink digital sky.',
    cost: 800,
    skyColor: '#06b6d4', // Bright cyan cyber sky
    groundColor: '#0f172a', // Clean metallic slate pavement
    trackColor: '#3b0764', // Deep energetic tracks
    accentColor: '#f43f5e', // Hot pink neon daytime stripes
  },
  {
    id: 'temple',
    name: 'Ancient Day Ruins',
    description: 'Surf through ancient sun-drenched ruins surrounded by bright tropical trees and glowing gold plaques.',
    cost: 2000,
    skyColor: '#2dd4bf', // Tropical turquoise daytime sky
    groundColor: '#334155', // Ancient polished stones
    trackColor: '#78350f', // Polished copper-gold tracks
    accentColor: '#fbbf24', // Sun breaking flares
  },
  {
    id: 'theme_sunset',
    name: 'Golden Sunset Hour',
    description: 'A gorgeous layout of warm gradients, gorgeous amber horizons, and golden sky tower silhouettes.',
    cost: 0,
    skyColor: '#f97316', // Vibrant bright sunset orange
    groundColor: '#334155', // Soft asphalt
    trackColor: '#1e293b', // Cool track rails
    accentColor: '#fbcfe8', // Rosy clouds glow
  },
  {
    id: 'theme_midnight',
    name: 'Bright Midday Surf',
    description: 'A pristine, bright alpine-midday station under gorgeous, dense fluffy clouds and direct white sun beams.',
    cost: 0,
    skyColor: '#0ea5e9', // Glorious bright sky-blue
    groundColor: '#1e293b', // Urban concrete paths
    trackColor: '#0f172a', // Polished track rails
    accentColor: '#a78bfa', // Lavender mountain backdrop
  },
  {
    id: 'theme_industrial',
    name: 'Sunlit Rail Yard',
    description: 'An expansive industrial loading yard glistening under direct bright golden-yellow warning hazard light beams.',
    cost: 0,
    skyColor: '#60a5fa', // Soft daylight blue
    groundColor: '#44403c', // Warm charcoal asphalt
    trackColor: '#7c2d12', // Warm copper orange rails
    accentColor: '#ea580c', // Bright yellow hazard safety lights
  }
];

export const DAILY_CHALLENGES: DailyChallenge[] = [
  {
    id: 'collect_coins',
    title: 'Daily Coin Gathering',
    description: 'Collect 100 gold coins across your runs to earn a daily reward.',
    targetCount: 100,
    rewardCoins: 250,
    type: 'coins',
  },
  {
    id: 'high_score',
    title: 'Precision Surfing Challenge',
    description: 'Achieve a score of 3,000 points in a single run to prove your grit.',
    targetCount: 3000, // Will track highscore achieved
    rewardCoins: 400,
    type: 'score',
  },
  {
    id: 'magnets_co',
    title: 'Magnetic Attractions',
    description: 'Score 5 power-up pick ups in arcade mode within the day.',
    targetCount: 5,
    rewardCoins: 350,
    type: 'powerups',
  }
];

export const WEEKLY_CHALLENGES: WeeklyChallenge[] = [
  {
    id: 'weekly_coins',
    title: 'Subway Tycoon',
    description: 'Collect 1,000 total gold coins across all runs this week.',
    targetCount: 1000,
    rewardCoins: 1200,
    type: 'coins',
  },
  {
    id: 'weekly_score',
    title: 'Endless Cumulative Mastery',
    description: 'Reach a combined grand score of 50,000 points this week.',
    targetCount: 50000,
    rewardCoins: 1800,
    type: 'score_cumulative',
  },
  {
    id: 'weekly_runs',
    title: 'Dedicated Subway Rider',
    description: 'Complete 8 active surf runs to master the metro tracks.',
    targetCount: 8,
    rewardCoins: 1000,
    type: 'runs_played',
  }
];

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach_run_1000',
    title: 'Subway Sprint',
    description: 'Achieve a score of 1,000 points in a single run (equal to 1,000m running distance).',
    category: 'score',
    targetCount: 1000,
    rewardCoins: 200,
  },
  {
    id: 'ach_run_5000',
    title: 'Subway Marathon',
    description: 'Achieve a score of 5,000 points in a single run.',
    category: 'score',
    targetCount: 5000,
    rewardCoins: 500,
  },
  {
    id: 'ach_run_10000',
    title: 'Urban Legend',
    description: 'Achieve an elite score of 10,000 points in a single run.',
    category: 'score',
    targetCount: 10000,
    rewardCoins: 1000,
  },
  {
    id: 'ach_coins_500',
    title: 'Golden Pocket',
    description: 'Amass 500 gold coins collected cumulative across all of your plays.',
    category: 'coins',
    targetCount: 500,
    rewardCoins: 300,
  },
  {
    id: 'ach_coins_2000',
    title: 'Subway Treasure',
    description: 'Amass 2,000 total gold coins collected cumulative across all of your plays.',
    category: 'coins',
    targetCount: 2000,
    rewardCoins: 800,
  },
  {
    id: 'ach_powerups_15',
    title: 'Magnetized & Shielded',
    description: 'Collect 15 power-up boosts (Magnets, Multipliers, Shields, Rockets).',
    category: 'powerups',
    targetCount: 15,
    rewardCoins: 400,
  },
  {
    id: 'ach_runs_10',
    title: 'Subway Veteran',
    description: 'Complete 10 active surf runs to cement your street-crest.',
    category: 'runs',
    targetCount: 10,
    rewardCoins: 250,
  }
];

export const GAME_CONFIG = {
  LANE_WIDTH: 4,
  TRACK_LENGTH: 400,
  START_SPEED: 40,
  MAX_SPEED: 80,
  SPEED_INCREMENT: 0.5,
  GRAVITY: -70,
  JUMP_FORCE: 25,
  TRACK_CURVATURE_Y: -0.001, // Produces classic Subway Surf curved path illusion!
  TRACK_CURVATURE_X: 0.0002, // Subtle winding curves
  POWERUP_DURATION: 10000, // 10s power-up duration
  SUBWAY_TRAIN_COOLDOWN: 2000, // Spawn train spacing
  COIN_REFILL_DISTANCE: 200,
};
