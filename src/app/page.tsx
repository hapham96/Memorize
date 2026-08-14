'use client';

import React, { useState, useEffect } from 'react';
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

import { AddWordModal } from '@/components/dashboard/AddWordModal';

import { VOCABULARY_DATASET } from '@/data/vocabulary';
import { INITIAL_ACHIEVEMENTS } from '@/data/achievements';
import {
  ActiveTab,
  QuizType,
  UserProgress,
  SRSData,
  Achievement,
  QuizSessionResult,
  Word,
} from '@/types';
import { ReviewQuality } from '@/types/word';
import { calculateNextSRS } from '@/lib/srs';
import { submitReview, mapReviewResponseToSRS } from '@/lib/api/word-client';
import {
  loadUserProgress,
  saveUserProgress,
  loadSRSData,
  saveSRSData,
  loadAchievements,
  saveAchievements,
  loadSettings,
  saveSettings,
  loadAllWords,
  loadCustomWords,
  saveCustomWords,
  AppSettings,
  DEFAULT_SETTINGS,
  DEFAULT_USER_PROGRESS,
} from '@/lib/storage';
import { createInitialSRS } from '@/lib/srs';
import { soundFX } from '@/lib/audio';

export default function Home() {
  const [isOnboarding, setIsOnboarding] = useState(true);
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
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // Load local storage on mount
    const loadedProgress = loadUserProgress();
    const loadedSRS = loadSRSData();
    const loadedAchievements = loadAchievements();
    const loadedSettings = loadSettings();
    const loadedWords = loadAllWords();

    setUserProgress(loadedProgress);
    setSrsMap(loadedSRS);
    setAchievements(loadedAchievements);
    setSettings(loadedSettings);
    setAllWords(loadedWords);

    // Apply dark mode class
    if (loadedSettings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }

    soundFX.setEnabled(loadedSettings.soundEnabled);
  }, []);

  // Filter word dataset according to user's focusCategories setting
  const focusCategories = settings.focusCategories || [];
  const activePool = (focusCategories.length > 0)
    ? allWords.filter((w) => focusCategories.includes(w.category))
    : allWords;

  // Calculate Due Words Count for Review Badge
  const now = new Date();
  const dueCount = activePool.filter((w) => {
    const srs = srsMap[w.id];
    if (!srs) return true;
    return new Date(srs.nextReviewDate) <= now || srs.state === 'learning';
  }).length;

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

    // Reward user with 20 XP per added custom word
    setUserProgress((prev) => {
      const updated = {
        ...prev,
        xp: prev.xp + newWords.length * 20,
        wordsLearned: prev.wordsLearned + newWords.length,
      };
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

    // Update User Progress
    const updatedProgress: UserProgress = {
      ...userProgress,
      xp: userProgress.xp + xpEarned,
      level: Math.floor((userProgress.xp + xpEarned) / 300) + 1,
      dailyGoalProgress: Math.min(
        userProgress.dailyGoal,
        userProgress.dailyGoalProgress + total
      ),
      wordsLearned: userProgress.wordsLearned + total,
      totalCorrect: userProgress.totalCorrect + correctCount,
      totalAttempted: userProgress.totalAttempted + total,
      history: [
        {
          id: `h_${Date.now()}`,
          timestamp: new Date().toISOString(),
          quizType: activeQuizMode?.replace('-', ' ') || 'Quiz',
          totalQuestions: total,
          correctCount,
          xpEarned,
        },
        ...userProgress.history,
      ],
    };

    setUserProgress(updatedProgress);
    saveUserProgress(updatedProgress);
  };

  const handleRateFlashcardWord = async (word: Word, rating: ReviewQuality) => {
    // Increment daily goal progress on flashcard view
    setUserProgress((prev) => {
      const updated = {
        ...prev,
        dailyGoalProgress: Math.min(prev.dailyGoal, prev.dailyGoalProgress + 1),
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
    localStorage.clear();
    setUserProgress(DEFAULT_USER_PROGRESS);
    setSrsMap({});
    setIsSettingsOpen(false);
    window.location.reload();
  };

  // Render Onboarding
  if (isOnboarding) {
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
          onLoginSuccess={(userName) => {
            setUserProgress((prev) => ({ ...prev, name: userName }));
            setIsAuth(false);
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
        progress={userProgress}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenAddWord={() => setIsAddWordOpen(true)}
      />

      {activeTab === 'home' && (
        <HomeDashboard
          progress={userProgress}
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
        <StatsDashboard progress={userProgress} />
      )}

      {activeTab === 'profile' && (
        <ProfileScreen
          progress={userProgress}
          achievements={achievements}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onLogout={() => setIsAuth(true)}
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
        />
      )}

      <AddWordModal
        isOpen={isAddWordOpen}
        onClose={() => setIsAddWordOpen(false)}
        onAddWord={(w) => handleAddWords([w])}
        onAddWords={handleAddWords}
      />
    </MobileContainer>
  );
}
