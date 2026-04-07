import React, { useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { apiRequest, saveToken } from "../api";

export default function LoginScreen({ onLoginSuccess, onGoSignup, onGoNoticeTest }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("입력 오류", "이메일과 비밀번호를 입력해 주세요.");
      return;
    }
    setLoading(true);
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      await saveToken(data.access_token);
      onLoginSuccess();
    } catch (error) {
      Alert.alert("로그인 실패", error.message || "알 수 없는 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      {/* Logo */}
      <View style={styles.logoArea}>
        <Image
          source={require("../../assets/ajou_logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />
      </View>

      <Text style={styles.welcome}>환영합니다!</Text>

      {/* Form */}
      <View style={styles.form}>
        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>이메일:</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
        </View>

        <View style={styles.fieldRow}>
          <Text style={styles.fieldLabel}>비밀번호:</Text>
          <TextInput
            style={styles.input}
            placeholder=""
            placeholderTextColor="#aaa"
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{loading ? "로그인 중..." : "로그인"}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.button}
            onPress={onGoSignup}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>회원가입</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Test shortcut */}
      <TouchableOpacity style={styles.testButton} onPress={onGoNoticeTest} activeOpacity={0.8}>
        <Text style={styles.testButtonText}>홈화면바로가기{"\n"}(for Test)</Text>
      </TouchableOpacity>
    </View>
  );
}

const BG = "#2855a6";
const BTN = "#1a3770";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  logoArea: {
    alignItems: "center",
    marginBottom: 16,
  },
  logoImage: {
    width: 140,
    height: 140,
  },
  welcome: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 32,
  },
  form: {
    width: "100%",
    gap: 14,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fieldLabel: {
    width: 62,
    fontSize: 15,
    fontWeight: "600",
    color: "#ffffff",
    textAlign: "right",
  },
  input: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#111",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  button: {
    flex: 1,
    backgroundColor: BTN,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  testButton: {
    position: "absolute",
    bottom: 24,
    right: 24,
    backgroundColor: BTN,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  testButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
  },
});
