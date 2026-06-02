import { useLocalSearchParams, useRouter } from 'expo-router';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getCategoryLabel, t } from '../i18n';
import { useAppContext } from '../context/AppContext';
import { NoticeImage } from '../components/notices/NoticeImage';

export default function NoticeDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    notices,
    savedNoticeReminders,
    selectedLanguage,
    toggleNoticeReminder,
    toggleNoticeReminderDone,
  } = useAppContext();

  const notice = notices.find((item) => item.id === id);
  const savedReminder = savedNoticeReminders.find((item) => item.noticeId === id);

  const handleOpenLink = async () => {
    if (!notice?.link) return;
    const supported = await Linking.canOpenURL(notice.link);
    if (supported) {
      await Linking.openURL(notice.link);
    }
  };

  if (!notice) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>공지를 찾을 수 없습니다</Text>
        <Text style={styles.emptyText}>삭제되었거나 더 이상 제공되지 않는 공지입니다.</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>뒤로 가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const bodyToShow =
    selectedLanguage === 'English' && notice.engBody
      ? notice.engBody
      : notice.description;
  const formattedDescription = formatNoticeDescription(bodyToShow, notice.hasAttachmentOnly);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 18 }]}
    >
      <View style={styles.categoryRow}>
        <Text style={styles.category}>
          {getCategoryLabel(selectedLanguage, notice.category)}
        </Text>
        <View style={styles.badgeRow}>
          {notice.hasAttachmentOnly ? (
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>
                {t(selectedLanguage, 'notices.imageAttachment')}
              </Text>
            </View>
          ) : null}
          {notice.isCritical ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{t(selectedLanguage, 'notices.important')}</Text>
            </View>
          ) : null}
        </View>
      </View>

      <Text style={styles.title}>{notice.title}</Text>
      <Text style={styles.date}>
        {notice.deadline
          ? `${t(selectedLanguage, 'notices.deadline')} ${notice.deadline}`
          : `${t(selectedLanguage, 'notices.posted')} ${notice.date}`}
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
            {savedReminder
              ? t(selectedLanguage, 'notices.removeFromCalendar')
              : t(selectedLanguage, 'notices.saveDeadline')}
          </Text>
        </TouchableOpacity>

        {savedReminder ? (
          <TouchableOpacity
            style={styles.secondaryActionButton}
            onPress={() => toggleNoticeReminderDone(savedReminder.id)}
            activeOpacity={0.85}
          >
            <Text style={styles.secondaryActionText}>
              {savedReminder.isDone
                ? selectedLanguage === 'Korean'
                  ? '미완료로 표시'
                  : 'Mark as not done'
                : selectedLanguage === 'Korean'
                  ? '완료로 표시'
                  : 'Mark as done'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{selectedLanguage === 'Korean' ? '요약' : 'Summary'}</Text>
        <Text style={styles.sectionText}>{notice.summary}</Text>
      </View>

      {notice.imageUrls?.length ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedLanguage === 'Korean' ? '이미지' : 'Images'}
          </Text>
          {notice.imageUrls.map((imageUrl) => (
            <NoticeImage
              key={imageUrl}
              uri={imageUrl}
              style={styles.noticeImage}
              fallbackHeight={220}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedLanguage === 'Korean' ? '상세 내용' : 'Details'}
        </Text>
        <Text style={styles.sectionText}>{formattedDescription}</Text>
      </View>

      {notice.link ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {selectedLanguage === 'Korean' ? '참고 링크' : 'Reference Link'}
          </Text>
          <TouchableOpacity onPress={handleOpenLink} activeOpacity={0.8}>
            <Text style={styles.linkText}>{notice.link}</Text>
            <Text style={styles.linkHint}>
              {selectedLanguage === 'Korean'
                ? '브라우저에서 열기'
                : 'Open in browser'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backButtonText}>
          {selectedLanguage === 'Korean' ? '돌아가기' : 'Go Back'}
        </Text>
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
      ? '본문 텍스트 없이 이미지 또는 첨부파일로 제공된 공지입니다. 참고 링크에서 원문을 확인하세요.'
      : '추가로 제공된 상세 내용이 없습니다.';
  }

  return description
    .replace(/\s+/g, ' ')
    .replace(/(\d+\))/g, '\n$1')
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
    paddingBottom: 48,
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
    backgroundColor: '#005BAC',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryActionButtonSaved: {
    backgroundColor: '#38BDF8',
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
    lineHeight: 26,
  },
  noticeImage: {
    width: '100%',
    borderRadius: 10,
    marginBottom: 10,
  },
  linkText: {
    fontSize: 14,
    color: '#005BAC',
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
  linkHint: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 6,
  },
  backButton: {
    backgroundColor: '#005BAC',
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
