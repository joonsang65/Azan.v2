import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

type CalendarMode = 'Monthly' | 'Weekly';

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

export default function CalendarScreen() {
  const today = new Date();
  const [mode, setMode] = useState<CalendarMode>('Monthly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(formatDateKey(today));
  const {
    savedNoticeReminders,
    toggleNoticeReminderDone,
    removeNoticeReminder,
  } = useAppContext();

  const remindersByDate = useMemo(() => {
    return savedNoticeReminders.reduce<Record<string, typeof savedNoticeReminders>>(
      (acc, reminder) => {
        if (!acc[reminder.dueDate]) {
          acc[reminder.dueDate] = [];
        }

        acc[reminder.dueDate].push(reminder);
        return acc;
      },
      {}
    );
  }, [savedNoticeReminders]);

  const monthCells = useMemo(() => getMonthCells(currentDate), [currentDate]);
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);
  const selectedReminders = remindersByDate[selectedDateKey] ?? [];

  const headerLabel = useMemo(() => {
    if (mode === 'Monthly') {
      return `${currentDate.getFullYear()}.${String(
        currentDate.getMonth() + 1
      ).padStart(2, '0')}`;
    }

    const week = getWeekDates(currentDate);
    const start = week[0];
    const end = week[6];

    return `${formatShortDate(start)} - ${formatShortDate(end)}`;
  }, [currentDate, mode]);

  const handlePrev = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + (mode === 'Monthly' ? -30 : -7));
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    next.setDate(next.getDate() + (mode === 'Monthly' ? 30 : 7));
    setCurrentDate(next);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.modeSwitch}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'Weekly' && styles.activeModeButton]}
          onPress={() => setMode('Weekly')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === 'Weekly' && styles.activeModeButtonText,
            ]}
          >
            주간
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, mode === 'Monthly' && styles.activeModeButton]}
          onPress={() => setMode('Monthly')}
          activeOpacity={0.85}
        >
          <Text
            style={[
              styles.modeButtonText,
              mode === 'Monthly' && styles.activeModeButtonText,
            ]}
          >
            월간
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handlePrev} style={styles.arrowButton}>
            <Ionicons name="chevron-back" size={20} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerLabel}>{headerLabel}</Text>

          <TouchableOpacity onPress={handleNext} style={styles.arrowButton}>
            <Ionicons name="chevron-forward" size={20} color="#0F172A" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekHeaderRow}>
          {WEEK_DAYS.map((day) => (
            <Text key={day} style={styles.weekHeaderText}>
              {day}
            </Text>
          ))}
        </View>

        {mode === 'Monthly' ? (
          <View style={styles.monthGrid}>
            {monthCells.map((cell, index) => (
              <CalendarDay
                key={`${cell.label}-${index}`}
                date={cell.date}
                label={cell.label}
                isCurrentMonth={cell.isCurrentMonth}
                selectedDateKey={selectedDateKey}
                reminderCount={
                  cell.date ? remindersByDate[formatDateKey(cell.date)]?.length ?? 0 : 0
                }
                onSelect={setSelectedDateKey}
              />
            ))}
          </View>
        ) : (
          <View style={styles.weekRow}>
            {weekDates.map((date) => (
              <CalendarDay
                key={date.toISOString()}
                date={date}
                label={String(date.getDate())}
                isCurrentMonth
                selectedDateKey={selectedDateKey}
                reminderCount={remindersByDate[formatDateKey(date)]?.length ?? 0}
                onSelect={setSelectedDateKey}
                weekly
              />
            ))}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>선택한 날짜의 공지 마감</Text>
        <Text style={styles.sectionSubtitle}>{selectedDateKey}</Text>

        {selectedReminders.length > 0 ? (
          selectedReminders.map((reminder) => (
            <View key={reminder.id} style={styles.reminderRow}>
              <TouchableOpacity
                style={styles.reminderMainAction}
                onPress={() => toggleNoticeReminderDone(reminder.id)}
                activeOpacity={0.85}
              >
                <View style={styles.reminderTextWrap}>
                  <Text
                    style={[
                      styles.reminderTitle,
                      reminder.isDone && styles.reminderTitleDone,
                    ]}
                  >
                    {reminder.title}
                  </Text>
                  <Text style={styles.reminderMeta}>
                    {reminder.category} · 마감 {reminder.dueDate}
                  </Text>
                </View>

                <Ionicons
                  name={reminder.isDone ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={reminder.isDone ? '#0F766E' : '#CBD5E1'}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeNoticeReminder(reminder.noticeId)}
                activeOpacity={0.85}
              >
                <Text style={styles.removeButtonText}>삭제</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.emptyText}>이 날짜에 저장된 공지 마감이 없습니다.</Text>
        )}
      </View>
    </ScrollView>
  );
}

function CalendarDay({
  date,
  label,
  isCurrentMonth,
  selectedDateKey,
  reminderCount,
  onSelect,
  weekly = false,
}: {
  date: Date | null;
  label: string;
  isCurrentMonth: boolean;
  selectedDateKey: string;
  reminderCount: number;
  onSelect: (dateKey: string) => void;
  weekly?: boolean;
}) {
  const todayKey = formatDateKey(new Date());
  const dateKey = date ? formatDateKey(date) : null;
  const isToday = dateKey === todayKey;
  const isSelected = dateKey === selectedDateKey;

  return (
    <TouchableOpacity
      style={weekly ? styles.weekDayCell : styles.dayCell}
      onPress={() => {
        if (dateKey) {
          onSelect(dateKey);
        }
      }}
      activeOpacity={0.85}
      disabled={!date}
    >
      <View
        style={[
          styles.dayCircle,
          isToday && styles.todayCircle,
          isSelected && styles.selectedCircle,
        ]}
      >
        <Text
          style={[
            styles.dayText,
            isCurrentMonth ? styles.currentMonthText : styles.otherMonthText,
            (isToday || isSelected) && styles.activeDayText,
          ]}
        >
          {label}
        </Text>
      </View>

      {reminderCount > 0 ? (
        <View style={styles.markerWrap}>
          <View style={styles.markerDot} />
          {reminderCount > 1 ? (
            <Text style={styles.markerCount}>{reminderCount}</Text>
          ) : null}
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatShortDate(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}.${String(date.getDate()).padStart(2, '0')}`;
}

function getMonthCells(baseDate: Date) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDayWeek = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const prevMonthDays = new Date(year, month, 0).getDate();
  const cells: { label: string; date: Date; isCurrentMonth: boolean }[] = [];

  for (let i = 0; i < firstDayWeek; i++) {
    const day = prevMonthDays - firstDayWeek + i + 1;
    cells.push({
      label: String(day),
      date: new Date(year, month - 1, day),
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({
      label: String(day),
      date: new Date(year, month, day),
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - cells.length;
  for (let day = 1; day <= remaining; day++) {
    cells.push({
      label: String(day),
      date: new Date(year, month + 1, day),
      isCurrentMonth: false,
    });
  }

  return cells;
}

function getWeekDates(baseDate: Date) {
  const date = new Date(baseDate);
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());

  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    return day;
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  content: {
    padding: 16,
    paddingBottom: 104,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 10,
  },
  activeModeButton: {
    backgroundColor: '#D95C4F',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  activeModeButtonText: {
    color: '#FFFFFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  arrowButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  weekHeaderRow: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  weekRow: {
    flexDirection: 'row',
  },
  weekDayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: '#D95C4F',
  },
  selectedCircle: {
    backgroundColor: '#0F766E',
  },
  dayText: {
    fontSize: 14,
    fontWeight: '600',
  },
  currentMonthText: {
    color: '#0F172A',
  },
  otherMonthText: {
    color: '#CBD5E1',
  },
  activeDayText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  markerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    minHeight: 14,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D95C4F',
  },
  markerCount: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '700',
    color: '#D95C4F',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    marginBottom: 14,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  reminderMainAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reminderTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  reminderTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  reminderTitleDone: {
    textDecorationLine: 'line-through',
    color: '#94A3B8',
  },
  reminderMeta: {
    fontSize: 12,
    color: '#64748B',
  },
  removeButton: {
    marginLeft: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
