'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { MobileContainer } from '@/components/layout/MobileContainer';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { OnboardingScreen } from '@/components/auth/OnboardingScreen';
import { AppGuideModal } from '@/components/layout/AppGuideModal';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { LevelSelectModal } from '@/components/auth/LevelSelectModal';
import { HomeDashboard } from '@/components/dashboard/HomeDashboard';
import { FlashcardQuiz } from '@/components/quiz/FlashcardQuiz';
import { PracticeTab } from '@/components/practice/PracticeTab';
import { PracticeSession } from '@/components/practice/PracticeSession';
import { ChainScreen } from '@/components/chain/ChainScreen';
import { ChainStart } from '@/types/chain';
import { BattleGame } from '@/components/battle/BattleGame';
import { BATTLE_INVITE_PARAM, normalizeRoomCode } from '@/lib/battle';
import { StatsDashboard } from '@/components/stats/StatsDashboard';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { SettingsModal } from '@/components/profile/SettingsModal';
import { EditProfileModal } from '@/components/profile/EditProfileModal';
import { DueReminderToast } from '@/components/layout/DueReminderToast';

import { AddWordModal } from '@/components/dashboard/AddWordModal';
import { NotificationPrompt } from '@/components/notifications/NotificationPrompt';
import { WalletModal } from '@/components/wallet/WalletModal';
import { StarterWordsModal } from '@/components/auth/StarterWordsModal';
import {
  getReviewQueue,
  fetchStarterWords,
  giveStarterWords,
  countQueue,
  nextRun,
  StarterWord,
} from '@/lib/api/review-queue-client';
import { fetchWallet, Wallet } from '@/lib/api/wallet-client';
import {
  markNotificationsAsked,
  needsHomeScreenForPush,
  shouldAskForNotifications,
} from '@/lib/notification-prompt';

import {
  ActiveTab,
  VocabularySet,
  UserProgress,
  SRSData,
  LearningProgress,
  ActivityDay,
  Word,
} from '@/types';
import { BackendDueReview, ReviewQuality } from '@/types/word';
import { CEFRLevel } from '@/types';
import { StatsSummary } from '@/types/stats';
import { PracticeSitting } from '@/types/practice';
import { calculateNextSRS } from '@/lib/srs';
import {
  mapReviewResponseToSRS,
  mapWordRatingToSRS,
  getUserWordLibrary,
  invalidateUserWordLibrary,
  resolveWordForUserWord,
  submitQueueWord,
} from '@/lib/api/word-client';
import { syncVocabularySets } from '@/lib/api/category-client';
import { fetchStatsSummary } from '@/lib/api/stats-client';
import {
  fetchSettings,
  mapSettingsToRequest,
  updateSettings,
} from '@/lib/api/settings-client';
import { ApiError } from '@/lib/api/client';
import { setAnalyticsUser, trackEvent } from '@/lib/analytics';
import { getCurrentSession, getDisplayName, logout, refreshProfile } from '@/lib/api/auth-client';
import { AuthSession } from '@/types/auth';
import {
  loadCategories,
  loadUserProgress,
  saveUserProgress,
  loadSRSData,
  saveSRSData,
  loadLearningProgress,
  saveLearningProgress,
  hasUploadedFavorites,
  markFavoritesUploaded,
  loadSettings,
  saveSettings,
  loadAllWords,
  loadCustomWords,
  saveCustomWords,
  setStorageScope,
  clearScopedData,
  savePendingBattleCode,
  takePendingBattleCode,
  AppSettings,
  DEFAULT_SETTINGS,
  DEFAULT_USER_PROGRESS,
} from '@/lib/storage';
import { createInitialSRS } from '@/lib/srs';
import { soundFX } from '@/lib/audio';
import { mascotMotion } from '@/lib/mascot-motion';
import { generateAvatar } from '@/lib/avatar';
import { deriveProgress } from '@/lib/progress';
import {
  fetchActivity,
  fetchLearningProgress,
  setFavorites,
} from '@/lib/api/progress-client';
import { patchCachedFavorite } from '@/lib/api/word-client';
import { useDueReminders } from '@/hooks/useDueReminders';
import { usePushSubscription } from '@/hooks/usePushSubscription';
import { unsubscribeFromPush } from '@/lib/push';

/**
 * How long sign-out holds the auth token open so the push endpoint can be
 * deregistered. Past this the token is cleared anyway — a stale endpoint on the
 * backend is a smaller problem than a token that outlives the sign-out.
 */
const LOGOUT_UNSUBSCRIBE_TIMEOUT_MS = 3000;

