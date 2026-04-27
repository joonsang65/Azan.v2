import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <ScrollView
        style={styles.messages}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 96 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.botRow}>
          <View style={styles.botAvatar}>
            <Text style={styles.botEmoji}>A</Text>
          </View>

          <View style={styles.botBubble}>
            <Text style={styles.botText}>
              안녕하세요. 아주대학교 유학생을 돕는 안내 챗봇입니다. 오늘은 무엇을
              도와드릴까요?
            </Text>
            <Text style={styles.timeText}>방금</Text>
          </View>
        </View>

        <View style={styles.quickColumn}>
          <TouchableOpacity style={styles.quickWideButton} activeOpacity={0.85}>
            <Ionicons name="document-text-outline" size={18} color="#5B6FB8" />
            <Text style={styles.quickWideText}>비자 연장 절차</Text>
            <Ionicons name="chevron-forward" size={18} color="#5B6FB8" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.quickWideButton} activeOpacity={0.85}>
            <Ionicons name="calendar-outline" size={18} color="#5B6FB8" />
            <Text style={styles.quickWideText}>학사 일정</Text>
            <Ionicons name="chevron-forward" size={18} color="#5B6FB8" />
          </TouchableOpacity>
        </View>

        <Text style={styles.topicTitle}>자주 찾는 주제</Text>

        <View style={styles.topicGrid}>
          <TopicButton icon="card-outline" label="비자 신청" />
          <TopicButton icon="school-outline" label="TOPIK 시험" />
          <TopicButton icon="reader-outline" label="수강신청" />
          <TopicButton icon="briefcase-outline" label="아르바이트" />
        </View>
      </ScrollView>

      <View style={[styles.inputBar, { bottom: 64 + insets.bottom }]}>
        <TouchableOpacity style={styles.smileButton} activeOpacity={0.85}>
          <Ionicons name="happy-outline" size={22} color="#7C88B6" />
        </TouchableOpacity>

        <TextInput
          placeholder="질문을 입력하세요..."
          placeholderTextColor="#98A2B3"
          style={styles.input}
        />

        <TouchableOpacity style={styles.sendCircle} activeOpacity={0.85}>
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TopicButton({
  icon,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}) {
  return (
    <TouchableOpacity style={styles.topicButton} activeOpacity={0.85}>
      <Ionicons name={icon} size={18} color="#5B6FB8" />
      <Text style={styles.topicText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F4F6FB',
  },
  messages: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 16,
  },
  botRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  botAvatar: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: '#E8EEFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  botEmoji: {
    fontSize: 26,
    fontWeight: '700',
    color: '#44528A',
  },
  botBubble: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  botText: {
    fontSize: 15,
    lineHeight: 23,
    color: '#3E4563',
  },
  timeText: {
    marginTop: 10,
    fontSize: 12,
    color: '#9AA3BF',
  },
  quickColumn: {
    marginTop: 16,
  },
  quickWideButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  quickWideText: {
    flex: 1,
    fontSize: 15,
    color: '#44528A',
    fontWeight: '600',
    marginLeft: 10,
  },
  topicTitle: {
    fontSize: 17,
    color: '#6B7390',
    marginTop: 10,
    marginBottom: 14,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  topicButton: {
    width: '48%',
    backgroundColor: '#F7F8FF',
    borderWidth: 1,
    borderColor: '#D9E1FF',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  topicText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#4C5678',
    fontWeight: '600',
    flexShrink: 1,
  },
  inputBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F7FF',
    borderTopWidth: 1,
    borderColor: '#E7E7F2',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
  },
  smileButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 11,
    fontSize: 15,
    color: '#334155',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sendCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#7EA2FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
});
