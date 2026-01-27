import { useMemo, useState } from 'react';
import { format, parseISO, isAfter, isBefore, addHours } from 'date-fns';
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  ExternalLink,
  RefreshCw,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useDashboardStore } from '../store';
import { useGoogleCalendar } from '../hooks/useGoogleCalendar';
import { useCollapsedState } from '../hooks/useCollapsedState';
import type { CalendarEvent } from '../types';

interface EventItemProps {
  event: CalendarEvent;
  isNow: boolean;
  isPast: boolean;
}

function EventItem({ event, isNow, isPast }: EventItemProps) {
  const startTime = parseISO(event.start);
  const endTime = parseISO(event.end);

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`
        relative p-3 rounded-lg transition-all duration-200
        ${isNow ? 'bg-terracotta-light/30 border border-terracotta/20' : ''}
        ${isPast && !isNow ? 'opacity-50' : ''}
        ${!isNow && !isPast ? 'hover:bg-warm-gray/50' : ''}
      `}
    >
      {/* Time indicator line */}
      <div
        className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
        style={{
          backgroundColor: isNow
            ? 'var(--color-terracotta)'
            : isPast
            ? 'var(--color-warm-gray-dark)'
            : event.color || 'var(--color-ink-faint)',
        }}
      />

      <div className="pl-4">
        {/* Time */}
        <div className="flex items-center gap-2 mb-1">
          <Clock className="w-3.5 h-3.5 text-ink-muted" />
          <span className="font-ui text-xs text-ink-muted">
            {event.allDay
              ? 'All day'
              : `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`}
          </span>
          {isNow && (
            <span className="badge badge-terracotta text-[10px] py-0.5 px-2">
              Now
            </span>
          )}
        </div>

        {/* Title */}
        <h4
          className={`font-ui font-medium text-sm ${
            isPast && !isNow ? 'text-ink-muted line-through' : 'text-ink'
          }`}
        >
          {event.title}
        </h4>

        {/* Location */}
        {event.location && (
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3 h-3 text-ink-faint" />
            <span className="font-ui text-xs text-ink-muted">
              {event.location}
            </span>
          </div>
        )}

        {/* Calendar name badge */}
        {event.calendarName && (
          <span
            className="inline-block mt-1.5 text-[10px] font-ui px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: `${event.color}20` || 'var(--color-warm-gray)',
              color: event.color || 'var(--color-ink-muted)',
            }}
          >
            {event.calendarName}
          </span>
        )}
      </div>
    </motion.div>
  );
}

interface NewEventFormProps {
  onSubmit: (params: {
    title: string;
    start: Date;
    end: Date;
    allDay: boolean;
    location?: string;
  }) => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

function NewEventForm({ onSubmit, onCancel, isLoading }: NewEventFormProps) {
  const now = new Date();
  const roundedNow = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours() + 1,
    0
  );

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(format(roundedNow, 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState(format(roundedNow, 'HH:mm'));
  const [endTime, setEndTime] = useState(format(addHours(roundedNow, 1), 'HH:mm'));
  const [allDay, setAllDay] = useState(false);
  const [location, setLocation] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const startDate = allDay
      ? new Date(`${date}T00:00:00`)
      : new Date(`${date}T${startTime}`);
    const endDate = allDay
      ? new Date(`${date}T23:59:59`)
      : new Date(`${date}T${endTime}`);

    await onSubmit({
      title: title.trim(),
      start: startDate,
      end: endDate,
      allDay,
      location: location.trim() || undefined,
    });
  };

  return (
    <motion.form
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      onSubmit={handleSubmit}
      className="bg-warm-gray/30 rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between">
        <h4 className="font-ui text-sm font-medium text-ink">New Event</h4>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded hover:bg-warm-gray"
        >
          <X className="w-4 h-4 text-ink-muted" />
        </button>
      </div>

      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Event title"
        className="input w-full text-sm"
        autoFocus
        required
      />

      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="input flex-1 text-sm"
          required
        />
        <label className="flex items-center gap-2 font-ui text-sm text-ink-muted whitespace-nowrap">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="checkbox-custom"
          />
          All day
        </label>
      </div>

      {!allDay && (
        <div className="flex items-center gap-2">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input flex-1 text-sm"
            required
          />
          <span className="text-ink-muted">to</span>
          <input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="input flex-1 text-sm"
            required
          />
        </div>
      )}

      <input
        type="text"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Location (optional)"
        className="input w-full text-sm"
      />

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary text-sm py-2"
          disabled={isLoading}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary text-sm py-2"
          disabled={isLoading || !title.trim()}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Event'
          )}
        </button>
      </div>
    </motion.form>
  );
}

