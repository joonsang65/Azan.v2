import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppContext } from '../context/AppContext';
import { getCategoryLabel } from '../i18n';
import type { NoticeCategory, NotificationFrequency } from '../types';

export default function NotificationSettingsScreen() {
  const insets = useSafeAreaInsets();
  const {
    selectedLanguage,
    selectedNoticeCategories,
    setSelectedNoticeCategories,
    notificationFrequency,
    setNotificationFrequency,
  } = useAppContext();

  const categories: NoticeCategory[] = [
    'Visa',
    'TOPIK',
    'Academic',
    'Events',
    'Scholarship',
    'Dormitory',
  ];

  const frequencyOptions: NotificationFrequency[] = ['Low', 'Medium', 'High'];

  const toggleCategory = (category: NoticeCategory) => {
    setSelectedNoticeCategories((prev) => {
      if (prev.includes(category)) {
        return prev.filter((item) => item !== category);
      }
      return [...prev, category];
    });
  };

  const handleSelectFrequency = (frequency: NotificationFrequency) => {
    setNotificationFrequency(frequency);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: insets.top + 18,
          paddingBottom: insets.bottom + 32,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.headerTitle}>알림 설정</Text>
      <Text style={styles.headerSubtitle}>
        중요한 공지 카테고리와 받고 싶은 알림 빈도를 선택해보세요
      </Text>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>중요 카테고리</Text>
        <Text style={styles.sectionDescription}>
          맞춤 알림을 받고 싶은 카테고리를 선택하세요
        </Text>

        <View style={styles.categoryList}>
          {categories.map((category) => {
            const isSelected = selectedNoticeCategories.includes(category);

            return (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryItem,
                  isSelected && styles.categoryItemSelected,
                ]}
                onPress={() => toggleCategory(category)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.categoryText,
                    isSelected && styles.categoryTextSelected,
                  ]}
                >
                  {getCategoryLabel(selectedLanguage, category)}
                </Text>

                {isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color="#005BAC" />
                ) : (
                  <Ionicons name="ellipse-outline" size={22} color="#CBD5E1" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>알림 빈도</Text>
        <Text style={styles.sectionDescription}>
          어느 정도 자주 알림을 받을지 설정하세요
        </Text>

        <View style={styles.frequencyRow}>
          {frequencyOptions.map((option) => {
            const isSelected = notificationFrequency === option;

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.frequencyButton,
                  isSelected && styles.frequencyButtonSelected,
                ]}
                onPress={() => handleSelectFrequency(option)}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.frequencyText,
                    isSelected && styles.frequencyTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>현재 설정</Text>
        <Text style={styles.summaryText}>
          카테고리:{' '}
          {selectedNoticeCategories.length > 0
            ? selectedNoticeCategories
                .map((category) => getCategoryLabel(selectedLanguage, category))
                .join(', ')
            : '없음'}
        </Text>
        <Text style={styles.summaryText}>알림 빈도: {notificationFrequency}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FB',
  },
  content: {
    padding: 16,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    marginBottom: 20,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  sectionDescription: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 14,
  },
  categoryList: {
    gap: 10,
  },
  categoryItem: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryItemSelected: {
    backgroundColor: '#E0F7FF',
    borderColor: '#38BDF8',
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  categoryTextSelected: {
    color: '#005BAC',
  },
  frequencyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  frequencyButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
  },
  frequencyButtonSelected: {
    backgroundColor: '#005BAC',
  },
  frequencyText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  frequencyTextSelected: {
    color: '#FFFFFF',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
});
