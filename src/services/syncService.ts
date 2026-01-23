/**
 * Sync Service
 * Handles synchronization between local state and Neon database
 */

const API_BASE = import.meta.env.DEV
  ? 'http://localhost:8888/.netlify/functions'
  : '/.netlify/functions';

interface SyncData {
  habits: unknown[];
  habitCompletions: unknown[];
  journalEntries: unknown[];
  focusLines: unknown[];
  settings: unknown;
  interestAreas: unknown[];
}

interface SyncResponse extends SyncData {
  syncedAt: string;
}

class SyncService {
  private userId: string | null = null;
  private syncInProgress = false;
  private lastSyncedAt: string | null = null;
  private syncQueue: (() => Promise<void>)[] = [];

  setUserId(userId: string | null) {
    this.userId = userId;
    if (userId) {
      // Store in localStorage for persistence
      localStorage.setItem('dashboard_user_id', userId);
    } else {
      localStorage.removeItem('dashboard_user_id');
    }
  }

  getUserId(): string | null {
    if (!this.userId) {
      this.userId = localStorage.getItem('dashboard_user_id');
    }
    return this.userId;
  }

  /**
   * Initialize the database schema (call once during setup)
   */
  async initializeDatabase(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/init-db`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch (error) {
      console.error('Failed to initialize database:', error);
      return false;
    }
  }

  /**
   * Fetch all data from the server
   */
  async fetchFromServer(): Promise<SyncResponse | null> {
    const userId = this.getUserId();
    if (!userId) {
      console.warn('No user ID set, cannot fetch from server');
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/sync?userId=${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      this.lastSyncedAt = data.syncedAt;
      return data;
    } catch (error) {
      console.error('Failed to fetch from server:', error);
      return null;
    }
  }

  /**
   * Push local data to the server
   */
  async pushToServer(data: Partial<SyncData>): Promise<boolean> {
    const userId = this.getUserId();
    if (!userId) {
      console.warn('No user ID set, cannot push to server');
      return false;
    }

    // Prevent concurrent syncs
    if (this.syncInProgress) {
      // Queue the sync
      return new Promise((resolve) => {
        this.syncQueue.push(async () => {
          const result = await this.pushToServer(data);
          resolve(result);
        });
      });
    }

    this.syncInProgress = true;

    try {
      const response = await fetch(`${API_BASE}/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          ...data,
          lastSyncedAt: this.lastSyncedAt,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const result = await response.json();
      this.lastSyncedAt = result.syncedAt;
      return true;
    } catch (error) {
      console.error('Failed to push to server:', error);
      return false;
    } finally {
      this.syncInProgress = false;

      // Process queued syncs
      if (this.syncQueue.length > 0) {
        const nextSync = this.syncQueue.shift();
        if (nextSync) nextSync();
      }
    }
  }

  /**
   * Full sync: fetch from server and merge with local data
   */
  async fullSync(localData: SyncData): Promise<SyncData | null> {
    const userId = this.getUserId();
    if (!userId) {
      console.warn('No user ID set, cannot sync');
      return null;
    }

    // First, push local changes
    await this.pushToServer(localData);

    // Then fetch the merged result
    const serverData = await this.fetchFromServer();
    return serverData;
  }

  /**
   * Check if sync is available (user is logged in and has ID)
   */
  isSyncEnabled(): boolean {
    return this.getUserId() !== null;
  }

  getLastSyncedAt(): string | null {
    return this.lastSyncedAt;
  }
}

export const syncService = new SyncService();
