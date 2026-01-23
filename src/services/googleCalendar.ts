/**
 * Google Calendar Integration Service
 *
 * Uses Google Identity Services (GIS) for OAuth 2.0 authentication
 * and Google Calendar API for fetching events.
 *
 * Setup Instructions:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create a new project or select existing
 * 3. Enable the Google Calendar API
 * 4. Configure OAuth consent screen
 * 5. Create OAuth 2.0 credentials (Web application)
 * 6. Add http://localhost:5173 and http://localhost:5174 to authorized origins
 * 7. Copy the Client ID to your .env file as VITE_GOOGLE_CLIENT_ID
 */

import { startOfDay, endOfDay, addDays } from 'date-fns';
import type { CalendarEvent, CalendarInfo } from '../types';

// Google API configuration
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';

// Types for Google API responses
interface GoogleCalendarEvent {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  colorId?: string;
}

interface GoogleCalendarList {
  id: string;
  summary: string;
  backgroundColor?: string;
  primary?: boolean;
  selected?: boolean;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

// Color mapping for calendar events
const CALENDAR_COLORS: Record<string, string> = {
  '1': '#7986CB', // Lavender
  '2': '#33B679', // Sage
  '3': '#8E24AA', // Grape
  '4': '#E67C73', // Flamingo
  '5': '#F6BF26', // Banana
  '6': '#F4511E', // Tangerine
  '7': '#039BE5', // Peacock
  '8': '#616161', // Graphite
  '9': '#3F51B5', // Blueberry
  '10': '#0B8043', // Basil
  '11': '#D50000', // Tomato
};

class GoogleCalendarService {
  private clientId: string;
  private tokenClient: google.accounts.oauth2.TokenClient | null = null;
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;
  private gapiInitialized = false;
  private gisInitialized = false;

  constructor() {
    this.clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  }

  /**
   * Check if Google Client ID is configured
   */
  isConfigured(): boolean {
    return Boolean(this.clientId);
  }

  /**
   * Initialize the Google API client library
   */
  async initializeGapiClient(): Promise<void> {
    if (this.gapiInitialized) return;

    return new Promise((resolve, reject) => {
      // Load gapi script if not present
      if (!window.gapi) {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.async = true;
        script.defer = true;
        script.onload = () => this.loadGapiClient(resolve, reject);
        script.onerror = () => reject(new Error('Failed to load Google API script'));
        document.head.appendChild(script);
      } else {
        this.loadGapiClient(resolve, reject);
      }
    });
  }

  private loadGapiClient(resolve: () => void, reject: (err: Error) => void): void {
    window.gapi.load('client', async () => {
      try {
        await window.gapi.client.init({
          discoveryDocs: [DISCOVERY_DOC],
        });
        this.gapiInitialized = true;
        resolve();
      } catch (error) {
        reject(error as Error);
      }
    });
  }

