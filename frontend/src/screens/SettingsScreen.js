import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchKeywords, fetchMyKeywords, getToken, updateMyKeywords } from "../api";
import { getMyKeywordsCache } from "../api";

export default function SettingsScreen() {
  const [keywords, setKeywords] = useState([]);
  const [enabledSet, setEnabledSet] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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
      const [allKeywordsRes, myKeywordsRes] = await Promise.all([
        fetchKeywords(),
        fetchMyKeywords(token),
      ]);
      const nextKeywords = Array.isArray(allKeywordsRes) ? allKeywordsRes : [];
      const nextEnabled = Array.isArray(myKeywordsRes?.enabled) ? myKeywordsRes.enabled : [];
      setKeywords(nextKeywords);
      setEnabledSet(new Set(nextEnabled.map((value) => Number(value))));
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
    setEnabledSet((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  }, []);

  const onSave = useCallback(async () => {
    setError("");
    setSaving(true);
    try {
      const token = await getToken();
      const enabled = Array.from(enabledSet).sort((a, b) => a - b);
      const updated = await updateMyKeywords(token, enabled);
      const normalized = Array.isArray(updated?.enabled) ? updated.enabled : enabled;
      setEnabledSet(new Set(normalized.map((value) => Number(value))));
      Alert.alert("Saved", "Keyword preferences updated.");
    } catch (e) {
      const message = e?.message || "Failed to save settings.";
      setError(message);
      Alert.alert("Save failed", message);
    } finally {
      setSaving(false);
    }
  }, [enabledSet]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.sectionTitle}>Keyword Preferences</Text>

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
        </ScrollView>
      )}

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.saveButton, saving || loading ? styles.saveButtonDisabled : null]}
        onPress={onSave}
        disabled={saving || loading}
        activeOpacity={0.9}
      >
        {saving ? <ActivityIndicator size="small" color="#ffffff" /> : null}
        <Text style={styles.saveButtonText}>{saving ? "Saving..." : "Save"}</Text>
      </TouchableOpacity>
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
    marginBottom: 12,
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
    marginBottom: 10,
  },
  saveButton: {
    marginTop: "auto",
    backgroundColor: "#2f6df6",
    borderRadius: 12,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});
