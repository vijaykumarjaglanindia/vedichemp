import { useGetProhibitionStatus } from "@workspace/api-client-react";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const PROHIBITION_LABELS: Record<string, string> = {
  A1: "No medical cannabis product may be advertised or promoted, by anyone, ever",
  A2: "No batch becomes sellable without an approved, batch-matched CoA",
  A3: "Safety, adverse-event, dispensing, recall and audit records cannot be deleted or altered",
  A4: "Health data: Pharmacist/Compliance only, logged reason, buyer notified",
  A5: "No retroactive fee increase (30 days' notice, DB-enforced)",
  A6: "No single admin moves money (maker \u2260 checker, both human)",
};

interface Prohibition {
  code: string;
  enforced: boolean;
}

export default function ProhibitionRegistryScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { data, isLoading, isError, refetch, isRefetching } =
    useGetProhibitionStatus();
  const [manualRefreshing, setManualRefreshing] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : insets.bottom;

  const onRefresh = useCallback(async () => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setManualRefreshing(true);
    try {
      await refetch();
    } finally {
      setManualRefreshing(false);
    }
  }, [refetch]);

  const enforcedCount = data?.filter((p) => p.enforced).length ?? 0;
  const total = data?.length ?? 0;
  const allEnforced = total > 0 && enforcedCount === total;

  const renderItem = ({ item }: { item: Prohibition }) => (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          borderRadius: colors.radius + 4,
        },
      ]}
      testID={`card-prohibition-${item.code}`}
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: item.enforced ? colors.accent : "#f8e3e3",
            borderRadius: colors.radius + 2,
          },
        ]}
      >
        <Feather
          name={item.enforced ? "shield" : "shield-off"}
          size={20}
          color={item.enforced ? colors.primary : colors.destructive}
        />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.code, { color: colors.foreground }]}>
            {item.code}
          </Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: item.enforced
                  ? colors.primary
                  : colors.destructive,
                borderRadius: colors.radius + 6,
              },
            ]}
            testID={`badge-status-${item.code}`}
          >
            <Text
              style={[styles.badgeText, { color: colors.primaryForeground }]}
            >
              {item.enforced ? "Enforced" : "Not enforced"}
            </Text>
          </View>
        </View>
        <Text style={[styles.label, { color: colors.mutedForeground }]}>
          {PROHIBITION_LABELS[item.code] ?? "Database-enforced prohibition"}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.code}
        renderItem={renderItem}
        scrollEnabled={!!data && data.length > 0}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: topInset + 12, paddingBottom: bottomInset + 24 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={manualRefreshing && isRefetching}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.brand, { color: colors.primary }]} testID="text-brand">
              VEDIC HEMP
            </Text>
            <Text
              style={[styles.title, { color: colors.foreground }]}
              testID="text-title"
            >
              Prohibition Registry
            </Text>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Six prohibitions (A1{"\u2013"}A6) are enforced directly in the
              database, so no application bug can produce an unlawful outcome.
              Status is read live from the prohibition_status view.
            </Text>

            {data && (
              <View
                style={[
                  styles.summary,
                  {
                    backgroundColor: allEnforced ? colors.primary : colors.destructive,
                    borderRadius: colors.radius + 6,
                  },
                ]}
                testID="summary-status"
              >
                <Feather
                  name={allEnforced ? "check-circle" : "alert-triangle"}
                  size={22}
                  color={colors.primaryForeground}
                />
                <View style={styles.summaryTextWrap}>
                  <Text
                    style={[
                      styles.summaryTitle,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {enforcedCount} of {total} enforced
                  </Text>
                  <Text
                    style={[
                      styles.summarySub,
                      { color: colors.primaryForeground },
                    ]}
                  >
                    {allEnforced
                      ? "All prohibitions hold at the database level"
                      : "Attention required \u2014 enforcement gap detected"}
                  </Text>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <View style={styles.centerBox} testID="status-loading">
              <ActivityIndicator color={colors.primary} size="large" />
              <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
                Checking enforcement status{"\u2026"}
              </Text>
            </View>
          ) : isError ? (
            <View style={styles.centerBox} testID="status-error">
              <Feather name="shield-off" size={32} color={colors.destructive} />
              <Text style={[styles.centerText, { color: colors.mutedForeground }]}>
                Unable to read prohibition status from the database.
              </Text>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== "web") {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  refetch();
                }}
                style={({ pressed }) => [
                  styles.retryButton,
                  {
                    backgroundColor: colors.primary,
                    borderRadius: colors.radius + 2,
                    opacity: pressed ? 0.8 : 1,
                  },
                ]}
                testID="button-retry"
              >
                <Feather
                  name="refresh-cw"
                  size={16}
                  color={colors.primaryForeground}
                />
                <Text
                  style={[styles.retryText, { color: colors.primaryForeground }]}
                >
                  Retry
                </Text>
              </Pressable>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  header: {
    marginBottom: 8,
  },
  brand: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 3,
    marginBottom: 6,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 28,
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  summaryTextWrap: {
    flex: 1,
  },
  summaryTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  summarySub: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    opacity: 0.9,
    marginTop: 2,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  code: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  label: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  centerBox: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  centerText: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  retryText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
});
