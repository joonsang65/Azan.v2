import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

type CalendarMode = 'Academic' | 'Deadlines';

type AcademicEvent = {
  id: string;
  date: string;
  term: string;
  title: string;
  description: string;
  kind: 'apply' | 'test' | 'orientation' | 'start' | 'end';
};

const WEEK_DAYS = ['일', '월', '화', '수', '목', '금', '토'];

const ACADEMIC_EVENTS: AcademicEvent[] = [
  {
    id: 'spring-apply-start',
    date: '2025-11-10',
    term: '26-봄',
    title: '신청 시작',
    description: '2026 봄학기 한국어과정 신청기간 시작',
    kind: 'apply',
  },
  {
    id: 'spring-apply-end',
    date: '2025-12-26',
    term: '26-봄',
    title: '신청 마감',
    description: '2026 봄학기 한국어과정 신청기간 마감',
    kind: 'apply',
  },
  {
    id: 'spring-level-test',
    date: '2026-02-11',
    term: '26-봄',
    title: '레벨테스트',
    description: '2026 봄학기 레벨테스트',
    kind: 'test',
  },
  {
    id: 'spring-orientation',
    date: '2026-02-27',
    term: '26-봄',
    title: '신입생설명회',
    description: '2026 봄학기 신입생설명회',
    kind: 'orientation',
  },
  {
    id: 'spring-start',
    date: '2026-03-03',
    term: '26-봄',
    title: '개강',
    description: '2026 봄학기 개강일',
    kind: 'start',
  },
  {
    id: 'spring-end',
    date: '2026-05-12',
    term: '26-봄',
    title: '수료',
    description: '2026 봄학기 수료일',
    kind: 'end',
  },
  {
    id: 'summer-apply-start',
    date: '2026-02-09',
    term: '26-여름',
    title: '신청 시작',
    description: '2026 여름학기 한국어과정 신청기간 시작',
    kind: 'apply',
  },
  {
    id: 'summer-apply-end',
    date: '2026-03-27',
    term: '26-여름',
    title: '신청 마감',
    description: '2026 여름학기 한국어과정 신청기간 마감',
    kind: 'apply',
  },
  {
    id: 'summer-level-test',
    date: '2026-05-13',
    term: '26-여름',
    title: '레벨테스트',
    description: '2026 여름학기 레벨테스트',
    kind: 'test',
  },
  {
    id: 'summer-orientation',
    date: '2026-05-29',
    term: '26-여름',
    title: '신입생설명회',
    description: '2026 여름학기 신입생설명회',
    kind: 'orientation',
  },
  {
    id: 'summer-start',
    date: '2026-06-01',
    term: '26-여름',
    title: '개강',
    description: '2026 여름학기 개강일',
    kind: 'start',
  },
  {
    id: 'summer-end',
    date: '2026-08-11',
    term: '26-여름',
    title: '수료',
    description: '2026 여름학기 수료일',
    kind: 'end',
  },
  {
    id: 'fall-apply-start',
    date: '2026-05-11',
    term: '26-가을',
    title: '신청 시작',
    description: '2026 가을학기 한국어과정 신청기간 시작',
    kind: 'apply',
  },
  {
    id: 'fall-apply-end',
    date: '2026-07-10',
    term: '26-가을',
    title: '신청 마감',
    description: '2026 가을학기 한국어과정 신청기간 마감',
    kind: 'apply',
  },
  {
    id: 'fall-level-test',
    date: '2026-08-12',
    term: '26-가을',
    title: '레벨테스트',
    description: '2026 가을학기 레벨테스트',
    kind: 'test',
  },
  {
    id: 'fall-orientation',
    date: '2026-09-04',
    term: '26-가을',
    title: '신입생설명회',
    description: '2026 가을학기 신입생설명회',
    kind: 'orientation',
  },
  {
    id: 'fall-start',
    date: '2026-09-07',
    term: '26-가을',
    title: '개강',
    description: '2026 가을학기 개강일',
    kind: 'start',
  },
  {
    id: 'fall-end',
    date: '2026-11-19',
    term: '26-가을',
    title: '수료',
    description: '2026 가을학기 수료일',
    kind: 'end',
  },
  {
    id: 'winter-apply-start',
    date: '2026-08-10',
    term: '26-겨울',
    title: '신청 시작',
    description: '2026 겨울학기 한국어과정 신청기간 시작',
    kind: 'apply',
  },
  {
    id: 'winter-apply-end',
    date: '2026-09-25',
    term: '26-겨울',
    title: '신청 마감',
    description: '2026 겨울학기 한국어과정 신청기간 마감',
    kind: 'apply',
  },
  {
    id: 'winter-level-test',
    date: '2026-11-20',
    term: '26-겨울',
    title: '레벨테스트',
    description: '2026 겨울학기 레벨테스트',
    kind: 'test',
  },
  {
    id: 'winter-orientation',
    date: '2026-11-27',
    term: '26-겨울',
    title: '신입생설명회',
    description: '2026 겨울학기 신입생설명회',
    kind: 'orientation',
  },
  {
    id: 'winter-start',
    date: '2026-12-04',
    term: '26-겨울',
    title: '개강',
    description: '2026 겨울학기 개강일',
    kind: 'start',
  },
  {
    id: 'winter-end',
    date: '2027-02-17',
    term: '26-겨울',
    title: '수료',
    description: '2026 겨울학기 수료일',
    kind: 'end',
  },
];

