import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchKeywords, fetchMe, fetchMyKeywords, getToken, updateMyKeywords } from "../api";
import { getMyKeywordsCache } from "../api";

export default function SettingsScreen() {
  const [username, setUsername] = useState("");
  const [keywords, setKeywords] = useState([]);
  const [enabledSet, setEnabledSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const syncQueueRef = useRef(Promise.resolve());
  const pendingSyncCountRef = useRef(0);

  const sortedKeywords = useMemo(() => {
    return [...keywords].sort((a, b) => {
      return String(a?.keyword || "").localeCompare(String(b?.keyword || ""));
    });
  }, [keywords]);

  const loadData = useCallback(async () => {
    setError("");
    setLoading(true);
    try {
      const token = await getToken();
      const cachedEnabled = await getMyKeywordsCache();
      if (Array.isArray(cachedEnabled) && cachedEnabled.length) {
        setEnabledSet(new Set(cachedEnabled.map((value) => Number(value))));
      }

      const allKeywordsRes = await fetchKeywords();
      const nextKeywords = Array.isArray(allKeywordsRes) ? allKeywordsRes : [];
      setKeywords(nextKeywords);

      if (!token) {
        setEnabledSet(new Set());
        setError("로그인이 필요합니다. 다시 로그인해 주세요.");
        return;
      }

      try {
        const me = await fetchMe();
        setUsername(me?.full_name || me?.email || "");
      } catch (_e) {
        // non-critical — greeting is optional
      }

      try {
        const myKeywordsRes = await fetchMyKeywords(token);
        const nextEnabled = Array.isArray(myKeywordsRes?.enabled) ? myKeywordsRes.enabled : [];
        setEnabledSet(new Set(nextEnabled.map((value) => Number(value))));
      } catch (e) {
        setEnabledSet(new Set());
        setError(e?.message || "키워드 구독 상태를 불러오지 못했습니다.");
      }
    } catch (e) {
      setError(e?.message || "Failed to load settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onToggleKeyword = useCallback((keyId) => {
    setError("");
    let nextEnabled = [];
    setEnabledSet((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      nextEnabled = Array.from(next).sort((a, b) => a - b);
      return next;
    });

    pendingSyncCountRef.current += 1;
    setSyncing(true);

    syncQueueRef.current = syncQueueRef.current
      .then(async () => {
        const token = await getToken();
        const updated = await updateMyKeywords(token, nextEnabled);
        const normalized = Array.isArray(updated?.enabled) ? updated.enabled : nextEnabled;
        setEnabledSet(new Set(normalized.map((value) => Number(value))));
      })
      .catch((e) => {
        const message = e?.message || "Failed to sync keyword preference.";
        setError(message);
        Alert.alert("Sync failed", message);
      })
      .finally(() => {
        pendingSyncCountRef.current = Math.max(0, pendingSyncCountRef.current - 1);
        if (pendingSyncCountRef.current === 0) {
          setSyncing(false);
        }
      });
  }, []);

  return (
    <View style={styles.container}>
      {username ? (
        <Text style={styles.greeting}>Hi, {username} 👋</Text>
      ) : null}
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sectionTitle}>Keyword Preferences</Text>
      <Text style={styles.description}>
        해당 카테고리를 클릭하시면 관련된 공지사항을 주기적인 푸쉬 알람으로 수신하실 수 있습니다.
      </Text>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#2f6df6" />
          <Text style={styles.hintText}>Loading keyword preferences...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.chipsContainer}>
          {sortedKeywords.map((keyword) => {
            const keyId = Number(keyword?.id);
            if (!Number.isFinite(keyId)) {
              return null;
            }
            const selected = enabledSet.has(keyId);
            return (
              <TouchableOpacity
                key={String(keyId)}
                style={[styles.chip, selected ? styles.chipEnabled : styles.chipDisabled]}
                onPress={() => onToggleKeyword(keyId)}
                activeOpacity={0.85}
              >
                <Text style={[styles.chipText, selected ? styles.chipTextEnabled : styles.chipTextDisabled]}>
                  {keyword?.keyword || ""}
                </Text>
              </TouchableOpacity>
            );
          })}
          {!sortedKeywords.length ? <Text style={styles.hintText}>등록된 키워드가 없습니다.</Text> : null}
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {syncing ? <Text style={styles.syncText}>Syncing changes...</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 18,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  greeting: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2f6df6",
    marginBottom: 4,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1e293b",
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    color: "#64748b",
    lineHeight: 20,
    marginBottom: 16,
  },
  centerBox: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    gap: 8,
  },
  hintText: {
    color: "#64748b",
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingBottom: 20,
  },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
  },
  chipEnabled: {
    backgroundColor: "#2f6df6",
    borderColor: "#2f6df6",
  },
  chipDisabled: {
    backgroundColor: "#f8fafc",
    borderColor: "#dbe4f3",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  chipTextEnabled: {
    color: "#ffffff",
  },
  chipTextDisabled: {
    color: "#475569",
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "600",
    marginTop: 6,
    marginBottom: 6,
  },
  syncText: {
    marginTop: "auto",
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
});
