import { StyleSheet, Text, View } from 'react-native';
import type { Notice } from '../../types';

type Props = {
  notice: Notice;
};

export default function NoticeCard({ notice }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.category}>{notice.category}</Text>
        {notice.isCritical ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>중요</Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.title}>{notice.title}</Text>
      <Text style={styles.meta}>
        {notice.deadline ? `마감일 ${notice.deadline}` : `게시일 ${notice.date}`}
      </Text>
      <Text style={styles.body}>
        {notice.summary || notice.description || '상세 내용은 공지 화면에서 확인하세요.'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  category: {
    fontSize: 12,
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
    fontWeight: '600',
    color: '#B91C1C',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#17324D',
    marginBottom: 8,
  },
  meta: {
    fontSize: 13,
    color: '#5C748C',
    marginBottom: 8,
  },
  body: {
    fontSize: 14,
    color: '#334E68',
    lineHeight: 21,
  },
});
