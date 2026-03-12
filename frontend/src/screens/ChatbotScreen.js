import React from "react";
import { StyleSheet, Text, View } from "react-native";

export default function ChatbotScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>챗봇</Text>
      <Text style={styles.text}>챗봇 화면은 다음 단계에서 연결됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#ffffff",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  text: {
    fontSize: 16,
    color: "#4a4a4a",
  },
});
