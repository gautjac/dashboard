import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  parseISO,
} from 'date-fns';
import { X, ChevronLeft, ChevronRight, Smile, Meh, Frown } from 'lucide-react';
import { useJournal } from '../hooks';
import { useTheme } from '../hooks/useTheme';
import type { JournalEntry } from '../types';

interface JournalCalendarProps {
  onClose: () => void;
  onSelectEntry: (entry: JournalEntry) => void;
}

// Mood icons mapping
const moodIcons: Record<number, { icon: typeof Smile; color: string }> = {
  1: { icon: Frown, color: '#f87171' },
  2: { icon: Meh, color: '#fb923c' },
  3: { icon: Meh, color: '#eab308' },
  4: { icon: Smile, color: '#4ade80' },
  5: { icon: Smile, color: '#34d399' },
};

export function JournalCalendar({ onClose, onSelectEntry }: JournalCalendarProps) {
  console.log('[JournalCalendar] Component mounting...');

  const { journalEntries, isLoading } = useJournal();
  const { isDark } = useTheme();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Debug: log entries when they change
  console.log('[JournalCalendar] journalEntries:', journalEntries.length, 'isLoading:', isLoading);
  console.log('[JournalCalendar] Entry dates:', journalEntries.map(e => e.date));
  console.log('[JournalCalendar] Current month:', format(currentMonth, 'yyyy-MM'));

  // Theme-aware colors
  const colors = isDark ? {
    bg: '#222224',
    bgAlt: '#141416',
    text: '#f5f5f5',
    textMuted: '#9c9ca0',
    textFaint: '#6b6b70',
    border: '#3d3d42',
    accent: '#d4896b',
    accentBg: '#3d3538',
  } : {
    bg: '#FFFEF9',
    bgAlt: '#F5F2ED',
    text: '#1C1917',
    textMuted: '#78716C',
    textFaint: '#A8A29E',
    border: '#E7E5E4',
    accent: '#C4785B',
    accentBg: '#E8B4A0',
  };

  // Animate in on mount
  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Create a map of dates to entries for quick lookup
  // Normalize date format to yyyy-MM-dd (entries may come as ISO strings with time)
  const entriesByDate = useMemo(() => {
    const map = new Map<string, JournalEntry>();
    journalEntries.forEach((entry) => {
      // Handle both 'yyyy-MM-dd' and ISO timestamp formats
      const dateKey = entry.date.includes('T')
        ? entry.date.split('T')[0]
        : entry.date;
      map.set(dateKey, entry);
    });
    return map;
  }, [journalEntries]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  const handleDayClick = (day: Date) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const entry = entriesByDate.get(dateStr);
    if (entry) {
      setSelectedEntry(entry);
    }
  };

  const handleViewEntry = () => {
    if (selectedEntry) {
      onSelectEntry(selectedEntry);
      onClose();
    }
  };

  const getMoodIcon = (mood: number | undefined) => {
    if (!mood) return null;
    const moodData = moodIcons[mood];
    if (!moodData) return null;
    const Icon = moodData.icon;
    return <Icon style={{ width: 12, height: 12, color: moodData.color }} />;
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.2s ease-out',
      }}
      onClick={onClose}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'rgba(28, 25, 23, 0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Calendar Panel */}
      <div
        style={{
          position: 'relative',
          backgroundColor: colors.bg,
          borderRadius: 16,
          boxShadow: isDark
            ? '0 4px 16px rgba(0, 0, 0, 0.3), 0 12px 32px rgba(0, 0, 0, 0.25)'
            : '0 4px 16px rgba(28, 25, 23, 0.08), 0 12px 32px rgba(28, 25, 23, 0.06)',
          overflow: 'hidden',
          width: '100%',
          maxWidth: 420,
          transform: isVisible ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.border}`,
            backgroundColor: colors.bg,
          }}
        >
          <h2 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 20, fontWeight: 600, color: colors.text, margin: 0 }}>
            Journal Entries
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: 8,
              borderRadius: 8,
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: colors.textMuted,
            }}
          >
            <X style={{ width: 20, height: 20 }} />
          </button>
        </div>

        {/* Month Navigation */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 20px',
            backgroundColor: colors.bgAlt,
          }}
        >
          <button
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <ChevronLeft style={{ width: 20, height: 20, color: colors.textMuted }} />
          </button>
          <h3 style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 18, fontWeight: 600, color: colors.text, margin: 0 }}>
            {format(currentMonth, 'MMMM yyyy')}
          </h3>
          <button
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            style={{ padding: 8, borderRadius: 8, border: 'none', background: 'transparent', cursor: 'pointer' }}
          >
            <ChevronRight style={{ width: 20, height: 20, color: colors.textMuted }} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div style={{ padding: 16, backgroundColor: colors.bg }}>
          {/* Loading indicator */}
          {isLoading && (
            <div style={{ textAlign: 'center', padding: '8px 0', fontFamily: '"Jost", system-ui, sans-serif', fontSize: 12, color: colors.textMuted }}>
              Loading entries...
            </div>
          )}
          {/* Entry count for debugging */}
          {!isLoading && (
            <div style={{ textAlign: 'center', padding: '4px 0 8px', fontFamily: '"Jost", system-ui, sans-serif', fontSize: 11, color: colors.textFaint }}>
              {journalEntries.length} entries found
            </div>
          )}
          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 8 }}>
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
              <div
                key={day}
                style={{
                  textAlign: 'center',
                  fontFamily: '"Jost", system-ui, sans-serif',
                  fontSize: 11,
                  color: colors.textMuted,
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  padding: '8px 0',
                }}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {calendarDays.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const entry = entriesByDate.get(dateStr);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isSelected = selectedEntry && isSameDay(parseISO(selectedEntry.date), day);
              const isTodayDate = isToday(day);

              return (
                <button
                  key={dateStr}
                  onClick={() => handleDayClick(day)}
                  disabled={!entry}
                  style={{
                    position: 'relative',
                    aspectRatio: '1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 8,
                    border: 'none',
                    cursor: entry ? 'pointer' : 'default',
                    fontFamily: '"Jost", system-ui, sans-serif',
                    fontSize: 14,
                    opacity: isCurrentMonth ? 1 : 0.3,
                    backgroundColor: isSelected ? colors.accentBg : isTodayDate ? colors.border : 'transparent',
                    outline: isSelected ? `2px solid ${colors.accent}` : 'none',
                  }}
                >
                  <span style={{ fontWeight: entry ? 500 : 400, color: entry ? colors.text : colors.textMuted }}>
                    {format(day, 'd')}
                  </span>
                  {entry && (
                    <div style={{ position: 'absolute', bottom: 4 }}>
                      {entry.mood ? (
                        getMoodIcon(entry.mood)
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: colors.accent }} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Entry Preview */}
        {selectedEntry && (
          <div style={{ borderTop: `1px solid ${colors.border}`, padding: 16, backgroundColor: colors.bg }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 18, fontWeight: 600, color: colors.text }}>
                {format(parseISO(selectedEntry.date), 'EEEE, MMMM d')}
              </span>
              {selectedEntry.mood && getMoodIcon(selectedEntry.mood)}
            </div>
            <p style={{
              fontFamily: '"Jost", system-ui, sans-serif',
              fontSize: 14,
              color: colors.textMuted,
              margin: '0 0 12px 0',
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}>
              {selectedEntry.content}
            </p>
            <button
              onClick={handleViewEntry}
              style={{
                width: '100%',
                padding: '10px 20px',
                borderRadius: 8,
                border: 'none',
                backgroundColor: colors.text,
                color: colors.bg,
                fontFamily: '"Jost", system-ui, sans-serif',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Read Full Entry
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
