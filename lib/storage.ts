import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import type { Snapshot } from './types';

const SNAPSHOT_KEY = 'unwall:snapshot';
const USER_KEY = 'unwall:user-id';

function createId() {
  return `uw_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export async function getOrCreateUserId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(USER_KEY);
  if (existing) return existing;

  const next = createId();
  await SecureStore.setItemAsync(USER_KEY, next);
  return next;
}

export async function loadSnapshot(): Promise<Partial<Snapshot> | null> {
  const raw = await AsyncStorage.getItem(SNAPSHOT_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Partial<Snapshot>;
  } catch {
    return null;
  }
}

export async function saveSnapshot(snapshot: Partial<Snapshot>) {
  await AsyncStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
}
