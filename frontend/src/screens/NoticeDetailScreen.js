import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { fetchNoticeDetail } from "../api";

function formatKoreanDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function NoticeDetailScreen({ noticeId, onBack }) {
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const detail = await fetchNoticeDetail(noticeId);
      setNotice(detail);
    } catch (e) {
      setError(e?.message || "공지 상세를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [noticeId]);

  useEffect(() => {
    load();
  }, [load]);

  const openLink = useCallback(async () => {
    if (!notice?.url) {
      return;
    }
    const supported = await Linking.canOpenURL(notice.url);
    if (supported) {
      await Linking.openURL(notice.url);
    }
  }, [notice?.url]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.8}>
          <Text style={styles.backText}>{"< 뒤로"}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#2f6df6" />
          <Text style={styles.hintText}>상세 공지를 불러오는 중...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      {!loading && !error && notice ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notice.keyword || ""}</Text>
          </View>
          <Text style={styles.dateText}>{formatKoreanDate(notice.published_at)}</Text>
          <Text style={styles.title}>{notice.title}</Text>
          <Text style={styles.body}>{notice.body || notice.preview}</Text>

          {notice.url ? (
            <TouchableOpacity style={styles.linkButton} onPress={openLink} activeOpacity={0.86}>
              <Text style={styles.linkButtonText}>Open link</Text>
            </TouchableOpacity>
          ) : null}
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  headerRow: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#f3f6ff",
  },
  backText: {
    color: "#244eb7",
    fontWeight: "700",
  },
  centerBox: {
    alignItems: "center",
    paddingTop: 40,
    gap: 10,
  },
  hintText: {
    color: "#64748b",
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 30,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    backgroundColor: "#edf2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 10,
  },
  badgeText: {
    fontSize: 12,
    color: "#2f5ec7",
    fontWeight: "700",
  },
  dateText: {
    fontSize: 13,
    color: "#64748b",
    marginBottom: 6,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0f172a",
    lineHeight: 32,
    marginBottom: 12,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    color: "#334155",
  },
  linkButton: {
    marginTop: 20,
    backgroundColor: "#2f6df6",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  linkButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15,
  },
});
