import Ionicons from '@expo/vector-icons/Ionicons';
import React, { useState, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Keyboard,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { chatbotService } from '../services/chatbot';
import { useI18n } from '../i18n';
import { useAppContext } from '../context/AppContext';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const headerHeight = 64 + insets.top; // Header height from _layout.tsx
  
  const { selectedLanguage } = useAppContext();
  const { translate } = useI18n(selectedLanguage);
  
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  // 세션 ID 초기화 (화면 진입 시마다 새로운 세션 생성)
  const [sessionId] = useState(() => `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardVisible(false));

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Initialize welcome message when language changes or on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: '1',
          text: translate('chat.welcome'),
          sender: 'bot',
          time: '방금',
        },
      ]);
    }
  }, [selectedLanguage]);

  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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
        text: translate('chat.error'),
        sender: 'bot',
        time: '방금',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  return (
    <View style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.avoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? headerHeight : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messages}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 20 },
          ]}
          keyboardShouldPersistTaps="handled"
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

          <Text style={styles.topicTitle}>{translate('chat.topicTitle')}</Text>
          <View style={styles.topicGrid}>
            <TopicButton 
              icon="school-outline" 
              label={translate('chat.topic.topik')} 
              onPress={() => handleSend(translate('chat.topic.topikQuery'))} 
            />
            <TopicButton 
              icon="card-outline" 
              label={translate('chat.topic.visa')} 
              onPress={() => handleSend(translate('chat.topic.visaQuery'))} 
            />
            <TopicButton 
              icon="home-outline" 
              label={translate('chat.topic.dorm')} 
              onPress={() => handleSend(translate('chat.topic.dormQuery'))} 
            />
            <TopicButton 
              icon="ribbon-outline" 
              label={translate('chat.topic.scholarship')} 
              onPress={() => handleSend(translate('chat.topic.scholarshipQuery'))} 
            />
          </View>
        </ScrollView>

        <View
          style={[
            styles.inputBar,
            {
              paddingBottom: 14,
              marginBottom: isKeyboardVisible ? 0 : tabBarHeight,
            },
          ]}
        >
          <TextInput
            placeholder={translate('chat.placeholder')}
            placeholderTextColor="#98A2B3"
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => handleSend()}
            multiline={false}
          />
          <TouchableOpacity 
            style={[styles.sendCircle, (!inputText.trim() || loading) && { backgroundColor: '#BDC7E0' }]} 
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
          >
            <Ionicons name="send" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
  avoidingView: { flex: 1 },
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
  inputBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', borderTopWidth: 1, borderColor: '#E7E7F2', paddingHorizontal: 16, paddingTop: 10, zIndex: 20, elevation: 20 },
  input: { flex: 1, backgroundColor: '#F4F6FB', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#334155' },
  sendCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#5B6FB8', alignItems: 'center', justifyContent: 'center', marginLeft: 10 },
});
