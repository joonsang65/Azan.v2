import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

import { API_BASE_URL } from "../config";
import { apiRequest, pingApi, saveToken } from "../api";

export default function LoginScreen({ onLoginSuccess, onGoSignup, onGoNoticeTest }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [healthRaw, setHealthRaw] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Validation", "Please enter email and password.");
      return;
    }

    setLoading(true);
    try {
      await pingApi();
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await saveToken(data.access_token);
      onLoginSuccess();
    } catch (error) {
      Alert.alert("Login failed", error.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleTestConnection() {
    try {
      const data = await pingApi();
      setHealthRaw(`status=200 body=${JSON.stringify(data)} base=${API_BASE_URL}`);
    } catch (error) {
      setHealthRaw(`error=${String(error.message || error)}`);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      <Text style={styles.label}>Email address</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. yourname@ajou.ac.kr"
        placeholderTextColor="#8a8a8a"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        textContentType="emailAddress"
        value={email}
        onChangeText={setEmail}
      />
      <Text style={styles.label}>Password</Text>
      <TextInput
        style={styles.input}
        placeholder="Your password"
        placeholderTextColor="#8a8a8a"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />

      <View style={styles.gap}>
        <Button title={loading ? "Logging in..." : "Login"} onPress={handleLogin} disabled={loading} />
      </View>
      <View style={styles.gap}>
        <Button title="Go to Signup" onPress={onGoSignup} />
      </View>
      <View style={styles.gap}>
        <Button title="Go to Notices (Test)" onPress={onGoNoticeTest} />
      </View>
      <View style={styles.gap}>
        <Button title="Test Connection" onPress={handleTestConnection} />
      </View>
      <Text style={styles.rawText}>{healthRaw}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    marginBottom: 16,
    fontWeight: "600",
  },
  label: {
    fontSize: 14,
    color: "#222",
    marginBottom: 6,
    marginTop: 2,
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    backgroundColor: "#fff",
    color: "#111",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  gap: {
    marginTop: 8,
  },
  rawText: {
    marginTop: 14,
    fontSize: 12,
    color: "#444",
  },
});
