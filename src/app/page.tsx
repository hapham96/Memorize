'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MobileContainer } from '@/components/layout/MobileContainer';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { OnboardingScreen } from '@/components/auth/OnboardingScreen';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { LevelSelectModal } from '@/components/auth/LevelSelectModal';
import { HomeDashboard } from '@/components/dashboard/HomeDashboard';
import { QuizSelection } from '@/components/quiz/QuizSelection';
import { FlashcardQuiz } from '@/components/quiz/FlashcardQuiz';
import { MultipleChoiceQuiz } from '@/components/quiz/MultipleChoiceQuiz';
import { FillBlankQuiz } from '@/components/quiz/FillBlankQuiz';
import { TypeWordQuiz } from '@/components/quiz/TypeWordQuiz';
import { QuizResultModal } from '@/components/quiz/QuizResultModal';
import { ReviewDashboard } from '@/components/review/ReviewDashboard';
import { StatsDashboard } from '@/components/stats/StatsDashboard';
import { ProfileScreen } from '@/components/profile/ProfileScreen';
import { SettingsModal } from '@/components/profile/SettingsModal';
import { DueReminderToast } from '@/components/layout/DueReminderToast';

import { AddWordModal } from '@/components/dashboard/AddWordModal';

import {
  ActiveTab,
  Category,
  QuizType,
  UserProgress,
  SRSData,
  QuizSessionResult,
  Word,
} from '@/types';
import { ReviewQuality } from '@/types/word';
import { calculateNextSRS } from '@/lib/srs';
import {
  submitReview,
  mapReviewResponseToSRS,
  getDueReviews,
  invalidateDueReviews,
  mapBackendUserWordToSRS,
  resolveWordForUserWord,
} from '@/lib/api/word-client';
import { syncCategories } from '@/lib/api/category-client';
import { ApiError } from '@/lib/api/client';
import { getCurrentSession, getDisplayName, logout } from '@/lib/api/auth-client';
import { AuthSession } from '@/types/auth';
import {
  loadCategories,
  loadUserProgress,
  saveUserProgress,
  loadSRSData,
  saveSRSData,
  loadSettings,
  saveSettings,
  loadAllWords,
  loadCustomWords,
  saveCustomWords,
  setStorageScope,
  clearScopedData,
  AppSettings,
  DEFAULT_SETTINGS,
  DEFAULT_USER_PROGRESS,
} from '@/lib/storage';
import { createInitialSRS } from '@/lib/srs';
import { soundFX } from '@/lib/audio';
import { generateAvatar } from '@/lib/avatar';
import { applyDailyRollover, deriveProgress, levelFromXp, recordActivity } from '@/lib/progress';
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
  const [activeQuizMode, setActiveQuizMode] = useState<QuizType | null>(null);
  const [quizSessionWords, setQuizSessionWords] = useState<Word[]>([]);
  const [sessionResult, setSessionResult] = useState<QuizSessionResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);
  /**
   * The one-time CEFR question. Opened by a successful registration only — a
   * returning sign-in must not be interrogated again, whether or not the answer
   * was ever given (it can be set any time from settings).
   */
  const [isLevelPickerOpen, setIsLevelPickerOpen] = useState(false);

  // App Persistent State
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_USER_PROGRESS);
  const [srsMap, setSrsMap] = useState<Record<string, SRSData>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Refreshes the cached `/categories` list. Only sign-in passes `force` — the
   * list barely changes, so every other entry into the app reads the copy in
   * localStorage and never touches the network.
   *
   * Failure is silent: `syncCategories` returns the cached list when it has
   * one, and the pickers fall back to their shipped names when it does not.
   */
  const hydrateCategories = async (force: boolean) => {
    try {
      setCategories(await syncCategories({ force }));
    } catch (err) {
      console.warn('Could not load categories from API:', err);
    }
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
    // Sign-in and sign-out both land here; the previous account's due list must
    // not answer for the new one.
    invalidateDueReviews();

    const loadedSettings = loadSettings();

    if (loadedSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    soundFX.setEnabled(loadedSettings.soundEnabled);
    setSettings(loadedSettings);

    if (!activeSession) {
      setUserProgress(DEFAULT_USER_PROGRESS);
      setSrsMap({});
      setAllWords([]);
      setCategories([]);
      return;
    }

    // Render from the stored list first, then let the login fetch replace it —
    // the pickers must never wait on the network.
    setCategories(loadCategories());
    void hydrateCategories(isFreshLogin);

    const loadedSRS = loadSRSData();
    const loadedWords = loadAllWords();
    const rolledOver = applyDailyRollover(loadUserProgress());

    const name = displayName?.trim() || rolledOver.name || getDisplayName(activeSession);
    const loadedProgress = {
      ...rolledOver,
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
    setActiveQuizMode(null);
    setSessionResult(null);
    setIsSettingsOpen(false);
    setIsAddWordOpen(false);
    setIsLevelPickerOpen(false);
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
   * local SRS map. Failure is non-fatal — local data stays authoritative.
   */
  const hydrateFromApi = async (words: Word[]) => {
    try {
      const userWords = await getDueReviews();
      if (!Array.isArray(userWords) || userWords.length === 0) return;

      // A due row now carries the word itself, so one added on another device
      // can join this device's library instead of showing as a placeholder.
      const knownIds = new Set(words.map((w) => String(w.id)));
      const adopted = userWords
        .filter((userWord) => userWord.word && !knownIds.has(String(userWord.wordId)))
        .map((userWord) => resolveWordForUserWord(userWord, words));

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
        userWords.forEach((userWord) => {
          const word = resolveWordForUserWord(userWord, words);
          merged[word.id] = mapBackendUserWordToSRS(userWord);
        });
        saveSRSData(merged);
        return merged;
      });

      const favorites = userWords
        .filter((userWord) => userWord.isFavorite)
        .map((userWord) => resolveWordForUserWord(userWord, words).id);

      if (favorites.length > 0) {
        setUserProgress((prev) => {
          const updated = {
            ...prev,
            favorites: Array.from(new Set([...prev.favorites, ...favorites])),
          };
          saveUserProgress(updated);
          return updated;
        });
      }
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

  useEffect(() => {
    const existingSession = getCurrentSession();
    loadAccountState(existingSession);
    setIsMounted(true);
  }, []);

  // Everything derivable is recomputed here, so the UI can never render a
  // counter that drifted away from the SRS map, the XP total or the settings.
  const displayProgress = deriveProgress(userProgress, srsMap, settings.dailyGoal);

  // Filter word dataset according to user's focusCategories setting. Memoised
  // because `useDueReminders` scans this list on every identity change.
  const focusCategories = useMemo(
    () => settings.focusCategories || [],
    [settings.focusCategories]
  );
  const activePool = useMemo(
    () =>
      focusCategories.length > 0
        ? allWords.filter((w) => focusCategories.includes(w.category))
        : allWords,
    [allWords, focusCategories]
  );

  const openReview = () => {
    setActiveQuizMode(null);
    setSessionResult(null);
    setIsSettingsOpen(false);
    setActiveTab('review');
  };

  const handleAddWords = (newWords: Word[]) => {
    if (newWords.length === 0) return;

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

    // Reward user with 20 XP per added custom word. wordsLearned is derived
    // from the SRS map, so it is not incremented by hand here.
    setUserProgress((prev) => {
      const xp = prev.xp + newWords.length * 20;
      const updated = recordActivity({ ...prev, xp, level: levelFromXp(xp) });
      saveUserProgress(updated);
      return updated;
    });
  };

  const handleStartQuiz = (type: QuizType) => {
    // Pick up to 10 random words from activePool for the session
    const pool = activePool.length > 0 ? activePool : allWords;
    // Nothing to quiz on yet — every word in the library is one the user added,
    // so send them to add some instead of opening an empty session.
    if (pool.length === 0) {
      setIsAddWordOpen(true);
      return;
    }
    const shuffled = [...pool].sort(() => 0.5 - Math.random()).slice(0, 10);
    setQuizSessionWords(shuffled);
    setActiveQuizMode(type);
  };

  const handleQuizComplete = (correctCount: number, mistakes: Word[]) => {
    const total = quizSessionWords.length;
    const xpEarned = correctCount * 5 + 10; // 5 XP per correct + 10 completion bonus

    const newResult: QuizSessionResult = {
      quizType: activeQuizMode || 'flashcards',
      total,
      correct: correctCount,
      xpEarned,
      mistakes,
    };

    setSessionResult(newResult);

    // Update User Progress. wordsLearned/masteredCount/level are derived at
    // render time from the SRS map and XP, so only real events are stored.
    const active = recordActivity(userProgress);
    const xp = active.xp + xpEarned;
    const updatedProgress: UserProgress = {
      ...active,
      xp,
      level: levelFromXp(xp),
      dailyGoalProgress: Math.min(settings.dailyGoal, active.dailyGoalProgress + total),
      totalCorrect: active.totalCorrect + correctCount,
      totalAttempted: active.totalAttempted + total,
      history: [
        {
          id: `h_${Date.now()}`,
          timestamp: new Date().toISOString(),
          quizType: activeQuizMode?.replace('-', ' ') || 'Quiz',
          totalQuestions: total,
          correctCount,
          xpEarned,
        },
        ...active.history,
      ],
    };

    setUserProgress(updatedProgress);
    saveUserProgress(updatedProgress);
  };

  const handleRateFlashcardWord = async (word: Word, rating: ReviewQuality) => {
    // Increment daily goal progress on flashcard view
    setUserProgress((prev) => {
      const active = recordActivity(prev);
      const updated = {
        ...active,
        dailyGoalProgress: Math.min(settings.dailyGoal, active.dailyGoalProgress + 1),
        totalAttempted: active.totalAttempted + 1,
        totalCorrect: active.totalCorrect + (rating >= 3 ? 1 : 0),
      };
      saveUserProgress(updated);
      return updated;
    });

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
      const reviewResp = await submitReview(word.id, rating);
      if (reviewResp) {
        const backendSRS = mapReviewResponseToSRS(reviewResp);
        handleUpdateSRS(word.id, backendSRS);
      }
    } catch (err) {
      console.error('API submitReview error:', err);
    }
  };

  const handleToggleFavorite = (wordId: string) => {
    setUserProgress((prev) => {
      const isFav = prev.favorites.includes(wordId);
      const updatedFavs = isFav
        ? prev.favorites.filter((id) => id !== wordId)
        : [...prev.favorites, wordId];
      const updated = { ...prev, favorites: updatedFavs };
      saveUserProgress(updated);
      return updated;
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
    apiDueCount,
    refreshDue,
  } = useDueReminders({
    allWords,
    focusCategories,
    srsMap,
    settings,
    isReady: isMounted,
    userId: session?.userId ?? null,
    onOpenReview: openReview,
    onSyncSRS: handleUpdateSRS,
  });

  // The review badge is whatever `/reviews/due` last answered, so it can never
  // disagree with the review tab's own count. There is no local fallback on
  // purpose: a due date only the backend knows is the one that matters, and
  // "not asked yet" reads as zero rather than as a guess.
  const dueCount = apiDueCount ?? 0;

  // A tab change is the cheapest honest moment to re-ask. `getDueReviews` serves
  // a 30s cache, so an idle switch costs nothing; after a review session
  // `submitReview` has already dropped that cache, so this is the fetch that
  // clears the badge.
  useEffect(() => {
    if (!isMounted) return;
    refreshDue();
  }, [activeTab, isMounted, refreshDue]);

  const { pushStatus } = usePushSubscription({
    isReady: isMounted,
    enabled: settings.notifications,
    permission: notificationPermission,
    userId: session?.userId ?? null,
  });

  const handleUpdateSettings = (newSettings: Partial<AppSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    saveSettings(updated);

    if (updated.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    soundFX.setEnabled(updated.soundEnabled);
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

  // Render Active Quiz Mode
  if (activeQuizMode) {
    return (
      <MobileContainer>
        {activeQuizMode === 'flashcards' && (
          <FlashcardQuiz
            words={quizSessionWords}
            favorites={userProgress.favorites}
            onToggleFavorite={handleToggleFavorite}
            onRateWord={handleRateFlashcardWord}
            onClose={() => setActiveQuizMode(null)}
          />
        )}

        {activeQuizMode === 'multiple-choice' && (
          <MultipleChoiceQuiz
            words={quizSessionWords}
            allWords={allWords}
            onComplete={(correctCount, mistakes) => {
              handleQuizComplete(correctCount, mistakes);
            }}
            onClose={() => setActiveQuizMode(null)}
          />
        )}

        {activeQuizMode === 'fill-blank' && (
          <FillBlankQuiz
            words={quizSessionWords}
            allWords={allWords}
            onComplete={(correctCount, mistakes) => {
              handleQuizComplete(correctCount, mistakes);
            }}
            onClose={() => setActiveQuizMode(null)}
          />
        )}

        {activeQuizMode === 'type-word' && (
          <TypeWordQuiz
            words={quizSessionWords}
            onComplete={(correctCount, mistakes) => {
              handleQuizComplete(correctCount, mistakes);
            }}
            onClose={() => setActiveQuizMode(null)}
          />
        )}

        {sessionResult && (
          <QuizResultModal
            quizType={sessionResult.quizType}
            totalQuestions={sessionResult.total}
            correctCount={sessionResult.correct}
            xpEarned={sessionResult.xpEarned}
            mistakes={sessionResult.mistakes}
            onContinue={() => {
              setSessionResult(null);
              setActiveQuizMode(null);
            }}
            onReviewMistakes={() => {
              if (sessionResult.mistakes.length > 0) {
                setQuizSessionWords(sessionResult.mistakes);
                setSessionResult(null);
              }
            }}
          />
        )}
      </MobileContainer>
    );
  }

  // Main Dashboard View with Bottom Navigation
  return (
    <MobileContainer>
      <HeaderBar
        progress={displayProgress}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddWord={() => setIsAddWordOpen(true)}
      />

      {activeTab === 'home' && (
        <HomeDashboard
          progress={displayProgress}
          reviewDueCount={dueCount}
          focusCategories={settings.focusCategories}
          onStartQuiz={handleStartQuiz}
          onStartReview={() => setActiveTab('review')}
          onOpenAddWord={() => setIsAddWordOpen(true)}
        />
      )}

      {activeTab === 'learn' && (
        <QuizSelection onSelectQuiz={handleStartQuiz} />
      )}

      {activeTab === 'review' && (
        <ReviewDashboard
          allWords={allWords}
          categories={categories}
          srsMap={srsMap}
          onUpdateSRS={handleUpdateSRS}
          onOpenAddWord={() => setIsAddWordOpen(true)}
          onDueListChanged={refreshDue}
        />
      )}

      {activeTab === 'stats' && (
        <StatsDashboard progress={displayProgress} />
      )}

      {activeTab === 'profile' && (
        <ProfileScreen
          progress={displayProgress}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={() => signOut()}
        />
      )}

      <BottomNav
        activeTab={activeTab}
        onChangeTab={setActiveTab}
        reviewDueCount={dueCount}
      />

      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          categories={categories}
          onUpdateSettings={handleUpdateSettings}
          onResetProgress={handleResetProgress}
          onClose={() => setIsSettingsOpen(false)}
          notificationPermission={notificationPermission}
          onRequestNotificationPermission={() => {
            void requestNotificationPermission();
          }}
          pushStatus={pushStatus}
        />
      )}

      {isLevelPickerOpen && (
        <LevelSelectModal
          initialLevel={settings.cefrLevel}
          onConfirm={(level) => {
            handleUpdateSettings({ cefrLevel: level });
            setIsLevelPickerOpen(false);
          }}
          onSkip={() => setIsLevelPickerOpen(false)}
        />
      )}

      <AddWordModal
        isOpen={isAddWordOpen}
        categories={categories}
        onClose={() => setIsAddWordOpen(false)}
        onAddWord={(w) => handleAddWords([w])}
        onAddWords={handleAddWords}
        onWordSynced={handleWordSynced}
      />

      {/* Hidden while the review tab is already open — the user is there. */}
      {activeReminder && activeTab !== 'review' && (
        <DueReminderToast
          items={activeReminder.items}
          onReview={() => {
            dismissReminder();
            openReview();
          }}
          onDismiss={dismissReminder}
        />
      )}
    </MobileContainer>
  );
}
