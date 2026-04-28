import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

type HomeReminderItem = {
  id: string;
  title: string;
  category: string;
  dueDate: string;
  isDone: boolean;
  isUrgent: boolean;
  isCritical: boolean;
};

export default function HomeScreen() {
  const { notices, savedNoticeReminders, toggleNoticeReminderDone } =
    useAppContext();

  const todayKey = new Date().toISOString().slice(0, 10);
  const weekEndKey = getFutureDateKey(6);
  const urgentKey = getFutureDateKey(2);

  const noticeMap = new Map(notices.map((notice) => [notice.id, notice]));

  const todayNotices = notices.filter(
    (notice) => normalizeDateKey(notice.date) === todayKey
  );

  const todayDeadlines = savedNoticeReminders.filter(
    (item) => !item.isDone && item.dueDate === todayKey
  );

  const weeklyTasks: HomeReminderItem[] = savedNoticeReminders
    .filter((item) => item.dueDate >= todayKey && item.dueDate <= weekEndKey)
    .map((item) => {
      const sourceNotice = noticeMap.get(item.noticeId);
      const isCritical = Boolean(sourceNotice?.isCritical);
      const isUrgent = item.dueDate <= urgentKey;

      return {
        id: item.id,
        title: item.title,
        category: item.category,
        dueDate: item.dueDate,
        isDone: item.isDone,
        isUrgent,
        isCritical,
      };
    })
    .filter((item) => item.isCritical || item.isUrgent)
    .sort((a, b) => {
      if (a.isDone !== b.isDone) return a.isDone ? 1 : -1;
      if (a.dueDate !== b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      return a.title.localeCompare(b.title);
    });

  const doneCount = weeklyTasks.filter((item) => item.isDone).length;
  const totalCount = weeklyTasks.length;
  const progress =
    totalCount === 0 ? 0 : Math.round((doneCount / totalCount) * 100);

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.highlightCard}>
          <Text style={styles.sectionLabel}>오늘의 공지</Text>

          {todayNotices.length > 0 ? (
            todayNotices.map((item) => (
              <View key={item.id} style={styles.noticeItem}>
                <View style={styles.noticeHeaderRow}>
                  <Text style={styles.noticeCategory}>{item.category}</Text>
                  {item.isCritical ? (
                    <View style={styles.noticeBadge}>
                      <Text style={styles.noticeBadgeText}>중요</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.noticeTitle}>{item.title}</Text>
                <Text style={styles.noticeSummary}>{item.summary}</Text>
                <Text style={styles.noticeDate}>
                  {item.deadline ? `마감일 ${item.deadline}` : `게시일 ${item.date}`}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>오늘 꼭 확인할 공지가 없습니다.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>오늘 마감 공지</Text>

          {todayDeadlines.length > 0 ? (
            todayDeadlines.map((reminder) => (
              <TouchableOpacity
                key={reminder.id}
                style={styles.taskRow}
                onPress={() => toggleNoticeReminderDone(reminder.id)}
                activeOpacity={0.8}
              >
                <View style={styles.checkBox}>
                  <Ionicons name="alarm-outline" size={24} color="#D95C4F" />
                </View>

                <View style={styles.rowTextWrap}>
                  <Text style={styles.taskTitle}>{reminder.title}</Text>
                  <Text style={styles.taskDate}>
                    {reminder.category} · 마감 {reminder.dueDate}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>오늘 마감으로 저장된 공지가 없습니다.</Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>이번 주 할 일</Text>
          <Text style={styles.sectionHint}>
            캘린더에 저장한 공지 중 이번 주까지 처리해야 할 중요한 일정입니다.
          </Text>

          {weeklyTasks.length > 0 ? (
            weeklyTasks.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.taskRow, item.isDone && styles.taskRowDone]}
                onPress={() => toggleNoticeReminderDone(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.checkBox}>
                  {item.isDone ? (
                    <Ionicons name="checkmark-circle" size={24} color="#0F766E" />
                  ) : item.isUrgent ? (
                    <Ionicons name="alarm-outline" size={24} color="#D95C4F" />
                  ) : (
                    <Ionicons name="ellipse-outline" size={24} color="#C0C7D1" />
                  )}
                </View>

                <View style={styles.rowTextWrap}>
                  <View style={styles.taskBadgeRow}>
                    {item.isCritical ? (
                      <View style={styles.inlineBadge}>
                        <Text style={styles.inlineBadgeText}>중요</Text>
                      </View>
                    ) : null}

                    {item.isUrgent ? (
                      <View style={styles.inlineBadgeUrgent}>
                        <Text style={styles.inlineBadgeUrgentText}>임박</Text>
                      </View>
                    ) : null}

                    {item.isDone ? (
                      <View style={styles.inlineBadgeDone}>
                        <Text style={styles.inlineBadgeDoneText}>완료</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.taskTitle, item.isDone && styles.taskTitleDone]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.taskDate, item.isDone && styles.taskDateDone]}>
                    {item.category} · 마감 {item.dueDate}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              이번 주까지 처리할 저장 공지가 없습니다.
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.progressLabel}>진행률</Text>
          <Text style={styles.progressNumber}>{progress}%</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.progressText}>
            완료 {doneCount}개 · 남음 {totalCount - doneCount}개
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getFutureDateKey(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return date.toISOString().slice(0, 10);
}

function normalizeDateKey(dateText: string) {
  return dateText.slice(0, 10);
}

const styles = StyleSheet.create({
  screen: {
  flex: 1,
  backgroundColor: '#F4F6FB',
},
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  content: {
    padding: 16,
    paddingBottom: 104,
  },
  highlightCard: {
    backgroundColor: '#FFF4BF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3D76B',
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2B2B',
    marginBottom: 14,
  },
  noticeItem: {
    marginBottom: 14,
  },
  noticeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeCategory: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B45309',
  },
  noticeBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  noticeBadgeText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },
  noticeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 4,
  },
  noticeSummary: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 4,
  },
  noticeDate: {
    fontSize: 12,
    color: '#7C6F3A',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  sectionHint: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    marginBottom: 14,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    borderRadius: 14,
    padding: 10,
    marginHorizontal: -10,
  },
  taskRowDone: {
    backgroundColor: '#F0FDF4',
  },
  checkBox: {
    marginRight: 12,
    marginTop: 2,
  },
  rowTextWrap: {
    flex: 1,
  },
  taskBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  inlineBadge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  inlineBadgeUrgent: {
    backgroundColor: '#FFF7ED',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  inlineBadgeUrgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#C2410C',
  },
  inlineBadgeDone: {
    backgroundColor: '#DCFCE7',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  inlineBadgeDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  taskTitleDone: {
    textDecorationLine: 'line-through',
    color: '#6B7280',
  },
  taskDate: {
    fontSize: 13,
    color: '#64748B',
  },
  taskDateDone: {
    color: '#94A3B8',
  },
  progressLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 6,
  },
  progressNumber: {
    fontSize: 42,
    fontWeight: '800',
    color: '#3B5BDB',
    marginBottom: 12,
  },
  progressTrack: {
    width: '100%',
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: 999,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4F7CFF',
    borderRadius: 999,
  },
  progressText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
