import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { authService } from "../services/auth";
import { useAppContext } from "../context/AppContext";

export default function LoginScreen() {
  const router = useRouter();
  const { setUserProfileStatus } = useAppContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password.");
      return;
    }
    setLoading(true);
    try {
      await authService.login(email, password);
      
      // 로그인 성공 후 유저 정보 즉시 로드하여 전역 상태 업데이트
      const me = await authService.getMe();
      if (me) {
        setUserProfileStatus(prev => ({
          ...prev,
          name: me.full_name,
          email: me.email,
          preferredLanguage: (me as any).preferred_language || prev.preferredLanguage,
        }));
      }
      
      router.replace("/(tabs)");
    } catch (error: any) {
      Alert.alert("Login Failed", error.message || "Unknown error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome Back</Text>
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity 
          style={[styles.button, loading && { opacity: 0.7 }]} 
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? "Logging in..." : "Login"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.push("/auth/signup")}>
          <Text style={styles.linkText}>{"Don't have an account? Sign up"}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 30, backgroundColor: "#fff" },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 40, textAlign: "center", color: "#2f6df6" },
  form: { gap: 15 },
  input: { borderWidth: 1, borderColor: "#ddd", padding: 15, borderRadius: 10, fontSize: 16 },
  button: { backgroundColor: "#2f6df6", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 10 },
  buttonText: { color: "#fff", fontSize: 18, fontWeight: "bold" },
  linkText: { color: "#2f6df6", textAlign: "center", marginTop: 15 }
});
