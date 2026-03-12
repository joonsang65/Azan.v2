import React, { useCallback, useEffect, useState } from "react";
import { Alert, Button, StyleSheet, Text, View } from "react-native";

import { apiRequest, clearToken } from "../api";

export default function HomeScreen({ onLogout }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  function isAuthError(message) {
    const msg = String(message || "").toLowerCase();
    return (
      msg.includes("missing or invalid bearer token") ||
      msg.includes("missing bearer token") ||
      msg.includes("invalid or expired token") ||
      msg.includes("token payload missing subject") ||
      msg.includes("invalid token subject") ||
      msg.includes("user not found")
    );
  }

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/auth/me");
      setProfile(data);
    } catch (error) {
      const message = error?.message || "Unknown error";
      if (isAuthError(message)) {
        await clearToken();
        Alert.alert("Session expired", "Please login again.");
        onLogout();
        return;
      }
      Alert.alert("Failed to load profile", message);
    } finally {
      setLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleLogout() {
    await clearToken();
    onLogout();
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Home</Text>
      <Text style={styles.text}>Email: {profile?.email || "-"}</Text>
      <Text style={styles.text}>Full Name: {profile?.full_name || "-"}</Text>

      <View style={styles.gap}>
        <Button title={loading ? "Refreshing..." : "Refresh /auth/me"} onPress={loadProfile} disabled={loading} />
      </View>
      <View style={styles.gap}>
        <Button title="Logout" onPress={handleLogout} />
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
  text: {
    fontSize: 16,
    marginBottom: 8,
  },
  gap: {
    marginTop: 8,
  },
});
