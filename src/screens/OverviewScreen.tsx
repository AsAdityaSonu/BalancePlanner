import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp, TrendingDown, CalendarDays, ArrowRight } from 'lucide-react-native';
import { MonthData } from '../types';
import { getAllMonthIds, getMonth } from '../storage';
import { formatCurrency, getMonthLabel, getClosingBalance } from '../utils';

const C = {
  bg: '#000000',
  surface: '#121212',
  border: 'rgba(255,255,255,0.10)',
  income: '#30D158',
  expense: '#FF453A',
  accent: '#FFFFFF',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  mutedHigh: 'rgba(255,255,255,0.65)',
};

interface MonthSummary {
  id: string;
  data: MonthData;
  closingBalance: number;
  totalIncome: number;
  totalExpense: number;
  netChange: number;
}

const OverviewScreen = () => {
  const [summaries, setSummaries] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const ids = await getAllMonthIds();
    const results: MonthSummary[] = [];
    for (const id of ids) {
      const data = await getMonth(id);
      if (!data || data.transactions.length === 0) continue;
      const totalIncome = data.transactions
        .filter(t => t.type === 'income')
        .reduce((a, t) => a + t.amount, 0);
      const totalExpense = data.transactions
        .filter(t => t.type === 'expense')
        .reduce((a, t) => a + t.amount, 0);
      const closingBalance = getClosingBalance(data);
      results.push({ id, data, closingBalance, totalIncome, totalExpense, netChange: totalIncome - totalExpense });
    }
    setSummaries(results.sort((a, b) => b.id.localeCompare(a.id)));
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const totalIncome = summaries.reduce((a, s) => a + s.totalIncome, 0);
  const totalExpense = summaries.reduce((a, s) => a + s.totalExpense, 0);
  const latestBalance = summaries.length > 0 ? summaries[0].closingBalance : 0;
  const netSavings = totalIncome - totalExpense;

  const renderMonth = ({ item }: { item: MonthSummary }) => {
    const positive = item.netChange >= 0;
    return (
      <View style={styles.monthCard}>
        <View style={styles.monthCardLeft}>
          <View style={styles.monthIcon}>
            <CalendarDays size={15} color={C.accent} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.monthName}>{getMonthLabel(item.id)}</Text>
            <View style={styles.balanceFlow}>
              <Text style={styles.balFrom}>{formatCurrency(item.data.openingBalance)}</Text>
              <ArrowRight size={11} color={C.muted} strokeWidth={2} />
              <Text style={[styles.balTo, { color: item.closingBalance >= 0 ? C.income : C.expense }]}>
                {formatCurrency(item.closingBalance)}
              </Text>
            </View>
            <Text style={styles.entryCount}>{item.data.transactions.length} entries</Text>
          </View>
        </View>
        <Text style={[styles.netChange, { color: positive ? C.income : C.expense }]}>
          {positive ? '+' : ''}{formatCurrency(item.netChange)}
        </Text>
      </View>
    );
  };

  const Header = () => (
    <>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Overview</Text>
        <Text style={styles.pageSub}>{summaries.length} month{summaries.length !== 1 ? 's' : ''} planned</Text>
      </View>

      {/* Top balance card */}
      <View style={styles.bigCard}>
        <Text style={styles.cardLabel}>PROJECTED BALANCE</Text>
        <Text style={[styles.bigAmount, { color: latestBalance >= 0 ? C.income : C.expense }]}>
          {formatCurrency(latestBalance)}
        </Text>

        {/* Income / Expense row */}
        <View style={styles.ioRow}>
          <View style={styles.ioItem}>
            <View style={styles.ioIconRow}>
              <TrendingUp size={13} color={C.income} strokeWidth={2.5} />
              <Text style={[styles.ioLabel, { color: C.income }]}>Planned In</Text>
            </View>
            <Text style={[styles.ioValue, { color: C.income }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.ioDivider} />
          <View style={styles.ioItem}>
            <View style={styles.ioIconRow}>
              <TrendingDown size={13} color={C.expense} strokeWidth={2.5} />
              <Text style={[styles.ioLabel, { color: C.expense }]}>Planned Out</Text>
            </View>
            <Text style={[styles.ioValue, { color: C.expense }]}>{formatCurrency(totalExpense)}</Text>
          </View>
          <View style={styles.ioDivider} />
          <View style={styles.ioItem}>
            <View style={styles.ioIconRow}>
              <Text style={[styles.ioLabel, { color: netSavings >= 0 ? C.income : C.expense }]}>
                {netSavings >= 0 ? '▲' : '▼'} Net
              </Text>
            </View>
            <Text style={[styles.ioValue, { color: netSavings >= 0 ? C.income : C.expense }]}>
              {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings)}
            </Text>
          </View>
        </View>
      </View>

      {summaries.length > 0 && (
        <Text style={styles.sectionTitle}>MONTH BY MONTH</Text>
      )}
    </>
  );

  const Empty = () => (
    <View style={styles.empty}>
      <CalendarDays size={52} color={C.muted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No plans yet</Text>
      <Text style={styles.emptyBody}>Add entries in the Plan tab to see your overview</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FlatList
        data={summaries}
        keyExtractor={i => i.id}
        renderItem={renderMonth}
        ListHeaderComponent={Header}
        ListEmptyComponent={!loading ? Empty : null}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />}
      />
      {loading && summaries.length === 0 && (
        <ActivityIndicator style={styles.loader} color={C.accent} />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  loader: { position: 'absolute', alignSelf: 'center', top: '50%' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },

  pageHeader: { paddingTop: 16, paddingBottom: 4, paddingHorizontal: 4 },
  pageTitle: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSub: { color: C.muted, fontSize: 13, marginTop: 3, marginBottom: 16 },

  bigCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardLabel: {
    color: C.muted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 8,
  },
  bigAmount: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 18 },

  ioRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  ioItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 5 },
  ioDivider: { width: 1, backgroundColor: C.border },
  ioIconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ioLabel: { color: C.muted, fontSize: 11, fontWeight: '600' },
  ioValue: { fontSize: 13, fontWeight: '700' },

  sectionTitle: {
    color: C.muted, fontSize: 11, fontWeight: '700',
    letterSpacing: 1.2, marginBottom: 12, paddingHorizontal: 4,
  },

  monthCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  monthCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  monthIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: C.accent + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthName: { color: C.text, fontSize: 15, fontWeight: '600', marginBottom: 3 },
  balanceFlow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 2 },
  balFrom: { color: C.muted, fontSize: 12 },
  balTo: { fontSize: 12, fontWeight: '600' },
  entryCount: { color: C.muted, fontSize: 11 },
  netChange: { fontSize: 15, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 70, gap: 12 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '600' },
  emptyBody: { color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
});

export default OverviewScreen;
