import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAppContext } from '../context/AppContext';
import type { NoticeCategory } from '../types';

const CATEGORIES: (NoticeCategory | 'All')[] = [
  'All',
  'Visa',
  'TOPIK',
  'Academic',
  'Events',
  'Scholarship',
  'Dormitory',
];

export default function NoticesScreen() {
  const router = useRouter();
  const { notices, toggleNoticeReminder, savedNoticeReminders } = useAppContext();
  const [selectedCategory, setSelectedCategory] =
    useState<NoticeCategory | 'All'>('All');

  const filteredNotices =
    selectedCategory === 'All'
      ? notices
      : notices.filter((notice) => notice.category === selectedCategory);

  const handlePressNotice = (id: string) => {
    router.push({ pathname: '/notices/[id]', params: { id } });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabsContainer}
        showsHorizontalScrollIndicator={false}
      >
        {CATEGORIES.map((category) => {
          const isActive = selectedCategory === category;
          const label = category === 'All' ? '전체' : category;

          return (
            <TouchableOpacity
              key={category}
              style={[styles.tab, isActive && styles.activeTab]}
              onPress={() => setSelectedCategory(category)}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.tabText, isActive && styles.activeTabText]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.noticeList}
        contentContainerStyle={[
          styles.noticeListContent,
          filteredNotices.length === 0 && styles.emptyListContent,
        ]}
        showsVerticalScrollIndicator={false}
      >
        {filteredNotices.length > 0 ? (
          filteredNotices.map((notice) => {
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

                    <View style={styles.badgeRow}>
                      {notice.hasAttachmentOnly ? (
                        <View style={styles.imageBadge}>
                          <Text style={styles.imageBadgeText}>이미지 첨부</Text>
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
                  <Text style={styles.summary} numberOfLines={3}>
                    {notice.summary}
                  </Text>
                  <Text style={styles.date}>
                    {notice.deadline
                      ? `마감일 ${notice.deadline}`
                      : `게시일 ${notice.date}`}
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
        ) : (
          <View style={styles.emptyCard}>
            <Ionicons name="document-text-outline" size={34} color="#94A3B8" />
            <Text style={styles.emptyTitle}>공지사항이 없습니다</Text>
            <Text style={styles.emptyDescription}>
              선택한 카테고리에 표시할 공지가 없습니다.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F4F7FB',
  },
  tabsScroll: {
    flexGrow: 0,
    height: 48,
    maxHeight: 48,
    marginBottom: 14,
  },
  tabsContainer: {
    alignItems: 'center',
    paddingRight: 16,
  },
  tab: {
    height: 44,
    minWidth: 82,
    maxWidth: 150,
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 18,
    borderRadius: 22,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    backgroundColor: '#D95C4F',
  },
  tabText: {
    color: '#334155',
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '500',
    textAlign: 'center',
  },
  activeTabText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noticeList: {
    flex: 1,
  },
  noticeListContent: {
    paddingBottom: 104,
  },
  emptyListContent: {
    flexGrow: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 14,
    minHeight: 184,
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
    gap: 8,
    flexShrink: 1,
  },
  category: {
    fontSize: 12,
    fontWeight: '700',
    color: '#D95C4F',
    marginRight: 12,
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
    fontWeight: '700',
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
    fontWeight: '700',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    lineHeight: 23,
    marginBottom: 6,
  },
  summary: {
    fontSize: 14,
    color: '#475569',
    marginBottom: 10,
    lineHeight: 20,
    minHeight: 60,
  },
  date: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  saveButton: {
    marginTop: 12,
    backgroundColor: '#D95C4F',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  savedButton: {
    backgroundColor: '#0F766E',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyCard: {
    minHeight: 184,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyDescription: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
    textAlign: 'center',
  },
});
