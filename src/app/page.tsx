'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { MobileContainer } from '@/components/layout/MobileContainer';
import { HeaderBar } from '@/components/layout/HeaderBar';
import { BottomNav } from '@/components/layout/BottomNav';
import { OnboardingScreen } from '@/components/auth/OnboardingScreen';
import { AuthScreen } from '@/components/auth/AuthScreen';
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
import { getCurrentSession, getDisplayName, logout } from '@/lib/api/auth-client';
import { AuthSession } from '@/types/auth';
import {
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
import { computeAchievements } from '@/lib/achievements';
import { useDueReminders } from '@/hooks/useDueReminders';
import { usePushSubscription } from '@/hooks/usePushSubscription';

export default function Home() {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isAuth, setIsAuth] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [activeQuizMode, setActiveQuizMode] = useState<QuizType | null>(null);
  const [quizSessionWords, setQuizSessionWords] = useState<Word[]>([]);
  const [sessionResult, setSessionResult] = useState<QuizSessionResult | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isAddWordOpen, setIsAddWordOpen] = useState(false);

  // App Persistent State
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress>(DEFAULT_USER_PROGRESS);
  const [srsMap, setSrsMap] = useState<Record<string, SRSData>>({});
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isMounted, setIsMounted] = useState(false);

  /**
   * Loads the state belonging to `activeSession`. Storage is scoped by user id
   * first, so one account never reads another's progress, and identity fields
   * always come from the API session rather than whatever was stored earlier.
   */
  const loadAccountState = (activeSession: AuthSession | null, displayName?: string) => {
    setStorageScope(activeSession?.userId ?? null);
    setSession(activeSession);
    // Sign-in and sign-out both land here; the previous account's due list must
    // not answer for the new one.
    invalidateDueReviews();

    const loadedSettings = loadSettings();
    const loadedSRS = loadSRSData();
    const loadedWords = loadAllWords();
    let loadedProgress = applyDailyRollover(loadUserProgress());

    if (activeSession) {
      const name =
        displayName?.trim() ||
        (loadedProgress.name && loadedProgress.name !== DEFAULT_USER_PROGRESS.name
          ? loadedProgress.name
          : getDisplayName(activeSession));

      loadedProgress = {
        ...loadedProgress,
        name,
        email: activeSession.email,
        userId: activeSession.userId,
        avatar: generateAvatar(name || activeSession.email),
      };
    } else if (displayName?.trim()) {
      // Continuing without an account still keeps the name the user typed.
      loadedProgress = {
        ...loadedProgress,
        name: displayName.trim(),
        avatar: generateAvatar(displayName.trim()),
      };
    }

    setUserProgress(loadedProgress);
    saveUserProgress(loadedProgress);
    setSrsMap(loadedSRS);
    setSettings(loadedSettings);
    setAllWords(loadedWords);

    if (loadedSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    soundFX.setEnabled(loadedSettings.soundEnabled);

    if (activeSession) {
      hydrateFromApi(loadedWords);
    }
  };

  /**
   * Pulls the account's real word state from the backend and folds it into the
   * local SRS map. Failure is non-fatal — local data stays authoritative.
   */
  const hydrateFromApi = async (words: Word[]) => {
    try {
      const userWords = await getDueReviews();
      if (!Array.isArray(userWords) || userWords.length === 0) return;

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
      console.warn('Could not hydrate progress from API, using local data:', err);
    }
  };

  useEffect(() => {
    const existingSession = getCurrentSession();
    // Onboarding is for people who have not signed in yet.
    setIsOnboarding(!existingSession);
    loadAccountState(existingSession);
    setIsMounted(true);
  }, []);

  // Everything derivable is recomputed here, so the UI can never render a
  // counter that drifted away from the SRS map, the XP total or the settings.
  const displayProgress = deriveProgress(userProgress, srsMap, settings.dailyGoal);
  const displayAchievements = computeAchievements(displayProgress, srsMap);

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

  // Calculate Due Words Count for Review Badge
  const now = new Date();
  const dueCount = activePool.filter((w) => {
    const srs = srsMap[w.id];
    if (!srs) return true;
    return new Date(srs.nextReviewDate) <= now || srs.state === 'learning';
  }).length;

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

  const { pushStatus } = usePushSubscription({
    isReady: isMounted,
    enabled: settings.notifications,
    permission: notificationPermission,
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

  // Render Onboarding — only for visitors who have not signed in yet
  if (isOnboarding && !session) {
    return (
      <MobileContainer>
        <OnboardingScreen
          onComplete={() => setIsOnboarding(false)}
          onGoToAuth={() => {
            setIsOnboarding(false);
            setIsAuth(true);
          }}
        />
      </MobileContainer>
    );
  }

  // Render Auth Screen
  if (isAuth) {
    return (
      <MobileContainer>
        <AuthScreen
          onLoginSuccess={(newSession, displayName) => {
            // Swap to the account's own scoped state before rendering anything.
            loadAccountState(newSession, displayName);
            setIsOnboarding(false);
            setIsAuth(false);
            setActiveTab('home');
          }}
          onBack={() => setIsAuth(false)}
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
          srsMap={srsMap}
          onUpdateSRS={handleUpdateSRS}
          onOpenAddWord={() => setIsAddWordOpen(true)}
        />
      )}

      {activeTab === 'stats' && (
        <StatsDashboard progress={displayProgress} />
      )}

      {activeTab === 'profile' && (
        <ProfileScreen
          progress={displayProgress}
          achievements={displayAchievements}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={() => {
            logout();
            // Drop back to the signed-out demo scope so no account data lingers on screen.
            loadAccountState(null);
            setIsAuth(true);
          }}
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

      <AddWordModal
        isOpen={isAddWordOpen}
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
