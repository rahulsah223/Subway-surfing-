import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser, getOrCreateUserProfile, saveUserProfile, saveLeaderboardScore } from './firebase';
import { UserProfile } from './types';
import { DAILY_CHALLENGES } from './constants';
import MainMenu from './components/MainMenu';
import GameCanvas from './components/GameCanvas';
import GameOver from './components/GameOver';
import ShopModal from './components/ShopModal';
import LeaderboardModal from './components/LeaderboardModal';
import DailyChallengesModal from './components/DailyChallengesModal';
import AchievementsModal from './components/AchievementsModal';
import { Loader2, Coins } from 'lucide-react';
import { AnimatePresence } from 'motion/react';

const GUEST_STORAGE_KEY = 'subway_surf_guest_profile';

const getWeekString = () => {
  const d = new Date();
  const oneJan = new Date(d.getFullYear(), 0, 1);
  const numberOfDays = Math.floor((d.getTime() - oneJan.getTime()) / (24 * 60 * 60 * 1000));
  const weekNumber = Math.ceil((numberOfDays + oneJan.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${weekNumber}`;
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Gameplay view states
  const [activeView, setActiveView] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [runScore, setRunScore] = useState(0);
  const [runCoins, setRunCoins] = useState(0);
  const [isNewRecord, setIsNewRecord] = useState(false);

  // Overlay state trackers
  const [showShop, setShowShop] = useState(false);
  const [shopTab, setShopTab] = useState<'skins' | 'headwear' | 'board_patterns' | 'environments'>('skins');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showChallenges, setShowChallenges] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);

  // 1. Setup Auth and profile synchronization
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setCurrentUser(user);
        try {
          const profile = await getOrCreateUserProfile(user);
          setUserProfile(profile);
          
          // If we had guest coins/high scores stored locally, optionally migrate them!
          const guestStr = localStorage.getItem(GUEST_STORAGE_KEY);
          if (guestStr) {
            try {
              const guestProfile = JSON.parse(guestStr) as UserProfile;
              const mergedHighScore = Math.max(profile.highScore, guestProfile.highScore);
              const mergedCoins = profile.coins + guestProfile.coins;
              
              const updatedProfile = {
                ...profile,
                highScore: mergedHighScore,
                coins: mergedCoins,
                unlockedSkins: Array.from(new Set([...profile.unlockedSkins, ...guestProfile.unlockedSkins])),
                unlockedEnvironments: Array.from(new Set([...profile.unlockedEnvironments, ...guestProfile.unlockedEnvironments]))
              };
              
              await saveUserProfile(user.uid, updatedProfile);
              setUserProfile(updatedProfile);
              
              if (mergedHighScore > profile.highScore) {
                await saveLeaderboardScore(user.uid, profile.username, mergedHighScore, profile.currentSkin);
              }
              
              localStorage.removeItem(GUEST_STORAGE_KEY); // wipe migration source
            } catch (mergeErr) {
              console.error("Local stats migration failed, loading cloud profile:", mergeErr);
            }
          }
        } catch (err) {
          console.error("Error setting up user profile from database:", err);
        }
      } else {
        // Load guest representation
        setCurrentUser(null);
        const guestStr = localStorage.getItem(GUEST_STORAGE_KEY);
        if (guestStr) {
          setUserProfile(JSON.parse(guestStr));
        } else {
          const defaultGuest: UserProfile = {
            userId: 'guest_user_root',
            username: 'Offline Jake',
            highScore: 0,
            coins: 1000, // 1000 initial coins to sandbox customize skins!
            currentSkin: 'urchin',
            currentEnvironment: 'downtown',
            currentHeadwear: 'none',
            currentBoardPattern: 'solid',
            friends: [],
            dailyChallengeProgress: 0,
            dailyChallengeDate: new Date().toISOString().split('T')[0],
            weeklyChallengeProgress: 0,
            weeklyChallengeDate: getWeekString(),
            unlockedSkins: ['urchin'],
            unlockedEnvironments: ['downtown'],
            unlockedHeadwear: ['none'],
            unlockedBoardPatterns: ['solid'],
            claimedDailyIds: [],
            claimedWeeklyIds: [],
            dailyPowerupsCount: 0,
            weeklyScoreCumulative: 0,
            weeklyRunsPlayed: 0,
            claimedAchievementIds: [],
            claimedLevelRewards: [],
            totalCoinsCollected: 0,
            totalPowerupsCollected: 0,
            totalRunsPlayed: 0,
            soundEnabled: true,
            soundVolume: 80,
            activeVisionId: 'gold_kingpin',
            unlockedVisionIds: ['gold_kingpin', 'imperial_boarder', 'sovereign_tycoon'],
            claimedVisionIds: [],
            activeVisionQuoteIndex: 0,
            updatedAt: new Date().toISOString()
          };
          localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(defaultGuest));
          setUserProfile(defaultGuest);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Update profile config (Handles local and Cloud synchronization)
  const handleUpdateProfile = async (updates: Partial<UserProfile>): Promise<void> => {
    if (!userProfile) return;
    const mergedProfile = { ...userProfile, ...updates, updatedAt: new Date().toISOString() };
    
    // Optimistic component state modifications
    setUserProfile(mergedProfile);

    if (currentUser) {
      await saveUserProfile(currentUser.uid, updates);
    } else {
      localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(mergedProfile));
    }
  };

  // Google authentication triggered from start page
  const handleGoogleLogin = async () => {
    try {
      await loginWithGoogle();
    } catch (e) {
      console.error("Authentications login popup cancelled or rejected:", e);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      setUserProfile(null);
    } catch (e) {
      console.error("Signout failed:", e);
    }
  };

  // Launch Endless Surfer gameplay view
  const handleStartGame = () => {
    setRunScore(0);
    setRunCoins(0);
    setIsNewRecord(false);
    
    // Evaluate if Date/Week for Challenges is today/this week, else reset progress tickers!
    if (userProfile) {
      const today = new Date().toISOString().split('T')[0];
      const thisWeek = getWeekString();
      const updates: Partial<UserProfile> = {};

      if (userProfile.dailyChallengeDate !== today) {
        updates.dailyChallengeProgress = 0;
        updates.dailyPowerupsCount = 0;
        updates.claimedDailyIds = [];
        updates.dailyChallengeDate = today;
      }
      if (userProfile.weeklyChallengeDate !== thisWeek) {
        updates.weeklyChallengeProgress = 0;
        updates.weeklyScoreCumulative = 0;
        updates.weeklyRunsPlayed = 0;
        updates.claimedWeeklyIds = [];
        updates.weeklyChallengeDate = thisWeek;
      }

      if (Object.keys(updates).length > 0) {
        handleUpdateProfile(updates);
      }
    }
    
    setActiveView('playing');
  };

  // Game over processor
  const handleGameOver = async (finalScore: number, finalCoinsGathered: number, finalPowerUps: number = 0) => {
    setRunScore(finalScore);
    setRunCoins(finalCoinsGathered);
    setActiveView('gameover');

    if (!userProfile) return;

    const isScoreRecord = finalScore > userProfile.highScore;
    setIsNewRecord(isScoreRecord);

    const today = new Date().toISOString().split('T')[0];
    const thisWeek = getWeekString();

    const isDailyStale = userProfile.dailyChallengeDate !== today;
    const isWeeklyStale = userProfile.weeklyChallengeDate !== thisWeek;

    // Resets or continuations
    const baseDailyCoins = isDailyStale ? 0 : userProfile.dailyChallengeProgress;
    const baseDailyPowerups = isDailyStale ? 0 : (userProfile.dailyPowerupsCount || 0);
    const baseDailyClaims = isDailyStale ? [] : (userProfile.claimedDailyIds || []);

    const baseWeeklyCoins = isWeeklyStale ? 0 : (userProfile.weeklyChallengeProgress || 0);
    const baseWeeklyScore = isWeeklyStale ? 0 : (userProfile.weeklyScoreCumulative || 0);
    const baseWeeklyRunsPlayed = isWeeklyStale ? 0 : (userProfile.weeklyRunsPlayed || 0);
    const baseWeeklyClaims = isWeeklyStale ? [] : (userProfile.claimedWeeklyIds || []);

    // Increments
    const newDailyCoins = baseDailyCoins + finalCoinsGathered;
    const newDailyPowerups = baseDailyPowerups + finalPowerUps;

    const newWeeklyCoins = baseWeeklyCoins + finalCoinsGathered;
    const newWeeklyScore = baseWeeklyScore + finalScore;
    const newWeeklyRunsPlayed = baseWeeklyRunsPlayed + 1;

    const nextCoinsVal = userProfile.coins + finalCoinsGathered;
    const nextHighScoreVal = isScoreRecord ? finalScore : userProfile.highScore;

    // Lifetime accumulators for achievements
    const newTotalCoinsCollected = (userProfile.totalCoinsCollected || 0) + finalCoinsGathered;
    const newTotalPowerupsCollected = (userProfile.totalPowerupsCollected || 0) + finalPowerUps;
    const newTotalRunsPlayed = (userProfile.totalRunsPlayed || 0) + 1;

    const profileUpdates: Partial<UserProfile> = {
      coins: nextCoinsVal,
      highScore: nextHighScoreVal,
      
      dailyChallengeProgress: newDailyCoins,
      dailyPowerupsCount: newDailyPowerups,
      claimedDailyIds: baseDailyClaims,
      dailyChallengeDate: today,

      weeklyChallengeProgress: newWeeklyCoins,
      weeklyScoreCumulative: newWeeklyScore,
      weeklyRunsPlayed: newWeeklyRunsPlayed,
      claimedWeeklyIds: baseWeeklyClaims,
      weeklyChallengeDate: thisWeek,

      totalCoinsCollected: newTotalCoinsCollected,
      totalPowerupsCollected: newTotalPowerupsCollected,
      totalRunsPlayed: newTotalRunsPlayed,
    };

    // Save user state changes
    await handleUpdateProfile(profileUpdates);

    // Save scores to Global Database Leaderboard
    if (currentUser && isScoreRecord) {
      await saveLeaderboardScore(
        currentUser.uid,
        userProfile.username,
        finalScore,
        userProfile.currentSkin
      );
    }
  };

  const handleBackToMenu = () => {
    setActiveView('menu');
  };

  if (loading) {
    return (
      <div id="app_loading_screen" className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center gap-4 text-center">
        <Loader2 className="w-12 h-12 text-amber-500 animate-spin" />
        <div>
          <h3 className="text-white font-sans text-xl font-black">Subway Surf App</h3>
          <p className="text-slate-500 text-sm mt-1">Downloading textures & materials...</p>
        </div>
      </div>
    );
  }

  return (
    <div id="full_app_canvas_wrapper" className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-hidden relative">
      {/* Conditionally hide the standard layout elements (like headers and footers) when playing or in the immersive main menu */}
      {(activeView !== 'playing' && activeView !== 'menu') && (
        <header className="max-w-4xl w-full mx-auto px-4 flex justify-between items-center bg-slate-900/40 border border-slate-900 p-4 rounded-2xl mt-6">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-red-500 animate-ping" />
            <span className="font-semibold text-xs tracking-wider font-mono text-slate-400">SURF LEAGUE ACTIVE</span>
          </div>

          {userProfile && (
            <div className="flex items-center gap-1.5 text-amber-400 font-bold bg-amber-500/10 border border-amber-500/10 rounded-full px-3.5 py-1 text-xs">
              <Coins className="w-3.5 h-3.5 fill-amber-500/10" />
              <span>{userProfile.coins.toLocaleString()}</span>
            </div>
          )}
        </header>
      )}

      {/* Primary Visual routers */}
      <main className="flex-1 flex flex-col justify-center relative w-full h-full">
        {/* Render the core 3D Game Canvas in the background for Home, Playing, and Gameover views */}
        {userProfile && (activeView === 'playing' || activeView === 'menu' || activeView === 'gameover') && (
          <div className="fixed inset-0 z-0 w-screen h-screen">
            <GameCanvas
              userProfile={userProfile}
              mode={activeView}
              onCoinCollected={() => {}}
              onScoreUpdated={() => {}}
              onGameOver={handleGameOver}
            />
          </div>
        )}

        {/* Home Screen Dashboard overlaid cleanly on top of the live 3D character */}
        {activeView === 'menu' && (
          <div className="absolute inset-0 z-10 w-full h-full overflow-hidden pointer-events-auto">
            <MainMenu
              userProfile={userProfile}
              onPlay={handleStartGame}
              onOpenShop={(tab) => {
                setShopTab(tab || 'skins');
                setShowShop(true);
              }}
              onOpenLeaderboard={() => setShowLeaderboard(true)}
              onOpenChallenges={() => setShowChallenges(true)}
              onOpenAchievements={() => setShowAchievements(true)}
              onLogin={handleGoogleLogin}
              onLogout={handleLogout}
              onUpdateProfile={handleUpdateProfile}
            />
          </div>
        )}

        {activeView === 'gameover' && (
          <div className="z-10 relative w-full max-w-lg mx-auto p-4">
            <GameOver
              score={runScore}
              coinsCollected={runCoins}
              isNewHighScore={isNewRecord}
              onRetry={handleStartGame}
              onBackToMenu={handleBackToMenu}
              language={userProfile?.language}
            />
          </div>
        )}
      </main>

      {/* Floating Modals System */}
      <AnimatePresence>
        {showShop && userProfile && (
          <ShopModal
            key="shop-modal"
            userProfile={userProfile}
            initialTab={shopTab}
            onClose={() => setShowShop(false)}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {showLeaderboard && (
          <LeaderboardModal
            key="leaderboard-modal"
            userProfile={userProfile}
            onClose={() => setShowLeaderboard(false)}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {showChallenges && userProfile && (
          <DailyChallengesModal
            key="challenges-modal"
            userProfile={userProfile}
            onClose={() => setShowChallenges(false)}
            onUpdateProfile={handleUpdateProfile}
          />
        )}

        {showAchievements && userProfile && (
          <AchievementsModal
            key="achievements-modal"
            userProfile={userProfile}
            onClose={() => setShowAchievements(false)}
            onUpdateProfile={handleUpdateProfile}
          />
        )}
      </AnimatePresence>

      {/* Footer credits bar - only when not playing and not in the immersive menu */}
      {(activeView !== 'playing' && activeView !== 'menu') && (
        <footer className="text-center text-[10px] text-slate-600 font-medium select-none mt-8 max-w-4xl w-full mx-auto px-4 pb-6">
          Subway Surf 3D endless runner dashboard. All rights reserved. Created for mobile, tablet, and web experiences.
        </footer>
      )}
    </div>
  );
}
