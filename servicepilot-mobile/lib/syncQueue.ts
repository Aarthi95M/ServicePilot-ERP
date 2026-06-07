// lib/syncQueue.ts
// Flushes the offline queue when connectivity is restored.
// Called from _layout.tsx on every network reconnect event.

import { getQueue, removeFromQueue } from './offlineQueue';
import { attendanceApi } from './api/attendance';
import { leaveApi }      from './api/leave';
import { overtimeApi }   from './api/overtime';

let isFlushing = false;

export async function flushOfflineQueue(): Promise<number> {
  if (isFlushing) return 0;
  isFlushing = true;
  let synced = 0;

  try {
    const queue = await getQueue();
    for (const action of queue) {
      try {
        switch (action.type) {

          case 'checkin':
            await attendanceApi.checkIn({
              ...action.payload,
              isOfflineSync:       true,
              checkInTimeOverride: action.timestamp,
            });
            break;

          case 'checkout':
            await attendanceApi.checkOut({
              ...action.payload,
              isOfflineSync:        true,
              checkOutTimeOverride: action.timestamp,
            });
            break;

          case 'leave':
            await leaveApi.create(action.payload as any);
            break;

          case 'overtime':
            await overtimeApi.create(action.payload as any);
            break;
        }

        await removeFromQueue(action.id);
        synced++;
      } catch {
        // Leave failed action in queue — try again next time
      }
    }
  } finally {
    isFlushing = false;
  }

  return synced;
}
