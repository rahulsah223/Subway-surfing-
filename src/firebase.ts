import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  getDocFromServer
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { UserProfile, LeaderboardEntry } from './types';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth();
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Check database connection at start
async function testConnection() {
  if (firebaseConfig.projectId === 'remixed-project-id') {
    // Skip testing connection for placeholder remixed project to prevent false positive errors in preview
    return;
  }
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration: Client appears to be offline.");
    }
  }
}
testConnection();

// Google login
export async function loginWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    throw error;
  }
}

// Log out
export async function logoutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign-Out Error:", error);
    throw error;
  }
}

// Create or fetch user profile
export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const userRef = doc(db, 'users', user.uid);
  const path = `users/${user.uid}`;
  try {
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const data = userDoc.data();
      return {
        userId: data.userId || user.uid,
        username: data.username || user.displayName || 'Subway Surfer',
        highScore: data.highScore || 0,
        coins: data.coins || 0,
        currentSkin: data.currentSkin || 'urchin',
        currentEnvironment: data.currentEnvironment || 'downtown',
        currentHeadwear: data.currentHeadwear || 'none',
        currentBoardPattern: data.currentBoardPattern || 'solid',
        dailyChallengeProgress: data.dailyChallengeProgress || 0,
        dailyChallengeDate: data.dailyChallengeDate || new Date().toISOString().split('T')[0],
        weeklyChallengeProgress: data.weeklyChallengeProgress || 0,
        weeklyChallengeDate: data.weeklyChallengeDate || '',
        unlockedSkins: data.unlockedSkins || ['urchin'],
        unlockedEnvironments: data.unlockedEnvironments || ['downtown'],
        unlockedHeadwear: data.unlockedHeadwear || ['none'],
        unlockedBoardPatterns: data.unlockedBoardPatterns || ['solid'],
        friends: data.friends || [],
        claimedDailyIds: data.claimedDailyIds || [],
        claimedWeeklyIds: data.claimedWeeklyIds || [],
        dailyPowerupsCount: data.dailyPowerupsCount || 0,
        weeklyScoreCumulative: data.weeklyScoreCumulative || 0,
        weeklyRunsPlayed: data.weeklyRunsPlayed || 0,
        claimedAchievementIds: data.claimedAchievementIds || [],
        claimedLevelRewards: data.claimedLevelRewards || [],
        totalCoinsCollected: data.totalCoinsCollected || 0,
        totalPowerupsCollected: data.totalPowerupsCollected || 0,
        totalRunsPlayed: data.totalRunsPlayed || 0,
        soundEnabled: data.soundEnabled !== undefined ? data.soundEnabled : true,
        soundVolume: data.soundVolume !== undefined ? data.soundVolume : 80,
        updatedAt: data.updatedAt || new Date().toISOString()
      };
    } else {
      // Create new profile
      const newProfile: UserProfile = {
        userId: user.uid,
        username: user.displayName || 'Subway Surfer',
        highScore: 0,
        coins: 1000, // 1000 free starting coins to test customization!
        currentSkin: 'urchin',
        currentEnvironment: 'downtown',
        currentHeadwear: 'none',
        currentBoardPattern: 'solid',
        dailyChallengeProgress: 0,
        dailyChallengeDate: new Date().toISOString().split('T')[0],
        weeklyChallengeProgress: 0,
        weeklyChallengeDate: '',
        unlockedSkins: ['urchin'],
        unlockedEnvironments: ['downtown'],
        unlockedHeadwear: ['none'],
        unlockedBoardPatterns: ['solid'],
        friends: [],
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
        updatedAt: new Date().toISOString()
      };
      
      await setDoc(userRef, {
        ...newProfile,
        updatedAt: new Date().toISOString() // Write standard timestamp
      });
      return newProfile;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
    throw error;
  }
}

// Update user profile in Firestore
export async function saveUserProfile(userId: string, profile: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', userId);
  const path = `users/${userId}`;
  
  // Format dates for saving in Firestore
  const updateData = {
    ...profile,
    updatedAt: new Date().toISOString()
  };
  
  try {
    await updateDoc(userRef, updateData);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

// Add or update Leaderboard entry
export async function saveLeaderboardScore(userId: string, username: string, score: number, activeSkin: string): Promise<void> {
  const leaderRef = doc(db, 'leaderboard', userId);
  const path = `leaderboard/${userId}`;
  try {
    const currentEntry = await getDoc(leaderRef);
    if (!currentEntry.exists() || currentEntry.data().score < score) {
      const entry: LeaderboardEntry = {
        userId,
        username,
        score,
        activeSkin,
        timestamp: new Date().toISOString()
      };
      await setDoc(leaderRef, entry);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Real-time Leaderboard subscriber
export function subscribeLeaderboard(onUpdate: (entries: LeaderboardEntry[]) => void) {
  const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(50));
  const path = 'leaderboard';
  
  return onSnapshot(q, (snapshot) => {
    const list: LeaderboardEntry[] = [];
    snapshot.forEach((docSnap) => {
      list.push(docSnap.data() as LeaderboardEntry);
    });
    onUpdate(list);
  }, (error) => {
    handleFirestoreError(error, OperationType.LIST, path);
  });
}

// Submit game feedback to Firestore
export async function submitGameFeedback(
  userId: string,
  username: string,
  rating: number,
  category: string,
  message: string
): Promise<void> {
  const collectionRef = collection(db, 'feedback');
  const docRef = doc(collectionRef);
  const path = `feedback/${docRef.id}`;
  try {
    await setDoc(docRef, {
      id: docRef.id,
      userId,
      username,
      rating,
      category,
      message,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

