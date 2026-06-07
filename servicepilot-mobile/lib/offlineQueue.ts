// lib/offlineQueue.ts
// Persistent queue for actions taken while the device is offline.
// Uses AsyncStorage so the queue survives app restarts.

import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = '@sp_offline_queue';

export type QueuedActionType = 'checkin' | 'checkout' | 'leave' | 'overtime';

export interface QueuedAction {
  id:        string;               // unique id — Date.now() + random suffix
  type:      QueuedActionType;
  payload:   Record<string, any>;
  timestamp: string;               // ISO — real time the action happened on device
}

export async function enqueueAction(
  action: Omit<QueuedAction, 'id'>
): Promise<void> {
  const queue = await getQueue();
  const entry: QueuedAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  };
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify([...queue, entry]));
}

export async function getQueue(): Promise<QueuedAction[]> {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  await AsyncStorage.setItem(
    QUEUE_KEY,
    JSON.stringify(queue.filter(a => a.id !== id))
  );
}

export async function getQueueLength(): Promise<number> {
  return (await getQueue()).length;
}
