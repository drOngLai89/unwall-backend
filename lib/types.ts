export type DifficultyFeedback = 'too_easy' | 'right' | 'too_hard';

export type Profile = {
  identity: string;
  focusArea: string;
  struggle: string;
  trigger: string;
  supportStyle: string;
  energyWindow: string;
};

export type KpiMetric = {
  label: string;
  score: number;
  target: number;
  unit: string;
  caption: string;
  points: number[];
};

export type PatternMap = {
  headline: string;
  traits: string[];
  riskMoments: string[];
  leveragePoints: string[];
  nextShift: string;
  baselineMetrics: KpiMetric[];
};

export type DailyMission = {
  missionTitle: string;
  missionSubtitle: string;
  whyItWorks: string;
  microSteps: string[];
  rewardCue: string;
  evidenceNote: string;
};

export type LiveStats = {
  streakDays: number;
  completedMissions: number;
  totalAttempts: number;
  frictionFit: number;
  identityScore: number;
  history: number[];
};

export type Snapshot = {
  profile: Profile | null;
  patternMap: PatternMap | null;
  mission: DailyMission | null;
  pro: boolean;
  liveStats: LiveStats;
  lastFeedback: DifficultyFeedback;
};
