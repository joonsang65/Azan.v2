import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from './context/AppContext';
import type { InterestCategory, NoticeCategory } from './types';

export default function AlertsScreen() {
  const router = useRouter();
  const {
    notices,
    selectedNoticeCategories,
    userProfileStatus,
    toggleNoticeReminder,
    savedNoticeReminders,
  } = useAppContext();

  const activeInterests =
    selectedNoticeCategories.length > 0
      ? selectedNoticeCategories
      : userProfileStatus.interests;

  const activeCategories = activeInterests.map(mapInterestToNoticeCategory);

  const filteredAlerts = notices.filter((notice) =>
    activeCategories.includes(notice.category)
  );

  const criticalAlerts = filteredAlerts.filter((notice) => notice.isCritical);
  const normalAlerts = filteredAlerts.filter((notice) => !notice.isCritical);

  const handlePressNotice = (id: string) => {
    router.push({ pathname: '/notices/[id]', params: { id } });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.screenTitle}>알림</Text>
      <Text style={styles.screenSubtitle}>
        선택한 카테고리에 맞는 공지를 모아볼 수 있어요.
      </Text>

      <View style={styles.categoryBox}>
        <Text style={styles.sectionTitle}>선택한 카테고리</Text>
        <View style={styles.chipRow}>
          {activeCategories.length > 0 ? (
            activeInterests.map((category) => (
              <View key={category} style={styles.chip}>
                <Text style={styles.chipText}>{getInterestLabel(category)}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyText}>아직 선택한 카테고리가 없습니다.</Text>
          )}
        </View>
      </View>

      {criticalAlerts.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>중요 알림</Text>

          {criticalAlerts.map((notice) => {
            const isSaved = savedNoticeReminders.some(
              (item) => item.noticeId === notice.id
            );

            return (
              <View key={notice.id} style={[styles.card, styles.criticalCard]}>
                <TouchableOpacity
                  onPress={() => handlePressNotice(notice.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.category}>{notice.category}</Text>
                    <View style={styles.badgeRow}>
                      {notice.hasAttachmentOnly ? (
                        <View style={styles.imageBadge}>
                          <Text style={styles.imageBadgeText}>이미지 첨부</Text>
                        </View>
                      ) : null}
                      <View style={styles.badge}>
                        <Text style={styles.badgeText}>중요</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.cardTitle}>{notice.title}</Text>
                  <Text style={styles.cardSummary} numberOfLines={3}>
                    {notice.summary}
                  </Text>
                  <Text style={styles.cardDate}>
                    {notice.deadline ? `마감일 ${notice.deadline}` : `게시일 ${notice.date}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isSaved && styles.savedButton]}
                  onPress={() => toggleNoticeReminder(notice)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaved ? '캘린더에서 제거' : '마감일 저장'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>전체 맞춤 알림</Text>

        {normalAlerts.length === 0 && criticalAlerts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyTitle}>표시할 알림이 없습니다</Text>
            <Text style={styles.emptyText}>
              현재 선택한 관심사와 일치하는 공지가 없습니다.
            </Text>
          </View>
        ) : (
          normalAlerts.map((notice) => {
            const isSaved = savedNoticeReminders.some(
              (item) => item.noticeId === notice.id
            );

            return (
              <View key={notice.id} style={styles.card}>
                <TouchableOpacity
                  onPress={() => handlePressNotice(notice.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardTopRow}>
                    <Text style={styles.category}>{notice.category}</Text>
                    {notice.hasAttachmentOnly ? (
                      <View style={styles.imageBadge}>
                        <Text style={styles.imageBadgeText}>이미지 첨부</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.cardTitle}>{notice.title}</Text>
                  <Text style={styles.cardSummary} numberOfLines={3}>
                    {notice.summary}
                  </Text>
                  <Text style={styles.cardDate}>
                    {notice.deadline ? `마감일 ${notice.deadline}` : `게시일 ${notice.date}`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveButton, isSaved && styles.savedButton]}
                  onPress={() => toggleNoticeReminder(notice)}
                  activeOpacity={0.85}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaved ? '캘린더에서 제거' : '마감일 저장'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}

function mapInterestToNoticeCategory(
  interest: InterestCategory | NoticeCategory
): NoticeCategory {
  switch (interest) {
    case 'Admission':
      return 'Academic';
    case 'Life':
      return 'Dormitory';
    default:
      return interest;
  }
}

function getInterestLabel(interest: InterestCategory | NoticeCategory) {
  switch (interest) {
    case 'Visa':
      return '비자';
    case 'TOPIK':
      return 'TOPIK';
    case 'Admission':
    case 'Academic':
      return '입학';
    case 'Scholarship':
      return '장학금';
    case 'Life':
    case 'Dormitory':
      return '생활';
    case 'Events':
      return '행사';
    default:
      return interest;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: 16,
    paddingBottom: 28,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  screenSubtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 18,
  },
  section: {
    marginBottom: 20,
  },
  categoryBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chip: {
    backgroundColor: '#FFF4BF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginRight: 8,
    marginBottom: 8,
  },
  chipText: {
    color: '#8A6A00',
    fontSize: 13,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    minHeight: 168,
  },
  criticalCard: {
    borderWidth: 1,
    borderColor: '#F3D76B',
    backgroundColor: '#FFFBEA',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: '#005BAC',
  },
  badge: {
    backgroundColor: '#DFF3FF',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    color: '#005BAC',
    fontWeight: '600',
  },
  imageBadge: {
    backgroundColor: '#DFF3FF',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  imageBadgeText: {
    fontSize: 11,
    color: '#005BAC',
    fontWeight: '600',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  cardSummary: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
    marginBottom: 10,
    minHeight: 66,
  },
  cardDate: {
    fontSize: 12,
    color: '#94A3B8',
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#005BAC',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  savedButton: {
    backgroundColor: '#38BDF8',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
});
