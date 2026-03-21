import React, { useState } from "react";
import { Alert, Button, StyleSheet, Text, TextInput, View } from "react-native";

import { apiRequest, saveToken } from "../api";

export default function SignupScreen({ onGoLogin, onSignupSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSignup() {
    if (!email || !password || !fullName) {
      Alert.alert("Validation", "Please fill all fields.");
      return;
    }

    setLoading(true);
    try {
      // backend: /auth/register 호출
      await apiRequest("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, full_name: fullName }),
      });
      const loginData = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await saveToken(loginData.access_token);
      if (onSignupSuccess) {
        onSignupSuccess();
      } else {
        Alert.alert("Success", "Signup completed. Please login.");
        onGoLogin();
      }
    } catch (error) {
      Alert.alert("Signup failed", error.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Signup</Text>
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
        placeholder="At least 6 characters"
        placeholderTextColor="#8a8a8a"
        secureTextEntry
        textContentType="password"
        value={password}
        onChangeText={setPassword}
      />
      <Text style={styles.label}>Full name</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Hong Gildong"
        placeholderTextColor="#8a8a8a"
        autoCorrect={false}
        textContentType="name"
        value={fullName}
        onChangeText={setFullName}
      />

      <View style={styles.gap}>
        <Button title={loading ? "Signing up..." : "Signup"} onPress={handleSignup} disabled={loading} />
      </View>
      <View style={styles.gap}>
        <Button title="Back to Login" onPress={onGoLogin} />
      </View>
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
});