function FreeBlock({ start, end }: { start: Date; end: Date }) {
  const duration = Math.round((end.getTime() - start.getTime()) / (1000 * 60));

  if (duration < 30) return null;

  const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}min`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-3 rounded-lg border border-dashed border-sage/40 bg-sage-light/20"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-sage" />
          <span className="font-ui text-xs text-sage-dark">
            Free block
          </span>
        </div>
        <span className="font-ui text-xs font-medium text-sage-dark">
          {formatDuration(duration)}
        </span>
      </div>
      <p className="font-ui text-xs text-ink-muted mt-1 pl-3.5">
        {format(start, 'h:mm a')} - {format(end, 'h:mm a')}
      </p>
    </motion.div>
  );
}

export function CalendarWidget() {
  const { getTodayEvents, setSettingsOpen } = useDashboardStore();
  const {
    isConfigured,
    isAuthenticated,
    isLoading,
    events: googleEvents,
    signIn,
    refreshEvents,
    createEvent,
  } = useGoogleCalendar();

  const [showNewEventForm, setShowNewEventForm] = useState(false);
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedState('calendar');

  // Use Google events if authenticated, otherwise use store events (sample data)
  const events = isAuthenticated ? googleEvents : getTodayEvents();
  const now = new Date();

  // Sort events by start time
  const sortedEvents = useMemo(() => {
    return [...events].sort(
      (a, b) => parseISO(a.start).getTime() - parseISO(b.start).getTime()
    );
  }, [events]);

  // Find current event
  const currentEventIndex = useMemo(() => {
    return sortedEvents.findIndex((event) => {
      const start = parseISO(event.start);
      const end = parseISO(event.end);
      return isAfter(now, start) && isBefore(now, end);
    });
  }, [sortedEvents, now]);

  // Calculate free blocks
  const scheduleWithFreeBlocks = useMemo(() => {
    if (sortedEvents.length === 0) return [];

    const items: Array<
      | { type: 'event'; event: CalendarEvent }
      | { type: 'free'; start: Date; end: Date }
    > = [];

    sortedEvents.forEach((event, index) => {
      // Add free block before this event if there's a gap
      if (index > 0) {
        const prevEnd = parseISO(sortedEvents[index - 1].end);
        const thisStart = parseISO(event.start);
        const gap = thisStart.getTime() - prevEnd.getTime();

        if (gap >= 30 * 60 * 1000) {
          // 30+ minutes gap
          items.push({ type: 'free', start: prevEnd, end: thisStart });
        }
      }

      items.push({ type: 'event', event });
    });

    return items;
  }, [sortedEvents]);

  const handleConnectClick = async () => {
    if (isConfigured) {
      await signIn();
    } else {
      setSettingsOpen(true);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2, duration: 0.4 }}
      className="card p-5"
    >
      {/* Header */}
      <div className={`flex items-center justify-between ${!isCollapsed ? 'mb-4' : ''}`}>
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-2 hover:opacity-70 transition-opacity"
        >
          <motion.div
            animate={{ rotate: isCollapsed ? 0 : 90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-5 h-5 text-ink-muted" />
          </motion.div>
          <Calendar className="w-5 h-5 text-ink-muted" />
          <h3 className="font-display text-xl font-semibold text-ink">
            Today's Schedule
          </h3>
          {isCollapsed && events.length > 0 && (
            <span className="font-ui text-sm text-ink-muted">
              ({events.length} event{events.length !== 1 ? 's' : ''})
            </span>
          )}
        </button>
        <div className="flex items-center gap-1">
          {isAuthenticated && (
            <>
              <button
                onClick={() => setShowNewEventForm(true)}
                disabled={isLoading || showNewEventForm}
                className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-terracotta disabled:opacity-50"
                title="Add event"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={refreshEvents}
                disabled={isLoading}
                className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink disabled:opacity-50"
                title="Refresh events"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </>
          )}
          <button
            className="btn-ghost p-1.5 rounded-lg text-ink-muted hover:text-ink"
            title="Open in Google Calendar"
            onClick={() => window.open('https://calendar.google.com', '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {/* New Event Form */}
            <AnimatePresence>
              {showNewEventForm && (
                <div className="mb-4">
                  <NewEventForm
                    onSubmit={async (params) => {
                      await createEvent(params);
                      setShowNewEventForm(false);
                    }}
                    onCancel={() => setShowNewEventForm(false)}
                    isLoading={isLoading}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Not connected state */}
            {!isAuthenticated && events.length === 0 ? (
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-warm-gray flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-ink-muted" />
                </div>
                <p className="font-ui text-sm text-ink-muted mb-4">
                  Connect your calendar to see today's events
                </p>
                <button
                  onClick={handleConnectClick}
                  disabled={isLoading}
                  className="btn btn-secondary text-sm disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    'Connect Google Calendar'
                  )}
                </button>
              </div>
            ) : events.length === 0 ? (
              // No events today (but connected)
              <div className="py-8 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-sage-light/50 flex items-center justify-center">
                  <Calendar className="w-6 h-6 text-sage-dark" />
                </div>
                <p className="font-display text-lg text-ink">Clear day ahead</p>
                <p className="font-ui text-sm text-ink-muted mt-1">
                  No scheduled events
                </p>
              </div>
            ) : (
              // Events list
              <div className="space-y-2">
                {scheduleWithFreeBlocks.map((item, index) => {
                  if (item.type === 'free') {
                    return (
                      <FreeBlock
                        key={`free-${index}`}
                        start={item.start}
                        end={item.end}
                      />
                    );
                  }

                  const eventIndex = sortedEvents.findIndex(
                    (e) => e.id === item.event.id
                  );
                  const isPast =
                    eventIndex < currentEventIndex ||
                    (currentEventIndex === -1 &&
                      isBefore(parseISO(item.event.end), now));
                  const isNow = eventIndex === currentEventIndex;

                  return (
                    <EventItem
                      key={item.event.id}
                      event={item.event}
                      isNow={isNow}
                      isPast={isPast}
                    />
                  );
                })}
              </div>
            )}

            {/* Connection status indicator */}
            {isAuthenticated && (
              <div className="mt-4 pt-3 border-t border-warm-gray/50">
                <div className="flex items-center justify-between">
                  <span className="font-ui text-xs text-sage-dark flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-sage" />
                    Connected to Google Calendar
                  </span>
                  {events.length > 5 && (
                    <button className="flex items-center gap-1 font-ui text-xs text-ink-muted hover:text-ink transition-colors">
                      View all
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Sample data indicator */}
            {!isAuthenticated && events.length > 0 && (
              <div className="mt-4 pt-3 border-t border-warm-gray/50">
                <button
                  onClick={handleConnectClick}
                  className="w-full flex items-center justify-center gap-2 py-2 text-ink-muted hover:text-ink font-ui text-sm transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  Connect real calendar
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
