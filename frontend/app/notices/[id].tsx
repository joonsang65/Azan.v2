import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';

export default function NoticeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    notices,
    savedNoticeReminders,
    toggleNoticeReminder,
    toggleNoticeReminderDone,
  } = useAppContext();

  const notice = notices.find((item) => item.id === id);
  const savedReminder = savedNoticeReminders.find((item) => item.noticeId === id);

  const handleOpenLink = async () => {
    if (!notice?.link) {
      return;
    }

    const supported = await Linking.canOpenURL(notice.link);

    if (supported) {
      await Linking.openURL(notice.link);
    }
  };

  if (!notice) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>공지를 찾을 수 없습니다</Text>
        <Text style={styles.emptyText}>
          찾으시는 공지가 삭제되었거나 존재하지 않습니다.
        </Text>

        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>뒤로 가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formattedDescription = formatNoticeDescription(
    notice.description,
    notice.hasAttachmentOnly
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.categoryRow}>
        <Text style={styles.category}>{notice.category}</Text>
        <View style={styles.badgeRow}>
          {notice.hasAttachmentOnly ? (
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>이미지 첨부 공지</Text>
            </View>
          ) : null}
          {notice.isCritical ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>중요</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.title}>{notice.title}</Text>
      <Text style={styles.date}>
        {notice.deadline ? `마감일 ${notice.deadline}` : `게시일 ${notice.date}`}
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[
            styles.primaryActionButton,
            savedReminder && styles.primaryActionButtonSaved,
          ]}
          onPress={() => toggleNoticeReminder(notice)}
          activeOpacity={0.85}
        >
          <Text style={styles.primaryActionText}>
            {savedReminder ? '캘린더에서 제거' : '마감일을 캘린더에 저장'}
          </Text>
        </TouchableOpacity>

        {savedReminder ? (
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => toggleNoticeReminderDone(savedReminder.id)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryActionText}>
              {savedReminder.isDone ? '미완료로 변경' : '완료로 표시'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>요약</Text>
        <Text style={styles.sectionText}>{notice.summary}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>상세 내용</Text>
        <Text style={styles.sectionText}>{formattedDescription}</Text>
      </View>

      {notice.link ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>참고 링크</Text>
          <TouchableOpacity onPress={handleOpenLink} activeOpacity={0.8}>
            <Text style={styles.linkText}>{notice.link}</Text>
            <Text style={styles.linkHint}>눌러서 브라우저에서 열기</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>공지 목록으로 돌아가기</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function formatNoticeDescription(
  description: string | undefined,
  hasAttachmentOnly: boolean | undefined
) {
  if (!description) {
    return hasAttachmentOnly
      ? '이 공지는 본문 텍스트 없이 이미지 첨부로 제공됩니다.\n\n아래 참고 링크를 눌러 원문 이미지를 확인하세요.'
      : '추가로 제공된 상세 내용이 없습니다.';
  }

  return description
    .replace(/\s+/g, ' ')
    .replace(/(■)/g, '\n\n$1')
    .replace(/(○)/g, '\n$1')
    .replace(/(※)/g, '\n$1')
    .replace(/(\d+\))/g, '\n$1')
    .replace(/(원서접수 기간\s*:)/g, '\n\n$1')
    .replace(/(지원자 정보 정정 신청 기간\s*:)/g, '\n\n$1')
    .replace(/(지원자 사진 정정 신청 기간\s*:)/g, '\n\n$1')
    .replace(/(시험 일자\s*:)/g, '\n\n$1')
    .replace(/(시험 방식\s*:)/g, '\n\n$1')
    .replace(/(수험표 출력 기간)/g, '\n\n$1')
    .replace(/(성적 발표)/g, '\n\n$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: 20,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  category: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D95C4F',
  },
  badge: {
    backgroundColor: '#FEE2E2',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  badgeText: {
    fontSize: 11,
    color: '#B91C1C',
    fontWeight: '600',
  },
  imageBadge: {
    backgroundColor: '#DBEAFE',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  imageBadgeText: {
    fontSize: 11,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 32,
    marginBottom: 8,
  },
  date: {
    fontSize: 13,
    color: '#94A3B8',
    marginBottom: 16,
  },
  actionRow: {
    marginBottom: 24,
    gap: 10,
  },
  primaryActionButton: {
    backgroundColor: '#D95C4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionButtonSaved: {
    backgroundColor: '#0F766E',
  },
  primaryActionText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryActionButton: {
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryActionText: {
    color: '#334155',
    fontSize: 15,
    fontWeight: '700',
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  sectionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 28,
  },
  linkText: {
    fontSize: 14,
    color: '#2563EB',
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
  linkHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  backButton: {
    backgroundColor: '#D95C4F',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F4F7FB',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
});