export default function CalendarScreen() {
  const today = new Date();
  const [mode, setMode] = useState<CalendarMode>('Academic');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState(formatDateKey(today));
  const {
    savedNoticeReminders,
    selectedLanguage,
    toggleNoticeReminderDone,
    removeNoticeReminder,
  } = useAppContext();

  const academicEventsByDate = useMemo(() => groupAcademicEventsByDate(), []);

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
  const selectedAcademicEvents = academicEventsByDate[selectedDateKey] ?? [];
  const selectedReminders = remindersByDate[selectedDateKey] ?? [];
  const isKorean = selectedLanguage === 'Korean';
  const headerLabel = `${currentDate.getFullYear()}.${String(
    currentDate.getMonth() + 1
  ).padStart(2, '0')}`;

  const handlePrev = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNext = () => {
    setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const getCountForDate = (date: Date | null) => {
    if (!date) return 0;

    const dateKey = formatDateKey(date);
    return mode === 'Academic'
      ? academicEventsByDate[dateKey]?.length ?? 0
      : remindersByDate[dateKey]?.length ?? 0;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.modeSwitch}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'Academic' && styles.activeModeButton]}
          onPress={() => setMode('Academic')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="school-outline"
            size={17}
            color={mode === 'Academic' ? '#FFFFFF' : '#475569'}
          />
          <Text
            style={[
              styles.modeButtonText,
              mode === 'Academic' && styles.activeModeButtonText,
            ]}
          >
            {isKorean ? '학사일정' : 'Academic'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modeButton, mode === 'Deadlines' && styles.activeModeButton]}
          onPress={() => setMode('Deadlines')}
          activeOpacity={0.85}
        >
          <Ionicons
            name="notifications-outline"
            size={17}
            color={mode === 'Deadlines' ? '#FFFFFF' : '#475569'}
          />
          <Text
            style={[
              styles.modeButtonText,
              mode === 'Deadlines' && styles.activeModeButtonText,
            ]}
          >
            {isKorean ? '저장한 마감일' : 'Saved Deadlines'}
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

        <View style={styles.monthGrid}>
          {monthCells.map((cell, index) => (
            <CalendarDay
              key={`${cell.label}-${index}`}
              date={cell.date}
              label={cell.label}
              isCurrentMonth={cell.isCurrentMonth}
              selectedDateKey={selectedDateKey}
              markerCount={getCountForDate(cell.date)}
              markerColor={mode === 'Academic' ? '#2563EB' : '#005BAC'}
              onSelect={setSelectedDateKey}
            />
          ))}
        </View>
      </View>

      {mode === 'Academic' ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isKorean ? '선택한 날짜의 학사일정' : 'Academic Schedule'}
          </Text>
          <Text style={styles.sectionSubtitle}>{selectedDateKey}</Text>

          {selectedAcademicEvents.length > 0 ? (
            selectedAcademicEvents.map((event) => (
              <View key={event.id} style={styles.academicRow}>
                <View style={[styles.eventIcon, styles[`${event.kind}Icon`]]}>
                  <Ionicons name={getAcademicIcon(event.kind)} size={16} color="#FFFFFF" />
                </View>
                <View style={styles.eventTextWrap}>
                  <Text style={styles.eventTitle}>
                    {event.term} · {event.title}
                  </Text>
                  <Text style={styles.eventDescription}>{event.description}</Text>
                </View>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              {isKorean
                ? '이 날짜에 등록된 학사일정이 없습니다.'
                : 'No academic schedule is saved for this date.'}
            </Text>
          )}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            {isKorean ? '선택한 날짜의 공지 마감' : 'Saved Notice Deadlines'}
          </Text>
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
                      {reminder.category} · {isKorean ? '마감' : 'Due'} {reminder.dueDate}
                    </Text>
                  </View>

                  <Ionicons
                    name={reminder.isDone ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={reminder.isDone ? '#38BDF8' : '#CBD5E1'}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => removeNoticeReminder(reminder.noticeId)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.removeButtonText}>
                    {isKorean ? '삭제' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>
              {isKorean
                ? '이 날짜에 저장한 공지 마감일이 없습니다.'
                : 'No saved notice deadline for this date.'}
            </Text>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function CalendarDay({
  date,
  label,
  isCurrentMonth,
  selectedDateKey,
  markerCount,
  markerColor,
  onSelect,
}: {
  date: Date | null;
  label: string;
  isCurrentMonth: boolean;
  selectedDateKey: string;
  markerCount: number;
  markerColor: string;
  onSelect: (dateKey: string) => void;
}) {
  const todayKey = formatDateKey(new Date());
  const dateKey = date ? formatDateKey(date) : null;
  const isToday = dateKey === todayKey;
  const isSelected = dateKey === selectedDateKey;

  return (
    <TouchableOpacity
      style={styles.dayCell}
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

      {markerCount > 0 ? (
        <View style={styles.markerWrap}>
          <View style={[styles.markerDot, { backgroundColor: markerColor }]} />
          {markerCount > 1 ? (
            <Text style={[styles.markerCount, { color: markerColor }]}>{markerCount}</Text>
          ) : null}
        </View>
      ) : (
        <View style={styles.emptyMarkerSpace} />
      )}
    </TouchableOpacity>
  );
}

function groupAcademicEventsByDate() {
  return ACADEMIC_EVENTS.reduce<Record<string, AcademicEvent[]>>((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = [];
    }

    acc[event.date].push(event);
    return acc;
  }, {});
}

function getAcademicIcon(kind: AcademicEvent['kind']) {
  if (kind === 'apply') return 'create-outline';
  if (kind === 'test') return 'clipboard-outline';
  if (kind === 'orientation') return 'people-outline';
  if (kind === 'start') return 'flag-outline';
  return 'checkmark-done-outline';
}

function formatDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    '0'
  )}-${String(date.getDate()).padStart(2, '0')}`;
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
    minHeight: 44,
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  activeModeButton: {
    backgroundColor: '#005BAC',
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
    paddingVertical: 8,
  },
  dayCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: {
    backgroundColor: '#005BAC',
  },
  selectedCircle: {
    backgroundColor: '#38BDF8',
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
    justifyContent: 'center',
    marginTop: 4,
    minHeight: 14,
  },
  emptyMarkerSpace: {
    height: 18,
  },
  markerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  markerCount: {
    marginLeft: 4,
    fontSize: 10,
    fontWeight: '700',
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
  academicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  eventIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  applyIcon: {
    backgroundColor: '#64748B',
  },
  testIcon: {
    backgroundColor: '#7C3AED',
  },
  orientationIcon: {
    backgroundColor: '#0891B2',
  },
  startIcon: {
    backgroundColor: '#2563EB',
  },
  endIcon: {
    backgroundColor: '#16A34A',
  },
  eventTextWrap: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  eventDescription: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
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
    backgroundColor: '#DFF3FF',
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#005BAC',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
