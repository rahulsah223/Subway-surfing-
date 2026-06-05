import React, { useEffect, useState } from 'react';
import {
  Trophy,
  Award,
  Search,
  X,
  Loader2,
  Sparkles,
  UserPlus,
  UserMinus,
  Share2,
  Users,
  Copy,
  Check,
  Send,
  Twitter,
  Facebook
} from 'lucide-react';
import { LeaderboardEntry, UserProfile } from '../types';
import { subscribeLeaderboard } from '../firebase';
import { motion, AnimatePresence } from 'motion/react';
import { SKINS } from '../constants';

interface LeaderboardModalProps {
  key?: React.Key;
  userProfile: UserProfile | null;
  onClose: () => void;
  onUpdateProfile?: (updates: Partial<UserProfile>) => Promise<void>;
}

export default function LeaderboardModal({ userProfile, onClose, onUpdateProfile }: LeaderboardModalProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'worldwide' | 'friends'>('worldwide');
  const [searchQuery, setSearchQuery] = useState('');
  const [friendInput, setFriendInput] = useState('');
  const [copiedId, setCopiedId] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEntry, setShareEntry] = useState<LeaderboardEntry | null>(null);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    // Register real-time subscription
    const unsubscribe = subscribeLeaderboard((data) => {
      setEntries(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getSkinName = (skinId: string) => {
    const skin = SKINS.find(s => s.id === skinId);
    return skin ? skin.name : 'Subway Surfer';
  };

  const getSkinColor = (skinId: string) => {
    const skin = SKINS.find(s => s.id === skinId);
    return skin ? skin.color : '#ef4444';
  };

  const currentFriends = userProfile?.friends || [];

  const handleToggleFriend = async (targetUserId: string, targetUsername: string) => {
    if (!onUpdateProfile || !userProfile) return;
    const isAlreadyFriend = currentFriends.includes(targetUserId);
    let updatedFriends: string[];

    if (isAlreadyFriend) {
      updatedFriends = currentFriends.filter(id => id !== targetUserId);
      showToast(`Removed ${targetUsername} from friends!`);
    } else {
      updatedFriends = [...currentFriends, targetUserId];
      showToast(`Added ${targetUsername} to friends!`);
    }

    try {
      await onUpdateProfile({ friends: updatedFriends });
    } catch (err) {
      console.error("Failed to update friends list:", err);
      showToast("Could not update friends. Try logging in!");
    }
  };

  const handleAddFriendManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!friendInput.trim() || !onUpdateProfile || !userProfile) return;

    const inputId = friendInput.trim();
    if (inputId === userProfile.userId) {
      showToast("You cannot add yourself as a friend!");
      return;
    }

    if (currentFriends.includes(inputId)) {
      showToast("This user is already in your friends list!");
      return;
    }

    // Attempt to match username in loaded entries if user wrote a username instead of exact ID
    const foundByUsername = entries.find(
      entry => entry.username.toLowerCase() === inputId.toLowerCase()
    );

    const targetUserId = foundByUsername ? foundByUsername.userId : inputId;
    const resolvedName = foundByUsername ? foundByUsername.username : inputId;

    try {
      const updatedFriends = [...currentFriends, targetUserId];
      await onUpdateProfile({ friends: updatedFriends });
      showToast(`Added ${resolvedName} to friends list!`);
      setFriendInput('');
    } catch (err) {
      console.error("Manual friend addition failed:", err);
      showToast("Failed to add friend.");
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage((prev) => (prev === msg ? '' : prev)), 3000);
  };

  const copyUserId = () => {
    if (!userProfile) return;
    navigator.clipboard.writeText(userProfile.userId);
    setCopiedId(true);
    showToast("Copied your Surfer ID to clipboard!");
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleOpenShare = (entry: LeaderboardEntry) => {
    setShareEntry(entry);
    setShowShareModal(true);
  };

  const getShareText = (entry: LeaderboardEntry) => {
    const isMe = userProfile && entry.userId === userProfile.userId;
    const subject = isMe ? "I'm" : `${entry.username} is`;
    return `🛹 Just rode the NYC Subway rails in Subway Surf 3D! ${subject} ranked with a high score of ${entry.score.toLocaleString()} points utilizing the ${getSkinName(entry.activeSkin)} skin! Can you beat this speed? 🚨`;
  };

  const handleShareTwitter = (entry: LeaderboardEntry) => {
    const text = getShareText(entry);
    const url = window.location.href;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    showToast("Opening Twitter / X share card!");
  };

  const handleShareWhatsapp = (entry: LeaderboardEntry) => {
    const text = getShareText(entry);
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + window.location.href)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    showToast("Opening WhatsApp share card!");
  };

  const handleShareFacebook = (entry: LeaderboardEntry) => {
    const url = window.location.href;
    const shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    showToast("Opening Facebook share card!");
  };

  const handleCopyShareLink = (entry: LeaderboardEntry) => {
    const text = `${getShareText(entry)} Run URL: ${window.location.href}`;
    navigator.clipboard.writeText(text);
    showToast("Copied customized share message to clipboard!");
  };

  // Filter entries based on worldwide vs friends list
  const filteredRankList = entries.filter((entry) => {
    // Worldwide vs friends tab
    if (activeTab === 'friends') {
      const isMe = userProfile && entry.userId === userProfile.userId;
      const isFriend = currentFriends.includes(entry.userId);
      if (!isMe && !isFriend) return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const nameMatch = entry.username.toLowerCase().includes(q);
      const skinMatch = getSkinName(entry.activeSkin).toLowerCase().includes(q);
      return nameMatch || skinMatch;
    }

    return true;
  });

  return (
    <div id="leader_modal_overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <motion.div
        id="leader_modal_container"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div id="leader_modal_header" className="p-6 border-b border-slate-800 bg-slate-950 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <Trophy className="w-8 h-8 text-yellow-400" />
              <div>
                <h2 className="text-2xl font-bold font-sans tracking-tight text-white">Subway Surf Arena</h2>
                <p className="text-slate-400 text-sm">Real-time competitive high scores</p>
              </div>
            </div>
            <button
              id="close_leader_btn"
              onClick={onClose}
              className="p-1.5 px-3 rounded-full bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Selection */}
          <div className="flex items-center justify-between gap-2 bg-slate-900 p-1 rounded-xl border border-slate-850">
            <button
              onClick={() => setActiveTab('worldwide')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm tracking-wide uppercase transition-all ${
                activeTab === 'worldwide'
                  ? 'bg-yellow-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Trophy className="w-4 h-4" />
              Worldwide
            </button>
            <button
              onClick={() => setActiveTab('friends')}
              className={`flex-1 py-2 px-4 rounded-lg flex items-center justify-center gap-2 font-bold text-sm tracking-wide uppercase transition-all ${
                activeTab === 'friends'
                  ? 'bg-yellow-500 text-slate-950 shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              <Users className="w-4 h-4" />
              Surfer Friends ({currentFriends.length})
            </button>
          </div>
        </div>

        {/* Dashboard Profile Card & Actions */}
        {userProfile && (
          <div className="bg-slate-950/60 p-4 border-b border-slate-800 flex flex-wrap gap-4 items-center justify-between text-xs font-mono text-slate-400">
            <div className="flex items-center gap-2">
              <span className="text-yellow-500 font-bold">Your Score:</span>
              <span className="text-white font-bold text-sm">{userProfile.highScore.toLocaleString()}</span>
              {entries.findIndex(e => e.userId === userProfile.userId) !== -1 ? (
                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Rank #{entries.findIndex(e => e.userId === userProfile.userId) + 1}
                </span>
              ) : (
                <span className="text-slate-600">(Unranked - Surf first!)</span>
              )}
            </div>

            <button
              onClick={() => {
                const entry = entries.find(e => e.userId === userProfile.userId) || {
                  userId: userProfile.userId,
                  username: userProfile.username,
                  score: userProfile.highScore,
                  activeSkin: userProfile.currentSkin,
                  timestamp: new Date().toISOString()
                };
                handleOpenShare(entry);
              }}
              className="flex items-center gap-1.5 py-1 px-3 bg-slate-800 hover:bg-slate-750 text-yellow-400 rounded-lg hover:text-yellow-300 font-sans font-bold uppercase transition-all cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Score
            </button>

            <div className="flex items-center gap-2 shrink-0 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-850 text-[11px] w-full sm:w-auto justify-between sm:justify-start">
              <span>My Surfer ID: <code className="text-yellow-400 font-mono select-all font-semibold">{userProfile.userId.slice(0, 10)}...</code></span>
              <button
                onClick={copyUserId}
                className="p-1 hover:bg-slate-800 rounded text-slate-300 hover:text-white transition-colors"
                title="Copy full Surfer ID"
              >
                {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Friend Manual Inviter */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-col gap-3">
          <form onSubmit={handleAddFriendManual} className="flex gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                value={friendInput}
                onChange={(e) => setFriendInput(e.target.value)}
                placeholder="Add friend by Surfer ID or user name..."
                className="w-full h-10 pl-3 pr-10 rounded-xl bg-slate-950 border border-slate-805 text-white placeholder-slate-500 text-sm focus:border-yellow-500 focus:outline-none focus:ring-1 focus:ring-yellow-500"
              />
              <button
                type="submit"
                className="absolute right-2 top-1.5 p-1 hover:bg-slate-800 rounded bg-transparent border-0 text-yellow-400 hover:text-yellow-300 transition-all cursor-pointer"
                title="Send surfer connection"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </form>

          {/* Local Search and Filtering Input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`Search ${activeTab === 'worldwide' ? 'world rankings' : 'your friends'} by surfer name...`}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-950 text-white placeholder-slate-500 rounded-xl border border-slate-850 outline-none focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 transition-all"
            />
          </div>
        </div>

        {/* Entries list container */}
        <div id="leader_entries_scroller" className="flex-1 overflow-y-auto p-6 bg-slate-950/40 space-y-3 min-h-[250px]">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
              <p className="text-slate-400 text-sm">Collating server score records...</p>
            </div>
          ) : filteredRankList.length === 0 ? (
            <div className="text-center py-16 text-slate-500 flex flex-col items-center justify-center">
              <Award className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-base font-semibold text-slate-300">No matching surfers found</p>
              {activeTab === 'friends' ? (
                <p className="text-xs mt-1 text-slate-500 max-w-sm">
                  Add friends from the <button onClick={() => setActiveTab('worldwide')} className="text-yellow-400 hover:underline">Worldwide</button> tab, or type in a Surfer ID or user name above!
                </p>
              ) : (
                <p className="text-xs mt-1 text-slate-500">Surf more runs to trigger higher database scores!</p>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredRankList.map((entry, index) => {
                const isCurrentUser = userProfile && entry.userId === userProfile.userId;
                const isFriend = currentFriends.includes(entry.userId);
                
                // Keep actual system-wide position for displaying worldwide rank
                const absoluteRank = entries.findIndex(e => e.userId === entry.userId) + 1;
                const isTop3 = absoluteRank <= 3;
                
                // Rank badges
                let rankStyle = "bg-slate-800 text-slate-300";
                let rankIcon = null;
                if (absoluteRank === 1) {
                  rankStyle = "bg-gradient-to-r from-yellow-400 to-amber-500 text-slate-950 font-black";
                  rankIcon = <Sparkles className="w-3.5 h-3.5 text-yellow-900 animate-pulse" />;
                } else if (absoluteRank === 2) {
                  rankStyle = "bg-slate-300 text-slate-950 font-black";
                } else if (absoluteRank === 3) {
                  rankStyle = "bg-amber-600 text-white font-black";
                }

                return (
                  <div
                    key={`${entry.userId}-${index}`}
                    className={`rounded-2xl border p-4 flex flex-col sm:flex-row gap-3 sm:items-center justify-between transition-all ${
                      isCurrentUser
                        ? 'border-yellow-500 bg-yellow-500/10 shadow-lg shadow-yellow-500/5'
                        : 'border-slate-850 bg-slate-900/50 hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      {/* Rank badge */}
                      <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-mono shrink-0 ${rankStyle}`}>
                        {rankIcon || absoluteRank}
                      </span>
                      
                      {/* Character bullet */}
                      <div
                        className="w-3.5 h-3.5 rounded-full border border-slate-700 shrink-0"
                        style={{ backgroundColor: getSkinColor(entry.activeSkin) }}
                        title={getSkinName(entry.activeSkin)}
                      />

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-base tracking-tight">
                            {entry.username}
                          </span>
                          {isCurrentUser ? (
                            <span className="bg-yellow-500/20 text-yellow-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-yellow-500/20">
                              YOU
                            </span>
                          ) : isFriend ? (
                            <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-emerald-500/20">
                              FRIEND
                            </span>
                          ) : null}
                        </div>
                        <span className="text-xs text-slate-500">
                          Equipped: {getSkinName(entry.activeSkin)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end">
                      {/* Interaction buttons (only for non-current-users) */}
                      {!isCurrentUser && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleToggleFriend(entry.userId, entry.username)}
                            className={`p-1.5 px-3 rounded-lg flex items-center gap-1 text-xs font-bold transition-all uppercase cursor-pointer ${
                              isFriend
                                ? 'bg-slate-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/20 hover:text-rose-400 border border-transparent'
                                : 'bg-slate-800 hover:bg-yellow-500 hover:text-slate-950 text-slate-300'
                            }`}
                            title={isFriend ? "Unfriend this surfer" : "Add to friends list"}
                          >
                            {isFriend ? (
                              <>
                                <UserMinus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Remove</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Add Friend</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Display share icon for each scorer */}
                      <button
                        onClick={() => handleOpenShare(entry)}
                        className="p-2 bg-slate-800 hover:bg-slate-750 text-slate-400 hover:text-yellow-400 rounded-lg transition-colors cursor-pointer"
                        title="Share this high score card"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xl font-black text-yellow-400 tracking-tight">
                          {entry.score.toLocaleString()}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5 font-mono">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleDateString() : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Global Toast Notifier */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-yellow-500 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-full shadow-lg z-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>{toastMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Share Score Overlay Modal */}
        <AnimatePresence>
          {showShareModal && shareEntry && (
            <div className="absolute inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative space-y-5"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                      <Share2 className="w-5 h-5 text-yellow-400" />
                      Share high score
                    </h3>
                    <p className="text-xs text-slate-400">Brag about high records on social networks</p>
                  </div>
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="p-1 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score Tag Card Preview */}
                <div className="bg-slate-950 rounded-2.5xl p-5 border border-slate-850 space-y-3 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-5">
                    <Trophy className="w-32 h-32 text-yellow-500" />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getSkinColor(shareEntry.activeSkin) }} />
                    <span className="text-sm font-bold text-slate-300">{shareEntry.username}</span>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-widest font-bold text-slate-500">Surf Score Record</p>
                    <p className="font-mono text-3xl font-black text-yellow-400 tracking-tight">
                      {shareEntry.score.toLocaleString()}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400 italic">
                    "Equipped: {getSkinName(shareEntry.activeSkin)}"
                  </p>
                </div>

                {/* Sharing Options Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleShareTwitter(shareEntry)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 rounded-2xl border border-slate-850 font-bold text-xs gap-2 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Twitter className="w-6 h-6 text-sky-400" />
                    Twitter / X
                  </button>
                  <button
                    onClick={() => handleShareWhatsapp(shareEntry)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 rounded-2xl border border-slate-850 font-bold text-xs gap-2 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Send className="w-6 h-6 text-emerald-400" />
                    WhatsApp
                  </button>
                  <button
                    onClick={() => handleShareFacebook(shareEntry)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 rounded-2xl border border-slate-850 font-bold text-xs gap-2 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Facebook className="w-6 h-6 text-blue-500" />
                    Facebook
                  </button>
                  <button
                    onClick={() => handleCopyShareLink(shareEntry)}
                    className="flex flex-col items-center justify-center p-4 bg-slate-950 hover:bg-slate-850 rounded-2xl border border-slate-850 font-bold text-xs gap-2 text-slate-300 hover:text-white transition-all cursor-pointer"
                  >
                    <Copy className="w-6 h-6 text-yellow-500" />
                    Copy Message
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <button
                    onClick={() => setShowShareModal(false)}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Go Back
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <div id="leader_modal_footer" className="p-4 border-t border-slate-800 bg-slate-950 text-center text-slate-500 text-xs font-mono">
          Only your absolute highest score is saved to the leaderboard arena. Connect with other surfers using their unique Surfer IDs!
        </div>
      </motion.div>
    </div>
  );
}
