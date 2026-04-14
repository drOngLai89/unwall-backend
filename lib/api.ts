import type { DailyMission, DifficultyFeedback, LiveStats, PatternMap, Profile } from './types';

const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL;

async function postJson<T>(path: string, payload: unknown): Promise<T> {
  if (!API_BASE) {
    throw new Error('Missing EXPO_PUBLIC_API_BASE_URL');
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json().catch(() => null);

  if (!response.ok) {
    const message = json?.error || 'Request failed';
    throw new Error(message);
  }

  return json as T;
}

export async function createPatternMap(userId: string, profile: Profile) {
  return postJson<{ patternMap: PatternMap; mission: DailyMission }>('/v1/onboard', {
    userId,
    profile,
  });
}

export async function createMission(
  userId: string,
  profile: Profile,
  liveStats: LiveStats,
  lastFeedback: DifficultyFeedback
) {
  return postJson<{ mission: DailyMission }>('/v1/mission', {
    userId,
    profile,
    liveStats,
    lastFeedback,
  });
}