  /**
   * Initialize Google Identity Services
   */
  async initializeGisClient(): Promise<void> {
    if (this.gisInitialized) return;

    return new Promise((resolve, reject) => {
      // Load GIS script if not present
      if (!window.google?.accounts?.oauth2) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.createTokenClient(resolve, reject);
        };
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        this.createTokenClient(resolve, reject);
      }
    });
  }

  private createTokenClient(resolve: () => void, reject: (err: Error) => void): void {
    try {
      this.tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: this.clientId,
        scope: SCOPES,
        callback: (response: TokenResponse) => {
          if (response.access_token) {
            this.accessToken = response.access_token;
            this.tokenExpiry = Date.now() + response.expires_in * 1000;
            // Store in localStorage for persistence
            localStorage.setItem('gcal_access_token', response.access_token);
            localStorage.setItem('gcal_token_expiry', String(this.tokenExpiry));
          }
        },
      });
      this.gisInitialized = true;

      // Check for existing token
      const storedToken = localStorage.getItem('gcal_access_token');
      const storedExpiry = localStorage.getItem('gcal_token_expiry');
      if (storedToken && storedExpiry) {
        const expiry = parseInt(storedExpiry, 10);
        if (expiry > Date.now()) {
          this.accessToken = storedToken;
          this.tokenExpiry = expiry;
        } else {
          // Clear expired token
          localStorage.removeItem('gcal_access_token');
          localStorage.removeItem('gcal_token_expiry');
        }
      }

      resolve();
    } catch (error) {
      reject(error as Error);
    }
  }

  /**
   * Initialize both GAPI and GIS
   */
  async initialize(): Promise<void> {
    if (!this.isConfigured()) {
      console.warn('Google Calendar: Client ID not configured');
      return;
    }

    await Promise.all([
      this.initializeGapiClient(),
      this.initializeGisClient(),
    ]);
  }

  /**
   * Check if user is currently authenticated
   */
  isAuthenticated(): boolean {
    return Boolean(this.accessToken && this.tokenExpiry && this.tokenExpiry > Date.now());
  }

  /**
   * Trigger the OAuth sign-in flow
   */
  async signIn(): Promise<boolean> {
    if (!this.tokenClient) {
      await this.initialize();
    }

    return new Promise((resolve) => {
      if (!this.tokenClient) {
        resolve(false);
        return;
      }

      // Override callback to resolve promise
      this.tokenClient.callback = (response: TokenResponse) => {
        if (response.access_token) {
          this.accessToken = response.access_token;
          this.tokenExpiry = Date.now() + response.expires_in * 1000;
          localStorage.setItem('gcal_access_token', response.access_token);
          localStorage.setItem('gcal_token_expiry', String(this.tokenExpiry));
          resolve(true);
        } else {
          resolve(false);
        }
      };

      // Request access token
      if (this.accessToken) {
        // Token exists, request with prompt: ''
        this.tokenClient.requestAccessToken({ prompt: '' });
      } else {
        // No token, request with consent
        this.tokenClient.requestAccessToken({ prompt: 'consent' });
      }
    });
  }

  /**
   * Sign out and revoke access
   */
  signOut(): void {
    if (this.accessToken) {
      window.google.accounts.oauth2.revoke(this.accessToken, () => {
        console.log('Google Calendar: Access revoked');
      });
    }
    this.accessToken = null;
    this.tokenExpiry = null;
    localStorage.removeItem('gcal_access_token');
    localStorage.removeItem('gcal_token_expiry');
    localStorage.removeItem('gcal_user_email');
  }

  /**
   * Get the user's email from their profile
   */
  async getUserEmail(): Promise<string | null> {
    if (!this.isAuthenticated()) return null;

    try {
      const response = await fetch(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );
      const data = await response.json();
      if (data.email) {
        localStorage.setItem('gcal_user_email', data.email);
        return data.email;
      }
      return null;
    } catch (error) {
      console.error('Failed to get user email:', error);
      return localStorage.getItem('gcal_user_email');
    }
  }

  /**
   * Get list of user's calendars
   */
  async getCalendarList(): Promise<CalendarInfo[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      const calendars: CalendarInfo[] = (data.items || []).map(
        (cal: GoogleCalendarList) => ({
          id: cal.id,
          name: cal.summary,
          color: cal.backgroundColor || '#4285F4',
          selected: cal.selected ?? cal.primary ?? false,
        })
      );

      return calendars;
    } catch (error) {
      console.error('Failed to fetch calendar list:', error);
      throw error;
    }
  }

  /**
   * Fetch events for a specific date range
   */
  async getEvents(
    calendarIds: string[],
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const allEvents: CalendarEvent[] = [];
    const timeMin = startOfDay(startDate).toISOString();
    const timeMax = endOfDay(endDate).toISOString();

    for (const calendarId of calendarIds) {
      try {
        const params = new URLSearchParams({
          timeMin,
          timeMax,
          singleEvents: 'true',
          orderBy: 'startTime',
          maxResults: '50',
        });

        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
            calendarId
          )}/events?${params}`,
          {
            headers: {
              Authorization: `Bearer ${this.accessToken}`,
            },
          }
        );

        if (!response.ok) {
          console.warn(`Failed to fetch events for calendar ${calendarId}`);
          continue;
        }

        const data = await response.json();
        const calendarList = await this.getCalendarList();
        const calendarInfo = calendarList.find((c) => c.id === calendarId);

        const events: CalendarEvent[] = (data.items || [])
          .filter((event: GoogleCalendarEvent) => event.start)
          .map((event: GoogleCalendarEvent) => {
            const isAllDay = Boolean(event.start?.date);
            const start = event.start?.dateTime || `${event.start?.date}T00:00:00`;
            const end = event.end?.dateTime || `${event.end?.date}T23:59:59`;

            return {
              id: event.id,
              title: event.summary || '(No title)',
              description: event.description,
              start,
              end,
              allDay: isAllDay,
              location: event.location,
              calendarId,
              calendarName: calendarInfo?.name || 'Calendar',
              color:
                CALENDAR_COLORS[event.colorId || ''] ||
                calendarInfo?.color ||
                '#4285F4',
            };
          });

        allEvents.push(...events);
      } catch (error) {
        console.error(`Error fetching events for calendar ${calendarId}:`, error);
      }
    }

    // Sort by start time
    allEvents.sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
    );

    return allEvents;
  }

  /**
   * Get today's events from all selected calendars
   */
  async getTodayEvents(selectedCalendarIds?: string[]): Promise<CalendarEvent[]> {
    const today = new Date();

    let calendarIds = selectedCalendarIds;
    if (!calendarIds || calendarIds.length === 0) {
      const calendars = await this.getCalendarList();
      calendarIds = calendars.filter((c) => c.selected).map((c) => c.id);

      // If no calendars are selected, use primary
      if (calendarIds.length === 0) {
        calendarIds = ['primary'];
      }
    }

    return this.getEvents(calendarIds, today, today);
  }

  /**
   * Get events for the next N days
   */
  async getUpcomingEvents(
    days: number = 7,
    selectedCalendarIds?: string[]
  ): Promise<CalendarEvent[]> {
    const today = new Date();
    const endDate = addDays(today, days);

    let calendarIds = selectedCalendarIds;
    if (!calendarIds || calendarIds.length === 0) {
      const calendars = await this.getCalendarList();
      calendarIds = calendars.filter((c) => c.selected).map((c) => c.id);

      if (calendarIds.length === 0) {
        calendarIds = ['primary'];
      }
    }

    return this.getEvents(calendarIds, today, endDate);
  }

  /**
   * Create a new calendar event
   */
  async createEvent(params: {
    calendarId?: string;
    title: string;
    description?: string;
    start: Date;
    end: Date;
    allDay?: boolean;
    location?: string;
  }): Promise<CalendarEvent> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const calendarId = params.calendarId || 'primary';

    // Format start/end based on all-day or timed event
    const eventBody: Record<string, unknown> = {
      summary: params.title,
      description: params.description,
      location: params.location,
    };

    if (params.allDay) {
      // All-day events use date format (YYYY-MM-DD)
      eventBody.start = {
        date: params.start.toISOString().split('T')[0],
      };
      eventBody.end = {
        date: params.end.toISOString().split('T')[0],
      };
    } else {
      // Timed events use dateTime format
      eventBody.start = {
        dateTime: params.start.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
      eventBody.end = {
        dateTime: params.end.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      };
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
          calendarId
        )}/events`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(eventBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `Failed to create event: ${response.status}`);
      }

      const event: GoogleCalendarEvent = await response.json();
      const calendarList = await this.getCalendarList();
      const calendarInfo = calendarList.find((c) => c.id === calendarId);

      return {
        id: event.id,
        title: event.summary || params.title,
        description: event.description,
        start: event.start?.dateTime || `${event.start?.date}T00:00:00`,
        end: event.end?.dateTime || `${event.end?.date}T23:59:59`,
        allDay: Boolean(event.start?.date),
        location: event.location,
        calendarId,
        calendarName: calendarInfo?.name || 'Calendar',
        color: calendarInfo?.color || '#4285F4',
      };
    } catch (error) {
      console.error('Failed to create calendar event:', error);
      throw error;
    }
  }

  /**
   * Delete a calendar event
   */
  async deleteEvent(calendarId: string, eventId: string): Promise<void> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        calendarId
      )}/events/${encodeURIComponent(eventId)}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 204) {
      throw new Error(`Failed to delete event: ${response.status}`);
    }
  }

  /**
   * Update an existing calendar event
   */
  async updateEvent(params: {
    calendarId: string;
    eventId: string;
    title?: string;
    description?: string;
    start?: Date;
    end?: Date;
    allDay?: boolean;
    location?: string;
  }): Promise<CalendarEvent> {
    if (!this.isAuthenticated()) {
      throw new Error('Not authenticated');
    }

    const eventBody: Record<string, unknown> = {};

    if (params.title !== undefined) eventBody.summary = params.title;
    if (params.description !== undefined) eventBody.description = params.description;
    if (params.location !== undefined) eventBody.location = params.location;

    if (params.start && params.end) {
      if (params.allDay) {
        eventBody.start = { date: params.start.toISOString().split('T')[0] };
        eventBody.end = { date: params.end.toISOString().split('T')[0] };
      } else {
        const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        eventBody.start = { dateTime: params.start.toISOString(), timeZone };
        eventBody.end = { dateTime: params.end.toISOString(), timeZone };
      }
    }

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
        params.calendarId
      )}/events/${encodeURIComponent(params.eventId)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventBody),
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to update event: ${response.status}`);
    }

    const event: GoogleCalendarEvent = await response.json();
    const calendarList = await this.getCalendarList();
    const calendarInfo = calendarList.find((c) => c.id === params.calendarId);

    return {
      id: event.id,
      title: event.summary || '',
      description: event.description,
      start: event.start?.dateTime || `${event.start?.date}T00:00:00`,
      end: event.end?.dateTime || `${event.end?.date}T23:59:59`,
      allDay: Boolean(event.start?.date),
      location: event.location,
      calendarId: params.calendarId,
      calendarName: calendarInfo?.name || 'Calendar',
      color: calendarInfo?.color || '#4285F4',
    };
  }
}

// Export singleton instance
export const googleCalendarService = new GoogleCalendarService();

// Type declarations for Google APIs
declare global {
  interface Window {
    gapi: {
      load: (api: string, callback: () => void) => void;
      client: {
        init: (config: { discoveryDocs: string[] }) => Promise<void>;
        calendar: {
          events: {
            list: (params: Record<string, string>) => Promise<{ result: { items: GoogleCalendarEvent[] } }>;
          };
          calendarList: {
            list: () => Promise<{ result: { items: GoogleCalendarList[] } }>;
          };
        };
      };
    };
    google: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: TokenResponse) => void;
          }) => google.accounts.oauth2.TokenClient;
          revoke: (token: string, callback: () => void) => void;
        };
      };
    };
  }
}

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    callback: (response: TokenResponse) => void;
    requestAccessToken: (config?: { prompt?: string }) => void;
  }
}