/** Which signed-out screen to show. The app itself is unreachable without a session. */
type AuthView = 'onboarding' | 'login' | 'register';

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [authView, setAuthView] = useState<AuthView>('onboarding');
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  /** The home button's flashcard run is on screen. */
  const [isQueueRun, setIsQueueRun] = useState(false);
  /** The Free Practice sitting on screen. */
  const [practiceSitting, setPracticeSitting] = useState<PracticeSitting | null>(null);
  /** The Argument Chain on screen. */
  const [chainStart, setChainStart] = useState<ChainStart | null>(null);
  const hasChainWordsRef = useRef(false);
  /** A practice answer rescheduled something the cached library still shows. */
  const hasPracticeReviewsRef = useRef(false);
  /** Battle Game is online-only and owns its own socket, so it is a screen of its own rather than a quiz mode. */
  const [isBattleOpen, setIsBattleOpen] = useState(false);
  /** The room code an invite link brought in, pre-filled into the join box. */
  const [battleInviteCode, setBattleInviteCode] = useState('');
  const [quizSessionWords, setQuizSessionWords] = useState<Word[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  /**
   * The one-time CEFR question. Opened by a successful registration only — a
   * returning sign-in must not be interrogated again, whether or not the answer
   * was ever given (it can be set any time from settings).
   */
  const [isLevelPickerOpen, setIsLevelPickerOpen] = useState(false);
  /**
   * The app tour. A new account sees it right after the CEFR question; anyone
   * can replay it from settings.
   */
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  /** `GET /reviews/queue`, or null until it answers. */
  const [reviewQueue, setReviewQueue] = useState<BackendDueReview[] | null>(null);
  const [isStartingReview, setIsStartingReview] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  /** A session just ended and it is a good moment to ask about notifications. */
  const [isAskingNotifications, setIsAskingNotifications] = useState(false);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  /** The Starter Words on offer, while the new account is picking. */
  const [starterOffer, setStarterOffer] = useState<{
    level?: CEFRLevel;
    words: StarterWord[];
  } | null>(null);
  const [isWalletOpen, setIsWalletOpen] = useState(false);

  // App Persistent State
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_USER_PROGRESS);
  const [srsMap, setSrsMap] = useState<Record<string, SRSData>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [vocabularySets, setVocabularySets] = useState<VocabularySet[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  /**
   * `GET /stats/summary` for the signed-in account, or null until it answers —
   * the home screen falls back to its locally derived counters while it is null.
   */
  const [statsSummary, setStatsSummary] = useState<StatsSummary | null>(null);
  /** XP, level, streak and accuracy as the server last reported them. */
  const [learning, setLearning] = useState<LearningProgress | null>(null);
  const [activity, setActivity] = useState<ActivityDay[] | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Answer submissions still in flight — a session is reported after them. */
  const pendingSubmitsRef = useRef<Set<Promise<unknown>>>(new Set());
  /**
   * Refreshes the cached `/vocabulary-sets` list. Only sign-in passes `force`
   * — the list barely changes, so every other entry into the app reads the
   * copy in localStorage and never touches the network.
   *
   * Failure is silent: `syncVocabularySets` returns the cached list when it
   * has one, and the pickers fall back to their shipped names when it does not.
   */
  const hydrateVocabularySets = async (force: boolean) => {
    try {
      setVocabularySets(await syncVocabularySets({ force }));
    } catch (err) {
      console.warn('Could not load vocabulary sets from API:', err);
    }
  };

  /**
   * Sets or their words changed: read the sets again, then the library, so every
   * word on this device carries the name of the set it is in now.
   */
  const handleSetsChanged = async () => {
    try {
      const sets = await syncVocabularySets({ force: true });
      setVocabularySets(sets);
      invalidateUserWordLibrary();
      const { items } = await getUserWordLibrary({
        force: true,
        fallbacks: allWords,
        vocabularySets: sets,
      });
      const categories = new Map(items.map((item) => [String(item.word.id), item.word.category]));
      setAllWords((prev) => {
        const next = prev.map((w) => {
          const category = categories.get(String(w.id));
          return category && category !== w.category ? { ...w, category } : w;
        });
        saveCustomWords(next);
        return next;
      });
    } catch (err) {
      console.warn('Could not refresh vocabulary sets:', err);
    }
  };

  /**
   * The side effects a settings value implies, applied outside React: the dark
   * class lives on `<html>` and the sound engine is a module singleton, so both
   * have to be pushed whenever settings arrive — from storage, from the backend
   * or from the user.
   */
  const applySettingsEffects = (active: AppSettings) => {
    if (active.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    soundFX.setEnabled(active.soundEnabled);
    mascotMotion.setEnabled(active.mascotAnimations);
  };

  /**
   * Adopts the account's preferences from `GET /settings`, so a device that has
   * never seen this account inherits them instead of showing the defaults.
   *
   * `local` is what storage just answered; the backend wins on every field it
   * actually sends and the local value stands for the rest. Failure is silent —
   * settings are readable locally, so there is nothing to block the session for.
   */
  const hydrateSettingsFromApi = async (local: AppSettings) => {
    try {
      const remote = await fetchSettings();
      if (Object.keys(remote).length === 0) return;

      const merged = { ...local, ...remote };
      setSettings(merged);
      saveSettings(merged);
      applySettingsEffects(merged);
    } catch (err) {
      console.warn('Could not load settings from API, using local copy:', err);
    }
  };

  /**
   * Mirrors a settings change to `PATCH /settings`, which takes the settings
   * whole — so this sends every field, not just the one that changed.
   *
   * Deliberately not awaited by its callers: the local write has already happened
   * and the UI already shows the new value, so a failed sync must not undo the
   * user's choice.
   */
  const pushSettingsToApi = async (merged: AppSettings) => {
    // No token, no account to write against — the signed-out screens also load
    // settings, and those changes are local-only until someone signs in.
    if (!getCurrentSession()) return;

    try {
      await updateSettings(mapSettingsToRequest(merged));
    } catch (err) {
      console.warn('Could not save settings to API, keeping the local copy:', err);
    }
  };

  /**
   * Re-asks `GET /stats/summary` for the home screen's counters. The account is
   * the whole request — it comes from the bearer token — so there is nothing to
   * ask without a session.
   *
   * Failure is silent and leaves the last good summary (or null) in place: these
   * numbers all have a local equivalent, so a missing answer degrades to the
   * device's own view instead of blanking the screen.
   */
  const refreshStats = useCallback(async () => {
    if (!getCurrentSession()) return;

    try {
      setStatsSummary(await fetchStatsSummary());
    } catch (err) {
      console.warn('Could not load stats summary from API:', err);
    }
  }, []);

  /**
   * Re-reads XP, level, streak and the activity series. Called after anything
   * that can move them; failure keeps the last answer on screen.
   */
  const refreshProgress = useCallback(async () => {
    const token = getCurrentSession()?.accessToken;
    if (!token) return;

    try {
      const [next, days] = await Promise.all([fetchLearningProgress(), fetchActivity()]);
      // The account may have changed while the request was in flight.
      if (getCurrentSession()?.accessToken !== token) return;
      setLearning(next);
      setActivity(days);
      saveLearningProgress(next);
    } catch (err) {
      console.warn('Could not load progress from API:', err);
    }
  }, []);

  /** Failure keeps the last count; the button still tries again when tapped. */
  const refreshQueue = useCallback(async () => {
    const token = getCurrentSession()?.accessToken;
    if (!token) return;

    try {
      await Promise.allSettled(Array.from(pendingSubmitsRef.current));
      const queue = await getReviewQueue();
      if (getCurrentSession()?.accessToken === token) setReviewQueue(queue);
    } catch (err) {
      console.warn('Could not load the review queue from API:', err);
    }
  }, []);

  const refreshWallet = useCallback(async () => {
    const token = getCurrentSession()?.accessToken;
    if (!token) return;

    try {
      const next = await fetchWallet();
      if (getCurrentSession()?.accessToken === token) setWallet(next);
    } catch (err) {
      console.warn('Could not load the wallet from API:', err);
    }
  }, []);

  /** Coalesces the burst a bulk import or a run of ratings produces. */
  const scheduleProgressRefresh = useCallback(() => {
    if (progressTimerRef.current) clearTimeout(progressTimerRef.current);
    progressTimerRef.current = setTimeout(() => void refreshProgress(), 400);
  }, [refreshProgress]);

  /** Remembers a submission until it settles, then refreshes the badges. */
  const trackSubmit = <T,>(request: Promise<T>): Promise<T> => {
    const pending = pendingSubmitsRef.current;
    pending.add(request);
    const done = () => {
      pending.delete(request);
      scheduleProgressRefresh();
    };
    request.then(done, done);
    return request;
  };

  /**
   * Loads the state belonging to `activeSession`. Storage is scoped by user id
   * first, so one account never reads another's progress, and identity fields
   * always come from the API session rather than whatever was stored earlier.
   *
   * Called with `null` on sign-out, which resets every in-memory slice back to
   * its empty default so the next account never inherits a stale screen.
   *
   * `isFreshLogin` marks the one entry point that just authenticated — the
   * moment the category list is pulled from the backend.
   */
  const loadAccountState = (
    activeSession: AuthSession | null,
    displayName?: string,
    isFreshLogin = false
  ) => {
    setStorageScope(activeSession?.userId ?? null);
    setSession(activeSession);
    // Sign-in and sign-out both land here; the previous account's summary must
    // not answer for the new one.
    setStatsSummary(null);
    setActivity(null);
    setReviewQueue(null);
    setReviewError(null);
    setWallet(null);
    setLearning(activeSession ? loadLearningProgress() : null);

    const loadedSettings = loadSettings();
    applySettingsEffects(loadedSettings);
    setSettings(loadedSettings);

    if (!activeSession) {
      setUserProgress(DEFAULT_USER_PROGRESS);
      setSrsMap({});
      setAllWords([]);
      setVocabularySets([]);
      return;
    }

    // Render from the stored list first, then let the login fetch replace it —
    // the pickers must never wait on the network.
    setVocabularySets(loadCategories());
    void hydrateVocabularySets(isFreshLogin);
    void hydrateSettingsFromApi(loadedSettings);

    const loadedSRS = loadSRSData();
    const loadedWords = loadAllWords();
    const storedProgress = loadUserProgress();

    // What the user typed at registration wins, then the account's own name from
    // `/users/profile`, then whatever this device recorded before.
    const name =
      displayName?.trim() ||
      activeSession.name?.trim() ||
      storedProgress.name ||
      getDisplayName(activeSession);
    const loadedProgress = {
      ...storedProgress,
      name,
      email: activeSession.email,
      userId: activeSession.userId,
      avatar: generateAvatar(name || activeSession.email),
    };

    setUserProgress(loadedProgress);
    saveUserProgress(loadedProgress);
    setSrsMap(loadedSRS);
    setAllWords(loadedWords);

    hydrateFromApi(loadedWords);
    void refreshStats();
    void refreshProgress();
  };

  /**
   * Drops the session and returns to the sign-in screen. Used both for an
   * explicit sign-out and for a token the backend rejected — either way nothing
   * account-specific may stay on screen.
   *
   * The push endpoint goes with it, and the order matters:
   * `/notification/unsubscribe` is authenticated and `unsubscribeFromPush` only
   * reaches for the token after awaiting the service worker, so clearing the
   * session first would send the request unauthenticated and leave the backend
   * pushing review reminders at a device nobody is signed in on.
   *
   * The screen flips right away regardless — only `logout` waits, and only
   * until `LOGOUT_UNSUBSCRIBE_TIMEOUT_MS`, so a hung request can never strand a
   * live token in localStorage.
   */
  const signOut = (view: AuthView = 'login') => {
    const previousToken = getCurrentSession()?.accessToken;

    const deregistered = unsubscribeFromPush().catch((e) => {
      console.warn('Push unsubscribe on sign-out failed:', e);
    });
    const deadline = new Promise((resolve) =>
      setTimeout(resolve, LOGOUT_UNSUBSCRIBE_TIMEOUT_MS)
    );

    loadAccountState(null);
    setIsQueueRun(false);
    setPracticeSitting(null);
    setIsBattleOpen(false);
    setIsSettingsOpen(false);
    setIsAddWordOpen(false);
    setIsLevelPickerOpen(false);
    setIsGuideOpen(false);
    setIsAskingNotifications(false);
    setIsWalletOpen(false);
    setStarterOffer(null);
    setActiveTab('home');
    setAuthView(view);

    void Promise.race([deregistered, deadline]).then(() => {
      // Signing back in while the unsubscribe was still in flight leaves a fresh
      // token in localStorage — this stale sign-out must not clear it.
      if (getCurrentSession()?.accessToken === previousToken) logout();
    });
  };

  /**
   * Pulls the account's real word state from the backend and folds it into the
   * local library and SRS map. Failure is non-fatal — local data stays
   * authoritative.
   *
   * Reads the word library (`GET /words`, served from its localStorage cache),
   * not `/reviews/due`: the library covers the account's *whole* vocabulary
   * rather than only what happens to be due, and it costs no request when the
   * cache is warm. The one thing it lacks is `userWordId`, which only the review
   * tab needs.
   */
  const hydrateFromApi = async (words: Word[]) => {
    try {
      const { items } = await getUserWordLibrary({ fallbacks: words, vocabularySets });
      if (items.length === 0) return;

      // A library row carries the word itself, so one added on another device
      // can join this device's library instead of showing as a placeholder.
      const knownIds = new Set(words.map((w) => String(w.id)));
      const adopted = items
        .filter((item) => !knownIds.has(String(item.word.id)))
        .map((item) => item.word);

      if (adopted.length > 0) {
        setAllWords((prev) => {
          const existing = new Set(prev.map((w) => String(w.id)));
          const additions = adopted.filter((w) => !existing.has(String(w.id)));
          if (additions.length === 0) return prev;

          const next = [...additions, ...prev];
          saveCustomWords(next);
          return next;
        });
      }

      setSrsMap((prev) => {
        const merged = { ...prev };
        items.forEach((item) => {
          const wordId = String(item.word.id);
          const existing = merged[wordId];
          // The backend owns the schedule and the status; everything else on the
          // entry — above all `userWordId`, which is what `/reviews/:id` is
          // posted to — is only known locally and must survive this merge.
          merged[wordId] = {
            userWordId: existing?.userWordId,
            wordId,
            interval: existing?.interval ?? 0,
            easeFactor: existing?.easeFactor ?? 2.5,
            repetitions: existing?.repetitions ?? 0,
            lastReviewed: existing?.lastReviewed ?? null,
            nextReviewDate: item.dueAt ?? existing?.nextReviewDate ?? new Date().toISOString(),
            state: item.state ?? existing?.state ?? 'new',
          };
        });
        saveSRSData(merged);
        return merged;
      });

      await syncFavorites(
        items.filter((item) => item.isFavorite).map((item) => String(item.word.id)),
      );
    } catch (err) {
      // A rejected token means the stored session is dead — the app has no
      // signed-out mode, so send the user back to sign in rather than showing
      // an account view backed by nothing.
      if (err instanceof ApiError && err.status === 401) {
        signOut();
        return;
      }
      console.warn('Could not hydrate progress from API, using local data:', err);
    }
  };

  /**
   * Favorites used to live on the device only. The first load after that sends
   * them up once; from then on the server's list is the answer, keeping only
   * the local-only words it has never heard of.
   */
  const syncFavorites = async (remote: string[]) => {
    let favorites = remote;

    if (!hasUploadedFavorites()) {
      const local = loadUserProgress().favorites;
      await setFavorites(local, true);
      local.forEach((id) => patchCachedFavorite(id, true));
      markFavoritesUploaded();
      favorites = Array.from(new Set([...remote, ...local]));
    }

    setUserProgress((prev) => {
      const localOnly = prev.favorites.filter((id) => !/^\d+$/.test(id));
      // A set: on the upload pass `favorites` already holds the local-only ids.
      const updated = { ...prev, favorites: Array.from(new Set([...favorites, ...localOnly])) };
      saveUserProgress(updated);
      return updated;
    });
  };

  /**
   * Re-reads `/users/profile` for a session restored from storage — it carries
   * the name from the last sign-in, which may since have changed elsewhere.
   * A different user id means the token now answers for another account, so the
   * whole scoped state is reloaded rather than patched.
   */
  const syncProfile = async (restored: AuthSession) => {
    const updated = await refreshProfile();
    if (!updated) return;

    if (updated.userId !== restored.userId) {
      loadAccountState(updated);
      return;
    }

    applySession(updated);
  };

  /**
   * Folds a session the backend just confirmed — `/users/profile` or
   * `PATCH /users/name` — into the on-screen progress. The avatar is derived
   * from the name, so it has to be regenerated alongside it.
   */
  const applySession = (updated: AuthSession) => {
    setSession(updated);

    const name = updated.name?.trim();
    if (!name) return;

    setUserProgress((prev) => {
      if (prev.name === name && prev.email === updated.email) return prev;

      const next = {
        ...prev,
        name,
        email: updated.email,
        avatar: generateAvatar(name || updated.email),
      };
      saveUserProgress(next);
      return next;
    });
  };

  useEffect(() => {
    const existingSession = getCurrentSession();
    loadAccountState(existingSession);
    setIsMounted(true);

    if (existingSession) void syncProfile(existingSession);

    // A Battle invite link (`/app?battle=CODE`; the landing page forwards the
    // older `/?battle=CODE` here). Parked in sessionStorage so it
    // survives the sign-in screen, and stripped from the URL so a reload does
    // not reopen the Battle.
    const url = new URL(window.location.href);
    if (url.searchParams.has(BATTLE_INVITE_PARAM)) {
      const code = normalizeRoomCode(url.searchParams.get(BATTLE_INVITE_PARAM));
      if (code) savePendingBattleCode(code);
      url.searchParams.delete(BATTLE_INVITE_PARAM);
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  // Opens a pending invite as soon as there is a session to play it with —
  // right after mount for a signed-in user, or after login/registration.
  useEffect(() => {
    if (!session) return;
    const code = takePendingBattleCode();
    if (!code) return;
    setBattleInviteCode(code);
    trackEvent('battle_open', { source: 'invite' });
    setIsBattleOpen(true);
  }, [session]);

  // Analytics: every event after sign-in belongs to this account (`user_id`).
  const sessionUserId = session?.userId ?? null;
  useEffect(() => {
    setAnalyticsUser(sessionUserId);
  }, [sessionUserId]);

  // Analytics: `/app` has no routes, so GA's page views stop at the URL. One
  // `app_screen_view` per screen the user actually lands on fills that gap.
  const analyticsScreen = !session
    ? `auth_${authView}`
    : isBattleOpen
      ? 'battle'
      : isQueueRun
        ? 'quiz_flashcards'
        : practiceSitting
          ? 'practice'
          : activeTab;
  useEffect(() => {
    if (!isMounted) return;
    trackEvent('app_screen_view', { screen_name: analyticsScreen });
  }, [isMounted, analyticsScreen]);

  const queueCounts = useMemo(
    () => (reviewQueue === null ? null : countQueue(reviewQueue)),
    [reviewQueue],
  );

  // Everything derivable is recomputed here, so the UI can never render a
  // counter that drifted away from the SRS map, the XP total or the settings.
  const derivedProgress = deriveProgress(userProgress, srsMap, settings.dailyGoal);

  /** Where a reminder leads: the home screen, whose button reviews what is due. */
  const openReview = () => {
    setIsQueueRun(false);
    setPracticeSitting(null);
    setChainStart(null);
    setIsSettingsOpen(false);
    setActiveTab('home');
  };

  /** Practice reschedules words without saying how, so read the library again. */
  const closePractice = () => {
    setPracticeSitting(null);
    if (!hasPracticeReviewsRef.current) return;
    hasPracticeReviewsRef.current = false;
    invalidateUserWordLibrary();
    void hydrateFromApi(allWords);
    void refreshStats();
  };

  /** Making a chain can spend xu, extend the streak and add words. */
  const closeChain = () => {
    setChainStart(null);
    void refreshWallet();
    void refreshProgress();
    if (!hasChainWordsRef.current) return;
    hasChainWordsRef.current = false;
    void hydrateFromApi(allWords);
    void refreshStats();
  };

  /**
   * `source` exists for analytics only: both the single-word form and the Excel
   * import land here, so this is the one `add_words` event for either — the
   * import's own `import_sync_result` reports how the backend sync went.
   */
  const handleAddWords = (newWords: Word[], source: 'manual' | 'excel') => {
    if (newWords.length === 0) return;

    trackEvent('add_words', { count: newWords.length, source });

    const existingCustom = loadCustomWords();
    const updatedCustom = [...newWords, ...existingCustom];
    saveCustomWords(updatedCustom);

    const updatedAll = [...newWords, ...allWords];
    setAllWords(updatedAll);

    // Initialize SRS entries for all new words
    const updatedSRSMap = { ...srsMap };
    newWords.forEach((w) => {
      updatedSRSMap[w.id] = createInitialSRS(w.id);
    });
    setSrsMap(updatedSRSMap);
    saveSRSData(updatedSRSMap);

  };

  /** The home button's flashcard run: due words, new and old together. */
  const startQueueReview = async () => {
    setReviewError(null);
    setIsStartingReview(true);
    try {
      const queue = await getReviewQueue();
      setReviewQueue(queue);
      if (queue.length === 0) return;
      const run = nextRun(queue);

      setQuizSessionWords(run.map((row) => resolveWordForUserWord(row, allWords)));
      setIsSettingsOpen(false);
      setIsQueueRun(true);
      trackEvent('quiz_start', {
        quiz_type: 'study_queue',
        item_count: run.length,
      });
    } catch (err) {
      console.error('API getReviewQueue error:', err);
      setReviewError('Không thể tải danh sách ôn. Vui lòng thử lại sau.');
    } finally {
      setIsStartingReview(false);
    }
  };

  /** Called when any run is completed, not when it is abandoned. */
  const handleSessionFinished = () => {
    if (settings.notifications && shouldAskForNotifications(notificationPermission)) {
      setIsAskingNotifications(true);
    }
  };

  const closeNotificationPrompt = () => {
    markNotificationsAsked();
    setIsAskingNotifications(false);
  };

  /**
   * A new account's first run: pick Starter Words, then straight into them. If
   * the server can't give them, the app tour explains how to add words instead.
   */
  const offerStarterWords = async (level?: CEFRLevel) => {
    try {
      setStarterOffer({ level, words: await fetchStarterWords(level) });
    } catch (err) {
      console.error('API fetchStarterWords error:', err);
      setIsGuideOpen(true);
    }
  };

  const startFirstRun = async (level: CEFRLevel | undefined, headwords: string[]) => {
    setStarterOffer(null);
    setIsStartingReview(true);
    try {
      await giveStarterWords(level, headwords);
    } catch (err) {
      console.error('API giveStarterWords error:', err);
      setIsStartingReview(false);
      setIsGuideOpen(true);
      return;
    }
    void hydrateFromApi(allWords);
    void hydrateVocabularySets(true);
    void refreshStats();
    await startQueueReview();
  };

  const handleRateFlashcardWord = async (word: Word, rating: ReviewQuality) => {
    trackEvent('flashcard_rate', { rating });

    const currentSRS = srsMap[word.id] || {
      wordId: word.id,
      interval: 0,
      easeFactor: 2.5,
      repetitions: 0,
      lastReviewed: null,
      nextReviewDate: new Date().toISOString(),
      state: 'new',
    };

    const updated = calculateNextSRS(currentSRS, rating);
    handleUpdateSRS(word.id, updated);

    try {
      // `word.id` is the queue row's `userWordId`, and this rating applies to
      // every due meaning bundled under it at once.
      const definitions = await trackSubmit(submitQueueWord(word.id, rating));
      const backendSRS = mapWordRatingToSRS(definitions);
      if (backendSRS) handleUpdateSRS(word.id, backendSRS);
    } catch (err) {
      console.error('API submitQueueWord error:', err);
    }
  };

  const handleToggleFavorite = (wordId: string) => {
    const isFavorite = !userProgress.favorites.includes(wordId);
    const apply = (value: boolean) => {
      setUserProgress((prev) => {
        const others = prev.favorites.filter((id) => id !== wordId);
        const updated = { ...prev, favorites: value ? [...others, wordId] : others };
        saveUserProgress(updated);
        return updated;
      });
      patchCachedFavorite(wordId, value);
    };

    apply(isFavorite);
    setFavorites([wordId], isFavorite).catch((err) => {
      console.error('API setFavorites error:', err);
      apply(!isFavorite);
    });
  };

  const handleUpdateSRS = (wordId: string, updatedSRS: SRSData) => {
    setSrsMap((prev) => {
      const updatedMap = { ...prev, [wordId]: updatedSRS };
      saveSRSData(updatedMap);
      return updatedMap;
    });
  };

  /**
   * Re-keys a word from its optimistic local id to the id the backend assigned.
   * Without this the app holds two identities for one word and anything driven
   * by the backend — `dueAt`, review reminders — cannot match it locally.
   */
  const handleWordSynced = (localId: string, syncedWord: Word, syncedSRS: SRSData) => {
    // The word reached the backend, so its totals moved — even when the id came
    // back unchanged and there is nothing local to re-key.
    void refreshStats();
    scheduleProgressRefresh();
    // The server makes the default set with an account's first word.
    if (!vocabularySets.some((set) => set.isDefault)) void hydrateVocabularySets(true);

    if (syncedWord.id === localId) return;

    setAllWords((prev) => prev.map((w) => (w.id === localId ? syncedWord : w)));
    saveCustomWords(loadCustomWords().map((w) => (w.id === localId ? syncedWord : w)));

    setSrsMap((prev) => {
      const updatedMap = { ...prev };
      delete updatedMap[localId];
      updatedMap[syncedWord.id] = syncedSRS;
      saveSRSData(updatedMap);
      return updatedMap;
    });
  };

  const {
    permission: notificationPermission,
    requestPermission: requestNotificationPermission,
    activeReminder,
    dismissReminder,
    refreshDue,
  } = useDueReminders({
    allWords,
    srsMap,
    settings,
    isReady: isMounted,
    userId: session?.userId ?? null,
    onOpenReview: openReview,
  });

  /**
   * A sense was rewritten or removed in the word detail modal. The backend and
   * the cached library are already updated by the time this runs — what is left
   * is the copy this screen owns and the one on disk, which is what every quiz
   * and card reads from.
   */
  const handleWordEdited = (updated: Word) => {
    setAllWords((prev) => prev.map((w) => (w.id === updated.id ? updated : w)));
    saveCustomWords(loadCustomWords().map((w) => (w.id === updated.id ? updated : w)));
  };

  /**
   * A word was deleted. Its SRS entry goes with it — a schedule for a word that
   * no longer exists would keep announcing a reminder for it — and the home
   * counters are re-asked, since the backend's totals just moved.
   */
  const handleWordRemoved = (wordId: string) => {
    setAllWords((prev) => prev.filter((w) => w.id !== wordId));
    saveCustomWords(loadCustomWords().filter((w) => w.id !== wordId));

    setSrsMap((prev) => {
      if (!(wordId in prev)) return prev;
      const updatedMap = { ...prev };
      delete updatedMap[wordId];
      saveSRSData(updatedMap);
      return updatedMap;
    });

    void refreshStats();
    scheduleProgressRefresh();
    refreshDue();
  };

  // A tab change is the cheapest honest moment to recompute what is due. This
  // costs a localStorage read, not a request — the due state comes from the
  // cached word library, which `submitReview` patches as reviews land.
  useEffect(() => {
    if (!isMounted) return;
    refreshDue();
  }, [activeTab, isMounted, refreshDue]);

  // The home counters are the backend's, so they have to be re-asked whenever
  // the user lands back on that screen — a finished session or a review just
  // moved every number on it.
  useEffect(() => {
    if (!isMounted || activeTab !== 'home' || isQueueRun || practiceSitting) return;
    void refreshStats();
  }, [activeTab, isQueueRun, practiceSitting, isMounted, refreshStats]);

  // The home button's count. Asked again on landing back on home, which is
  // also right after a run.
  useEffect(() => {
    if (!isMounted || !session || activeTab !== 'home' || isQueueRun || practiceSitting) return;
    void refreshQueue();
  }, [activeTab, isQueueRun, practiceSitting, isMounted, session, refreshQueue]);

  // Studying earns xu and the AI buttons spend it.
  useEffect(() => {
    if (!isMounted || isQueueRun || practiceSitting || isAddWordOpen) return;
    void refreshWallet();
  }, [activeTab, isQueueRun, practiceSitting, isAddWordOpen, isMounted, session, refreshWallet]);

  // XP and streak also move on other devices and in PDF Reader, and the header
  // shows them on every tab.
  useEffect(() => {
    if (!isMounted || isQueueRun || practiceSitting) return;
    void refreshProgress();
  }, [activeTab, isQueueRun, practiceSitting, isMounted, refreshProgress]);

  const { pushStatus } = usePushSubscription({
    isReady: isMounted,
    enabled: settings.notifications,
    permission: notificationPermission,
    userId: session?.userId ?? null,
  });

  /**
   * The single entry point for every settings change — the settings modal and
   * the CEFR question both come through here, so each one is stored locally and
   * mirrored to `PATCH /settings` without the callers having to know about it.
   */
  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);
    applySettingsEffects(updated);

    void pushSettingsToApi(updated);
  };

  const handleResetProgress = () => {
    // Only wipes the signed-in account's data — other accounts and the session stay put.
    clearScopedData();
    setIsSettingsOpen(false);
    window.location.reload();
  };

  // Hold the first paint until the session is known, otherwise a signed-in user
  // sees a flash of the onboarding screen.
  if (!isMounted) {
    return <MobileContainer><div className="flex-1 bg-slate-50 dark:bg-slate-900" /></MobileContainer>;
  }

  // Auth gate: without a session there is no app, only onboarding and the
  // sign-in form. Every feature below reads account-scoped data.
  if (!session) {
    if (authView === 'onboarding') {
      return (
        <MobileContainer>
          <OnboardingScreen
            onGetStarted={() => setAuthView('register')}
            onSignIn={() => setAuthView('login')}
          />
        </MobileContainer>
      );
    }

    return (
      <MobileContainer>
        <AuthScreen
          initialMode={authView}
          onLoginSuccess={(newSession, displayName, isNewAccount) => {
            // Swap to the account's own scoped state before rendering anything.
            loadAccountState(newSession, displayName, true);
            setActiveTab('home');
            // A brand-new account is asked for its CEFR level once, on top of
            // the home screen it just landed on.
            setIsLevelPickerOpen(isNewAccount);
          }}
          onBack={() => setAuthView('onboarding')}
        />
      </MobileContainer>
    );
  }

  if (isBattleOpen) {
    return (
      <MobileContainer>
        <BattleGame
          accessToken={session.accessToken}
          meId={session.userId}
          initialCode={battleInviteCode}
          onClose={() => {
            setIsBattleOpen(false);
            setBattleInviteCode('');
          }}
          onSessionExpired={() => signOut()}
        />
      </MobileContainer>
    );
  }

  if (isQueueRun) {
    return (
      <MobileContainer>
        <FlashcardQuiz
          words={quizSessionWords}
          favorites={userProgress.favorites}
          onToggleFavorite={handleToggleFavorite}
          onRateWord={handleRateFlashcardWord}
          onClose={() => setIsQueueRun(false)}
          onFinish={handleSessionFinished}
        />
      </MobileContainer>
    );
  }

  if (practiceSitting) {
    return (
      <MobileContainer>
        <PracticeSession
          key={practiceSitting.id}
          initial={practiceSitting}
          track={trackSubmit}
          onReviewed={() => {
            hasPracticeReviewsRef.current = true;
          }}
          onRoundFinished={handleSessionFinished}
          onClose={closePractice}
        />
      </MobileContainer>
    );
  }

  if (chainStart) {
    return (
      <MobileContainer>
        <ChainScreen
          start={chainStart}
          prices={wallet?.enabled ? wallet.prices : null}
          track={trackSubmit}
          onWordAdded={() => {
            hasChainWordsRef.current = true;
          }}
          onClose={closeChain}
        />
      </MobileContainer>
    );
  }

  // Main Dashboard View with Bottom Navigation
  return (
    <MobileContainer>
      <HeaderBar
        progress={derivedProgress}
        learning={learning}
        onOpenProgress={() => setActiveTab('stats')}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddWord={() => setIsAddWordOpen(true)}
        xuBalance={wallet?.enabled ? wallet.balance : null}
        onOpenWallet={() => setIsWalletOpen(true)}
      />

      {activeTab === 'home' && (
        <HomeDashboard
          progress={derivedProgress}
          summary={statsSummary}
          learning={learning}
          activity={activity}
          queue={queueCounts}
          onOpenPractice={() => setActiveTab('learn')}
          isStartingReview={isStartingReview}
          reviewError={reviewError}
          onStartReview={() => void startQueueReview()}
          onOpenAddWord={() => setIsAddWordOpen(true)}
        />
      )}

      {activeTab === 'learn' && (
        <PracticeTab
          allWords={allWords}
          vocabularySets={vocabularySets}
          favorites={userProgress.favorites}
          onOpenSitting={setPracticeSitting}
          onOpenBattle={() => {
            trackEvent('battle_open', { source: 'home' });
            setIsBattleOpen(true);
          }}
          onOpenAddWord={() => setIsAddWordOpen(true)}
          onOpenChain={setChainStart}
          prices={wallet?.enabled ? wallet.prices : null}
          // From home, so a failed start has somewhere to say so.
          onStartReview={() => {
            setActiveTab('home');
            void startQueueReview();
          }}
        />
      )}

      {activeTab === 'stats' && (
        <StatsDashboard progress={derivedProgress} learning={learning} activity={activity} />
      )}

      {activeTab === 'profile' && (
        <ProfileScreen
          progress={derivedProgress}
          learning={learning}
          allWords={allWords}
          srsMap={srsMap}
          vocabularySets={vocabularySets}
          onWordUpdated={handleWordEdited}
          onWordDeleted={handleWordRemoved}
          favorites={userProgress.favorites}
          onToggleFavorite={handleToggleFavorite}
          onSetsChanged={handleSetsChanged}
          onEditProfile={() => setIsEditProfileOpen(true)}
          onLogout={() => signOut()}
        />
      )}

      <BottomNav activeTab={activeTab} onChangeTab={setActiveTab} />

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => setIsSettingsOpen(false)}
          onOpenGuide={() => {
            setIsSettingsOpen(false);
            setIsGuideOpen(true);
          }}
          notificationPermission={notificationPermission}
          onRequestNotificationPermission={() => {
            void requestNotificationPermission();
          }}
          pushStatus={pushStatus}
        />
      )}

      {isEditProfileOpen && session && (
        <EditProfileModal
          currentName={derivedProgress.name}
          email={session.email}
          onClose={() => setIsEditProfileOpen(false)}
          onNameUpdated={applySession}
        />
      )}

      {isLevelPickerOpen && (
        <LevelSelectModal
          initialLevel={settings.cefrLevel}
          onConfirm={(level) => {
            // Stores the band and sends it straight on as `certLevel` via
            // `PATCH /settings`, so the answer survives this device.
            handleUpdateSettings({ cefrLevel: level });
            setIsLevelPickerOpen(false);
            // Only a new account is asked for its level, so either way out of
            // the question leads to the Starter Words.
            void offerStarterWords(level);
          }}
          onSkip={() => {
            setIsLevelPickerOpen(false);
            void offerStarterWords();
          }}
        />
      )}

      {isGuideOpen && (
        <AppGuideModal
          onClose={() => setIsGuideOpen(false)}
          onAddFirstWord={() => {
            setIsGuideOpen(false);
            setIsAddWordOpen(true);
          }}
        />
      )}

      {starterOffer && (
        <StarterWordsModal
          words={starterOffer.words}
          onConfirm={(headwords) => void startFirstRun(starterOffer.level, headwords)}
          onSkip={() => setStarterOffer(null)}
        />
      )}

      {isAskingNotifications && (
        <NotificationPrompt
          needsHomeScreen={needsHomeScreenForPush()}
          onAccept={() => {
            closeNotificationPrompt();
            void requestNotificationPermission();
          }}
          onLater={closeNotificationPrompt}
        />
      )}

      {isWalletOpen && wallet?.enabled && (
        <WalletModal wallet={wallet} onClose={() => setIsWalletOpen(false)} />
      )}

      <AddWordModal
        isOpen={isAddWordOpen}
        vocabularySets={vocabularySets}
        cefrLevel={settings.cefrLevel}
        onSetsChanged={handleSetsChanged}
        onClose={() => setIsAddWordOpen(false)}
        onAddWord={(w) => handleAddWords([w], 'manual')}
        onAddWords={(ws) => handleAddWords(ws, 'excel')}
        onWordSynced={handleWordSynced}
      />

      {activeReminder && (
        <DueReminderToast
          items={activeReminder.items}
          onReview={() => {
            dismissReminder();
            void startQueueReview();
          }}
          onDismiss={() => {
            dismissReminder();
          }}
        />
      )}
    </MobileContainer>
  );
}
