import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { TOPIC_DATA } from '../data/topicData';

type TopicKey = keyof typeof TOPIC_DATA;

export default function TopicScreen() {
  const router = useRouter();
  const { topicKey } = useLocalSearchParams();

  const key = Array.isArray(topicKey) ? topicKey[0] : topicKey;
  const topic = key && key in TOPIC_DATA ? TOPIC_DATA[key as TopicKey] : undefined;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => router.back()}
            activeOpacity={0.85}
          >
            <Ionicons name="chevron-back" size={24} color="#0F172A" />
          </TouchableOpacity>

          <Text style={styles.headerTitle}>Information</Text>

          <View style={styles.iconButtonPlaceholder} />
        </View>

        {topic ? (
          <>
            <View style={styles.hero}>
              <Text style={styles.title}>{topic.title}</Text>
              <Text style={styles.subtitle}>{topic.subtitle}</Text>
            </View>

            {topic.sections.map((section) => (
              <View key={section.title} style={styles.card}>
                <Text style={styles.sectionTitle}>{section.title}</Text>

                {section.items.map((item) => (
                  <View key={item} style={styles.bulletRow}>
                    <View style={styles.bullet} />
                    <Text style={styles.bulletText}>{item}</Text>
                  </View>
                ))}
              </View>
            ))}
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>존재하지 않는 토픽</Text>
            <Text style={styles.emptyText}>메뉴에서 다시 선택해주세요.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  container: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 44,
    height: 44,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  hero: {
    backgroundColor: '#FFF4BF',
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F3D76B',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#64748B',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 14,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#005BAC',
    marginTop: 8,
    marginRight: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    color: '#475569',
  },
  emptyText: {
    fontSize: 14,
    lineHeight: 21,
    color: '#64748B',
  },
});
