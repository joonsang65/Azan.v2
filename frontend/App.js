import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { getToken } from "./src/api";
import ChatbotScreen from "./src/screens/ChatbotScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LoginScreen from "./src/screens/LoginScreen";
import NoticeDetailScreen from "./src/screens/NoticeDetailScreen";
import NoticeScreen from "./src/screens/NoticeScreen";
import SettingsScreen from "./src/screens/SettingsScreen";
import SignupScreen from "./src/screens/SignupScreen";

export default function App() {
  const [screen, setScreen] = useState("login");
  const [tab, setTab] = useState("notice");
  const [selectedNoticeId, setSelectedNoticeId] = useState(null);
  const [noticeView, setNoticeView] = useState("list");
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function bootstrap() {
      const token = await getToken();
      setScreen(token ? "app" : "login");
      setTab("notice");
      setNoticeView("list");
      setInitializing(false);
    }
    bootstrap();
  }, []);

  if (initializing) {
    return <SafeAreaView style={styles.container} />;
  }

  const handleLogout = () => {
    setScreen("login");
    setTab("notice");
    setNoticeView("list");
    setSelectedNoticeId(null);
  };

  const renderAuthedContent = () => {
    if (tab === "home") {
      return <HomeScreen onLogout={handleLogout} />;
    }
    if (tab === "chatbot") {
      return <ChatbotScreen />;
    }
    if (tab === "notice") {
      if (noticeView === "settings") {
        return <SettingsScreen />;
      }
      if (selectedNoticeId) {
        return <NoticeDetailScreen noticeId={selectedNoticeId} onBack={() => setSelectedNoticeId(null)} />;
      }
      return (
        <NoticeScreen
          onSelectNotice={(id) => {
            setNoticeView("list");
            setSelectedNoticeId(id);
          }}
          onOpenSettings={() => {
            setSelectedNoticeId(null);
            setNoticeView("settings");
          }}
        />
      );
    }
    return null;
  };

  const onPressTab = (nextTab) => {
    setTab(nextTab);
    if (nextTab === "notice") {
      setNoticeView("list");
    }
    if (nextTab !== "notice") {
      setSelectedNoticeId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {screen === "login" && (
        <LoginScreen
          onLoginSuccess={() => {
            setScreen("app");
            setTab("notice");
            setNoticeView("list");
            setSelectedNoticeId(null);
          }}
          onGoSignup={() => setScreen("signup")}
          onGoNoticeTest={() => {
            setScreen("app");
            setTab("notice");
            setNoticeView("list");
            setSelectedNoticeId(null);
          }}
        />
      )}
      {screen === "signup" && (
        <SignupScreen
          onGoLogin={() => setScreen("login")}
          onSignupSuccess={() => {
            setScreen("app");
            setTab("notice");
            setNoticeView("list");
            setSelectedNoticeId(null);
          }}
        />
      )}
      {screen === "app" ? (
        <View style={styles.authedContainer}>
          <View style={styles.content}>{renderAuthedContent()}</View>
          <View style={styles.tabBar}>
            <TabButton
              label="홈"
              icon="⌂"
              selected={tab === "home"}
              onPress={() => onPressTab("home")}
            />
            <TabButton
              label="챗봇"
              icon="◎"
              selected={tab === "chatbot"}
              onPress={() => onPressTab("chatbot")}
            />
            <TabButton
              label="공지"
              icon="🔔"
              selected={tab === "notice"}
              onPress={() => onPressTab("notice")}
            />
          </View>
        </View>
      ) : null}
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

function TabButton({ label, icon, selected, onPress }) {
  return (
    <TouchableOpacity style={[styles.tabButton, selected ? styles.tabButtonSelected : null]} onPress={onPress}>
      <Text style={[styles.tabIcon, selected ? styles.tabTextSelected : styles.tabText]}>{icon}</Text>
      <Text style={[styles.tabLabel, selected ? styles.tabTextSelected : styles.tabText]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  authedContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#ffffff",
    borderTopWidth: 1,
    borderTopColor: "#dbe4f3",
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonSelected: {
    backgroundColor: "#2f6df6",
  },
  tabIcon: {
    fontSize: 16,
    marginBottom: 2,
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  tabText: {
    color: "#4b5d7a",
  },
  tabTextSelected: {
    color: "#ffffff",
  },
});
