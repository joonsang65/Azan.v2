import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { fetchKeywords, fetchNotices, pingDatabase } from "../api";

function formatKoreanDate(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export default function NoticeScreen({ onSelectNotice, onOpenSettings }) {
  const [keywords, setKeywords] = useState([]);
  const [selectedKeywordIds, setSelectedKeywordIds] = useState(new Set());
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [dbUnavailable, setDbUnavailable] = useState(false);

  const toFriendlyMessage = useCallback((incoming) => {
    const text = String(incoming || "");
    if (text.includes("DB connection failed")) {
      return "서버 데이터베이스 연결이 불안정합니다. 잠시 후 다시 시도해 주세요.";
    }
    return text || "공지사항을 불러오지 못했습니다.";
  }, []);

  const loadKeywords = useCallback(async () => {
    const data = await fetchKeywords();
    const incoming = Array.isArray(data) ? data : [];
    const next = [{ id: null, keyword: "전체", isAll: true }, ...incoming];
    setKeywords(next);
  }, []);

  const loadNotices = useCallback(async (keywordIds) => {
    let items;

    if (!keywordIds || keywordIds.size === 0) {
      // No filter — fetch all notices
      const data = await fetchNotices(null);
      items = Array.isArray(data?.items) ? data.items : [];
    } else {
      // Fetch each selected keyword in parallel, then merge + deduplicate
      const requests = Array.from(keywordIds).map((id) => fetchNotices(id));
      const results = await Promise.all(requests);
      const seen = new Set();
      items = [];
      for (const data of results) {
        for (const item of Array.isArray(data?.items) ? data.items : []) {
          if (!seen.has(item.id)) {
            seen.add(item.id);
            items.push(item);
          }
        }
      }
      items.sort((a, b) => new Date(b.published_at) - new Date(a.published_at));
    }

    setNotices(items);

    // Fallback: if /keywords returned empty, derive chips from notice payload
    setKeywords((prev) => {
      const nonAllCount = prev.filter((item) => !item?.isAll).length;
      if (nonAllCount > 0) {
        return prev;
      }
      const derivedMap = new Map();
      for (const item of items) {
        const keywordIdValue = Number(item?.keyword_id);
        const keywordLabel = String(item?.keyword || "").trim();
        if (Number.isFinite(keywordIdValue) && keywordLabel) {
          derivedMap.set(keywordIdValue, { id: keywordIdValue, keyword: keywordLabel });
        }
      }
      if (!derivedMap.size) {
        return prev;
      }
      return [{ id: null, keyword: "전체", isAll: true }, ...Array.from(derivedMap.values())];
    });
  }, []);

  const loadInitial = useCallback(async () => {
    setError("");
    setDbUnavailable(false);
    setLoading(true);
    try {
      await pingDatabase();
      await loadKeywords();
    } catch (e) {
      const nextMessage = toFriendlyMessage(e?.message);
      setError(nextMessage);
      if (String(e?.message || "").includes("DB connection failed")) {
        setDbUnavailable(true);
      }
    } finally {
      setLoading(false);
    }
  }, [loadKeywords, toFriendlyMessage]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!keywords.length || dbUnavailable) {
      return;
    }
    let alive = true;
    async function run() {
      setError("");
      setLoading(true);
      try {
        await loadNotices(selectedKeywordIds);
      } catch (e) {
        if (!alive) {
          return;
        }
        const nextMessage = toFriendlyMessage(e?.message || "카테고리 로딩에 실패했습니다.");
        setError(nextMessage);
        if (String(e?.message || "").includes("DB connection failed")) {
          setDbUnavailable(true);
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [keywords.length, dbUnavailable, loadNotices, selectedKeywordIds, toFriendlyMessage]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError("");
    try {
      if (dbUnavailable) {
        await loadInitial();
      } else {
        await loadNotices(selectedKeywordIds);
      }
    } catch (e) {
      const nextMessage = toFriendlyMessage(e?.message || "새로고침에 실패했습니다.");
      setError(nextMessage);
    } finally {
      setRefreshing(false);
    }
  }, [dbUnavailable, loadInitial, loadNotices, selectedKeywordIds, toFriendlyMessage]);

  const onPressKeyword = useCallback((id) => {
    setSelectedKeywordIds((prev) => {
      if (id === null) {
        // "전체" — clear all selections
        return new Set();
      }
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>공지사항</Text>
        <TouchableOpacity style={styles.settingsButton} onPress={onOpenSettings} activeOpacity={0.85}>
          <Text style={styles.settingsButtonText}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        style={styles.chipScroll}
      >
        {keywords.map((keyword) => {
          const selected =
            keyword.id === null
              ? selectedKeywordIds.size === 0
              : selectedKeywordIds.has(keyword.id);
          return (
            <TouchableOpacity
              key={keyword.id ?? "all"}
              style={[styles.chip, selected ? styles.chipSelected : styles.chipUnselected]}
              onPress={() => onPressKeyword(keyword.id)}
              activeOpacity={0.85}
            >
              <Text style={[styles.chipText, selected ? styles.chipTextSelected : styles.chipTextUnselected]}>
                {keyword.keyword}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="small" color="#2f6df6" />
          <Text style={styles.hintText}>공지사항을 불러오는 중...</Text>
        </View>
      ) : null}

      {!loading && error ? (
        <View style={styles.centerBox}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadInitial} activeOpacity={0.9}>
            <Text style={styles.retryButtonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!loading && !error ? (
        <FlatList
          data={notices}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} activeOpacity={0.92} onPress={() => onSelectNotice(item.id)}>
              <View style={styles.cardTopRow}>
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.keyword || ""}</Text>
                </View>
                <Text style={styles.dateText}>{formatKoreanDate(item.published_at)}</Text>
              </View>
              <View style={styles.cardBodyRow}>
                <View style={styles.cardBodyTextWrap}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardPreview} numberOfLines={2}>
                    {item.preview}
                  </Text>
                </View>
                <Text style={styles.chevron}>{">"}</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.centerBox}>
              <Text style={styles.hintText}>표시할 공지사항이 없습니다.</Text>
            </View>
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    paddingTop: 18,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0f172a",
  },
  headerRow: {
    paddingHorizontal: 20,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#dbe4f3",
    backgroundColor: "#f8fafc",
  },
  settingsButtonText: {
    fontSize: 18,
  },
  chipScroll: {
    marginBottom: 10,
  },
  chipRow: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 8,
    alignItems: "center",
  },
  chip: {
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  chipSelected: {
    backgroundColor: "#2f6df6",
    borderColor: "#2f6df6",
  },
  chipUnselected: {
    backgroundColor: "#f5f7fb",
    borderColor: "#dfe5f3",
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: "#ffffff",
  },
  chipTextUnselected: {
    color: "#41516b",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 10,
  },
  centerBox: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: "center",
    gap: 8,
  },
  hintText: {
    color: "#64748b",
  },
  errorText: {
    color: "#b91c1c",
    fontWeight: "600",
  },
  retryButton: {
    marginTop: 8,
    backgroundColor: "#2f6df6",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  retryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e8edf7",
    shadowColor: "#0f172a",
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  badge: {
    borderRadius: 999,
    backgroundColor: "#edf2ff",
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 12,
    color: "#2f5ec7",
    fontWeight: "700",
  },
  dateText: {
    fontSize: 12,
    color: "#64748b",
  },
  cardBodyRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardBodyTextWrap: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0f172a",
    marginBottom: 6,
  },
  cardPreview: {
    fontSize: 14,
    color: "#475569",
    lineHeight: 20,
  },
  chevron: {
    marginLeft: 10,
    color: "#94a3b8",
    fontSize: 18,
    fontWeight: "700",
  },
});
