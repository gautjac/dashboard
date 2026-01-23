import { useState, useEffect, useCallback } from 'react';
import { googleCalendarService } from '../services/googleCalendar';
import { useDashboardStore } from '../store';
import type { CalendarEvent, CalendarInfo } from '../types';

interface CreateEventParams {
  calendarId?: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  allDay?: boolean;
  location?: string;
}

interface UseGoogleCalendarReturn {
  // State
  isConfigured: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  userEmail: string | null;
  calendars: CalendarInfo[];
  events: CalendarEvent[];

  // Actions
  signIn: () => Promise<boolean>;
  signOut: () => void;
  refreshEvents: () => Promise<void>;
  toggleCalendarSelection: (calendarId: string) => void;
  createEvent: (params: CreateEventParams) => Promise<CalendarEvent | null>;
}

export function useGoogleCalendar(): UseGoogleCalendarReturn {
  const { setCalendarEvents } = useDashboardStore();

  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [calendars, setCalendars] = useState<CalendarInfo[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedCalendarIds, setSelectedCalendarIds] = useState<string[]>([]);

  const isConfigured = googleCalendarService.isConfigured();

  // Initialize on mount
  useEffect(() => {
    if (!isConfigured) {
      setIsInitialized(true);
      return;
    }

    const init = async () => {
      try {
        await googleCalendarService.initialize();
        setIsInitialized(true);

        // Check if already authenticated
        if (googleCalendarService.isAuthenticated()) {
          setIsAuthenticated(true);
          // Load user data
          const email = await googleCalendarService.getUserEmail();
          setUserEmail(email);

          // Load calendars
          const calendarList = await googleCalendarService.getCalendarList();
          setCalendars(calendarList);

          // Set selected calendars
          const selected = calendarList
            .filter((c) => c.selected)
            .map((c) => c.id);
          setSelectedCalendarIds(selected.length > 0 ? selected : ['primary']);

          // Load today's events
          const todayEvents = await googleCalendarService.getTodayEvents(selected);
          setEvents(todayEvents);
          setCalendarEvents(todayEvents);
        }
      } catch (err) {
        console.error('Failed to initialize Google Calendar:', err);
        setError('Failed to initialize Google Calendar');
      }
    };

    init();
  }, [isConfigured, setCalendarEvents]);

  // Sign in handler
  const signIn = useCallback(async (): Promise<boolean> => {
    if (!isConfigured) {
      setError('Google Calendar is not configured. Please add VITE_GOOGLE_CLIENT_ID to your .env file.');
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      const success = await googleCalendarService.signIn();

      if (success) {
        setIsAuthenticated(true);

        // Load user data
        const email = await googleCalendarService.getUserEmail();
        setUserEmail(email);

        // Load calendars
        const calendarList = await googleCalendarService.getCalendarList();
        setCalendars(calendarList);

        // Set selected calendars
        const selected = calendarList
          .filter((c) => c.selected)
          .map((c) => c.id);
        setSelectedCalendarIds(selected.length > 0 ? selected : ['primary']);

        // Load today's events
        const todayEvents = await googleCalendarService.getTodayEvents(selected);
        setEvents(todayEvents);
        setCalendarEvents(todayEvents);

        return true;
      } else {
        setError('Sign in was cancelled or failed');
        return false;
      }
    } catch (err) {
      console.error('Sign in error:', err);
      setError('Failed to sign in to Google Calendar');
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isConfigured, setCalendarEvents]);

  // Sign out handler
  const signOut = useCallback(() => {
    googleCalendarService.signOut();
    setIsAuthenticated(false);
    setUserEmail(null);
    setCalendars([]);
    setEvents([]);
    setSelectedCalendarIds([]);
    setCalendarEvents([]);
  }, [setCalendarEvents]);

  // Refresh events
  const refreshEvents = useCallback(async () => {
    if (!isAuthenticated) return;

    setIsLoading(true);
    setError(null);

    try {
      const todayEvents = await googleCalendarService.getTodayEvents(
        selectedCalendarIds.length > 0 ? selectedCalendarIds : undefined
      );
      setEvents(todayEvents);
      setCalendarEvents(todayEvents);
    } catch (err) {
      console.error('Failed to refresh events:', err);
      setError('Failed to refresh calendar events');
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, selectedCalendarIds, setCalendarEvents]);

  // Toggle calendar selection
  const toggleCalendarSelection = useCallback(
    (calendarId: string) => {
      setSelectedCalendarIds((prev) => {
        const newSelection = prev.includes(calendarId)
          ? prev.filter((id) => id !== calendarId)
          : [...prev, calendarId];

        // Also update the calendars state
        setCalendars((cals) =>
          cals.map((cal) =>
            cal.id === calendarId ? { ...cal, selected: !cal.selected } : cal
          )
        );

        // Refresh events with new selection (debounced)
        setTimeout(async () => {
          try {
            const events = await googleCalendarService.getTodayEvents(newSelection);
            setEvents(events);
            setCalendarEvents(events);
          } catch (err) {
            console.error('Failed to refresh events:', err);
          }
        }, 300);

        return newSelection;
      });
    },
    [setCalendarEvents]
  );

  // Create a new event
  const createEvent = useCallback(
    async (params: CreateEventParams): Promise<CalendarEvent | null> => {
      if (!isAuthenticated) {
        setError('Not authenticated');
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const newEvent = await googleCalendarService.createEvent(params);

        // Refresh events to include the new one
        await refreshEvents();

        return newEvent;
      } catch (err) {
        console.error('Failed to create event:', err);
        setError(err instanceof Error ? err.message : 'Failed to create event');
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isAuthenticated, refreshEvents]
  );

  return {
    isConfigured,
    isInitialized,
    isAuthenticated,
    isLoading,
    error,
    userEmail,
    calendars,
    events,
    signIn,
    signOut,
    refreshEvents,
    toggleCalendarSelection,
    createEvent,
  };
}
