import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import { getCategoryLabel, t } from '../i18n';
import type { NoticeCategory } from '../types';

type HomeReminderItem = {
  id: string;
  title: string;
  category: NoticeCategory;
  dueDate: string;
  isDone: boolean;
  isUrgent: boolean;
  isCritical: boolean;
  noticeId: string;
};

export default function HomeScreen() {
  const router = useRouter();
  const {
    notices,
    savedNoticeReminders,
    selectedLanguage,
    toggleNoticeReminderDone,
    noticesError,
    statusCheckedAt,
  } = useAppContext();

  const todayKey = formatDateKey(new Date());
  const recentStartKey = getPastDateKey(6);
  const { weekStartKey, weekEndKey } = getCurrentWeekBounds();
  const urgentKey = getFutureDateKey(2);

  const noticeMap = new Map(notices.map((notice) => [notice.id, notice]));

  const weeklyNotices = notices
    .filter((notice) => {
      const noticeDate = normalizeDateKey(notice.date);
      return noticeDate >= recentStartKey && noticeDate <= todayKey;
    })
    .sort((a, b) => normalizeDateKey(b.date).localeCompare(normalizeDateKey(a.date)));

  const weeklyDeadlineNotices = notices
    .filter((notice) => {
      if (!notice.deadline) return false;

      const deadlineKey = normalizeDateKey(notice.deadline);
      return deadlineKey >= weekStartKey && deadlineKey <= weekEndKey;
    })
    .sort((a, b) => {
      const deadlineCompare = normalizeDateKey(a.deadline || '').localeCompare(
        normalizeDateKey(b.deadline || '')
      );
      if (deadlineCompare !== 0) return deadlineCompare;
      return a.title.localeCompare(b.title);
    });

  const weeklyTasks: HomeReminderItem[] = savedNoticeReminders
    .filter((item) => item.dueDate >= weekStartKey && item.dueDate <= weekEndKey)
    .map((item) => {
      const sourceNotice = noticeMap.get(item.noticeId);
      const isCritical = Boolean(sourceNotice?.isCritical);
      const isUrgent = !item.isDone && item.dueDate <= urgentKey;

      return {
        id: item.id,
        title: item.title,
        noticeId: item.noticeId,
        category: item.category,
        dueDate: item.dueDate,
        isDone: item.isDone,
        isUrgent,
        isCritical,
      };
    })
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
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>
              {t(selectedLanguage, 'home.todayDeadlines')}
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/notices')}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Text style={styles.moreText}>{t(selectedLanguage, 'home.more')}</Text>
            </TouchableOpacity>
          </View>

          {weeklyDeadlineNotices.length > 0 ? (
            weeklyDeadlineNotices.slice(0, 3).map((notice) => (
              <TouchableOpacity
                key={notice.id}
                style={[styles.taskRow, styles.weeklyDeadlineRow]}
                onPress={() => router.push({ pathname: '/notices/[id]', params: { id: notice.id } })}
                activeOpacity={0.8}
              >
                <View style={styles.checkBox}>
                  <Ionicons
                    name={normalizeDateKey(notice.deadline || '') <= todayKey ? 'alert-circle' : 'alarm-outline'}
                    size={24}
                    color={normalizeDateKey(notice.deadline || '') <= todayKey ? '#B45309' : '#8A6F00'}
                  />
                </View>

                <View style={styles.rowTextWrap}>
                  <Text style={styles.taskTitle}>
                    {notice.title}
                  </Text>
                  <Text style={styles.taskDate}>
                    {getCategoryLabel(selectedLanguage, notice.category)} -{' '}
                    {t(selectedLanguage, 'notices.deadline')} {notice.deadline}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              {t(selectedLanguage, 'home.todayDeadlinesEmpty')}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {t(selectedLanguage, 'home.todayNotices')}
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/notices')}
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Text style={styles.moreText}>{t(selectedLanguage, 'home.more')}</Text>
            </TouchableOpacity>
          </View>

          {weeklyNotices.length > 0 ? (
            weeklyNotices.slice(0, 3).map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.noticeItem}
                onPress={() => router.push({ pathname: '/notices/[id]', params: { id: item.id } })}
                activeOpacity={0.82}
              >
                <View style={styles.noticeHeaderRow}>
                  <Text style={styles.noticeCategory}>
                    {getCategoryLabel(selectedLanguage, item.category)}
                  </Text>
                  {item.isCritical ? (
                    <View style={styles.noticeBadge}>
                      <Text style={styles.noticeBadgeText}>
                        {t(selectedLanguage, 'notices.important')}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <Text style={styles.noticeTitle}>{item.title}</Text>
                <Text style={styles.noticeSummary}>{item.summary}</Text>
                <Text style={styles.noticeDate}>
                  {item.deadline
                    ? `${t(selectedLanguage, 'notices.deadline')} ${item.deadline}`
                    : `${t(selectedLanguage, 'notices.posted')} ${item.date}`}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              {t(selectedLanguage, 'home.todayNoticesEmpty')}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>
              {t(selectedLanguage, 'home.weeklyTasks')}
            </Text>
          </View>
          <Text style={styles.sectionHint}>
            {t(selectedLanguage, 'home.weeklyTasksHint')}
          </Text>
          <Text style={styles.statusLine}>
            {t(selectedLanguage, 'home.completed')} {doneCount} -{' '}
            {t(selectedLanguage, 'home.remaining')} {totalCount - doneCount}
          </Text>
          <Text style={styles.statusLine}>
            {t(selectedLanguage, 'home.lastChecked')}:{' '}
            {statusCheckedAt
              ? new Date(statusCheckedAt).toLocaleString()
              : t(selectedLanguage, 'home.neverChecked')}
          </Text>
          {noticesError ? (
            <Text style={styles.statusError}>
              {t(selectedLanguage, 'home.errorLoading')}: {noticesError}
            </Text>
          ) : null}

          {weeklyTasks.length > 0 ? (
            weeklyTasks.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={[styles.taskRow, item.isDone && styles.taskRowDone]}
                onPress={() => router.push({ pathname: '/notices/[id]', params: { id: item.noticeId } })}
                activeOpacity={0.8}
              >
                <TouchableOpacity
                  style={styles.checkBoxButton}
                  onPress={() => toggleNoticeReminderDone(item.id)}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name={item.isDone ? 'checkbox' : 'square-outline'}
                    size={26}
                    color={item.isDone ? '#38BDF8' : '#64748B'}
                  />
                </TouchableOpacity>

                <View style={styles.rowTextWrap}>
                  <View style={styles.taskBadgeRow}>
                    {item.isCritical ? (
                      <View style={styles.inlineBadge}>
                        <Text style={styles.inlineBadgeText}>
                          {t(selectedLanguage, 'notices.important')}
                        </Text>
                      </View>
                    ) : null}

                    {item.isUrgent ? (
                      <View style={styles.inlineBadgeUrgent}>
                        <Text style={styles.inlineBadgeUrgentText}>
                          {t(selectedLanguage, 'home.urgent')}
                        </Text>
                      </View>
                    ) : null}

                    {item.isDone ? (
                      <View style={styles.inlineBadgeDone}>
                        <Text style={styles.inlineBadgeDoneText}>
                          {t(selectedLanguage, 'home.done')}
                        </Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={[styles.taskTitle, item.isDone && styles.taskTitleDone]}>
                    {item.title}
                  </Text>
                  <Text style={[styles.taskDate, item.isDone && styles.taskDateDone]}>
                    {getCategoryLabel(selectedLanguage, item.category)} -{' '}
                    {t(selectedLanguage, 'notices.deadline')} {item.dueDate}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>
              {t(selectedLanguage, 'home.weeklyTasksEmpty')}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.progressLabel}>
            {t(selectedLanguage, 'home.progress')}
          </Text>
          <Text style={styles.progressNumber}>{progress}%</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>

          <Text style={styles.progressText}>
            {t(selectedLanguage, 'home.completed')} {doneCount} -{' '}
            {t(selectedLanguage, 'home.remaining')} {totalCount - doneCount}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function getFutureDateKey(daysFromToday: number) {
  const date = new Date();
  date.setDate(date.getDate() + daysFromToday);
  return formatDateKey(date);
}

function getPastDateKey(daysBeforeToday: number) {
  const date = new Date();
  date.setDate(date.getDate() - daysBeforeToday);
  return formatDateKey(date);
}

function getCurrentWeekBounds() {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  return {
    weekStartKey: formatDateKey(monday),
    weekEndKey: formatDateKey(sunday),
  };
}

function normalizeDateKey(dateText: string) {
  return dateText.slice(0, 10);
}

function formatDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    marginBottom: 0,
  },
  moreText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  noticeItem: {
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
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
    backgroundColor: '#DFF3FF',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  noticeBadgeText: {
    fontSize: 11,
    color: '#005BAC',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
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
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    padding: 12,
    shadowColor: '#0F172A',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 1,
  },
  taskRowDone: {
    backgroundColor: '#F0FAFF',
  },
  weeklyDeadlineRow: {
    backgroundColor: '#FFF8D8',
    shadowColor: '#7C6F3A',
    shadowOpacity: 0.08,
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
    backgroundColor: '#DFF3FF',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  inlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#005BAC',
  },
  inlineBadgeUrgent: {
    backgroundColor: '#E0F7FF',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  inlineBadgeUrgentText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  inlineBadgeDone: {
    backgroundColor: '#E0F7FF',
    borderRadius: 999,
    paddingVertical: 3,
    paddingHorizontal: 9,
  },
  inlineBadgeDoneText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0284C7',
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  taskTitleDone: {
    color: '#64748B',
  },
  taskDate: {
    fontSize: 13,
    color: '#64748B',
  },
  taskDateDone: {
    color: '#7FA7B8',
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
    color: '#005BAC',
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
    backgroundColor: '#38BDF8',
    borderRadius: 999,
  },
  progressText: {
    fontSize: 13,
    color: '#4B5563',
    fontWeight: '500',
  },
  checkBoxButton: {
    marginRight: 12,
    marginTop: 1,
  },
  statusLine: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 4,
  },
  statusError: {
    fontSize: 13,
    color: '#B91C1C',
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
});
