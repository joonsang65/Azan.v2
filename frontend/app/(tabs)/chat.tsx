import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState, useRef } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatbotService } from '../services/chatbot';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  
  // 세션 ID 초기화 (화면 진입 시마다 새로운 세션 생성)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: '안녕하세요. 아주대학교 유학생을 돕는 안내 챗봇입니다. 오늘은 무엇을 도와드릴까요?',
      sender: 'bot',
      time: '방금',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputBottom = keyboardVisible ? keyboardHeight : tabBarHeight;

  React.useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', (event) => {
      setKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates.height);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      });
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleSend = async (text: string = inputText) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      text: text.trim(),
      sender: 'user',
      time: '방금',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setLoading(true);

    try {
      const response = await chatbotService.sendMessage(text.trim(), sessionId);
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: response.answer,
        sender: 'bot',
        time: '방금',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: '죄송합니다. 응답을 가져오는 중에 오류가 발생했습니다.',
        sender: 'bot',
        time: '방금',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        ref={scrollViewRef}
        style={styles.messages}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 110 + inputBottom },
        ]}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {messages.map((msg) => (
          <View key={msg.id} style={msg.sender === 'user' ? styles.userRow : styles.botRow}>
            {msg.sender === 'bot' && (
              <View style={styles.botAvatar}>
                <Text style={styles.botEmoji}>A</Text>
              </View>
            )}
            <View style={msg.sender === 'user' ? styles.userBubble : styles.botBubble}>
              <Text style={msg.sender === 'user' ? styles.userText : styles.botText}>
                {msg.text}
              </Text>
              <Text style={styles.timeText}>{msg.time}</Text>
            </View>
          </View>
        ))}
        {loading && (
          <View style={styles.botRow}>
            <View style={styles.botAvatar}>
              <Text style={styles.botEmoji}>A</Text>
            </View>
            <View style={[styles.botBubble, { alignItems: 'center', justifyContent: 'center' }]}>
              <ActivityIndicator size="small" color="#5B6FB8" />
            </View>
          </View>
        )}

        <Text style={styles.topicTitle}>자주 찾는 주제</Text>
        <View style={styles.topicGrid}>
          <TopicButton icon="school-outline" label="TOPIK 시험 일정" onPress={() => handleSend("TOPIK 시험 일정 알려줘")} />
          <TopicButton icon="card-outline" label="비자 연장" onPress={() => handleSend("비자 연장 방법 알려줘")} />
          <TopicButton icon="home-outline" label="기숙사 신청" onPress={() => handleSend("기숙사 신청 방법 알려줘")} />
          <TopicButton icon="ribbon-outline" label="장학금" onPress={() => handleSend("장학금 정보 알려줘")} />
        </View>
      </ScrollView>

      <View
        style={[
          styles.inputBar,
          {
            paddingBottom: Math.max(insets.bottom, 10),
            bottom: inputBottom,
          },
        ]}
      >
        <TextInput
          placeholder="질문을 입력하세요..."
          placeholderTextColor="#98A2B3"
          style={styles.input}
          value={inputText}
          onChangeText={setInputText}
          onFocus={() =>
            requestAnimationFrame(() => {
              scrollViewRef.current?.scrollToEnd({ animated: true });
            })
          }
          onSubmitEditing={() => handleSend()}
        />
        <TouchableOpacity 
          style={[styles.sendCircle, (!inputText.trim() || loading) && { backgroundColor: '#BDC7E0' }]} 
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
        >
          <Ionicons name="send" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function TopicButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.topicButton} activeOpacity={0.85} onPress={onPress}>
      <Ionicons name={icon} size={18} color="#5B6FB8" />
      <Text style={styles.topicText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F4F6FB' },
  messages: { flex: 1 },
  content: { padding: 16 },
  botRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 12 },
  userRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'flex-end', marginTop: 12 },
  botAvatar: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#E8EEFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  botEmoji: { fontSize: 20, fontWeight: '700', color: '#44528A' },
  botBubble: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 14, borderWidth: 1, borderColor: '#E5E7EB', maxWidth: '80%' },
  userBubble: { backgroundColor: '#5B6FB8', borderRadius: 20, padding: 14, maxWidth: '80%' },
  botText: { fontSize: 15, lineHeight: 22, color: '#3E4563' },
  userText: { fontSize: 15, lineHeight: 22, color: '#FFFFFF' },
  timeText: { marginTop: 6, fontSize: 11, color: '#9AA3BF', textAlign: 'right' },
  topicTitle: { fontSize: 16, color: '#6B7390', marginTop: 24, marginBottom: 12, fontWeight: '600' },
  topicGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  topicButton: { width: '48%', backgroundColor: '#F7F8FF', borderWidth: 1, borderColor: '#D9E1FF', borderRadius: 18, paddingVertical: 14, paddingHorizontal: 12, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  topicText: { marginLeft: 8, fontSize: 13, color: '#4C5678', fontWeight: '600', flexShrink: 1 },
  inputBar: { position: 'absolute', left: 0, right: 0, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E7E7F2', paddingHorizontal: 16, paddingTop: 10, zIndex: 20, elevation: 20 },
  input: { flex: 1, backgroundColor: '#F4F6FB', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#334155' },
  sendCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B6FB8', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});
