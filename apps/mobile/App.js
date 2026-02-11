import { StatusBar } from "expo-status-bar";
import React, { useEffect, useState } from "react";
import { SafeAreaView, Text } from "react-native";

export default function App() {
  const [health, setHealth] = useState("unknown");

  useEffect(() => {
    fetch("http://localhost:8000/health")
      .then((res) => res.json())
      .then((data) => setHealth(data.status || "unknown"))
      .catch(() => setHealth("unreachable"));
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
      <Text>Hello</Text>
      <Text>API health: {health}</Text>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}
