import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  TextInput,
  Modal,
  Pressable,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import {
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Plus,
  Pencil,
  ClipboardList,
  ShoppingBag,
} from 'lucide-react-native';
import { MonthData, Transaction } from '../types';
import { getMonth, saveMonth, recalculateProgressiveBalances } from '../storage';
import { getThingsToBuy, saveThingsToBuy, ThingToBuy } from '../storage/thingsToBuy';
import AddTransactionModal from '../components/AddTransactionModal';
import {
  formatCurrency,
  getMonthLabel,
  getCurrentMonthId,
  getPrevMonthId,
  getNextMonthId,
  getClosingBalance,
  getRunningBalances,
} from '../utils';

const C = {
  bg: '#000000',
  surface: '#121212',
  card: '#16162E',
  border: 'rgba(255,255,255,0.10)',
  income: '#30D158',
  expense: '#FF453A',
  accent: '#7B6EF5',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  mutedHigh: 'rgba(255,255,255,0.65)',
};

const HomeScreen = () => {
  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [thingsToBuy, setThingsToBuy] = useState<ThingToBuy[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingOpening, setEditingOpening] = useState(false);
  const [openingInput, setOpeningInput] = useState('');

  const loadData = useCallback(async (id: string) => {
    // Recalculate progressive balances before setting state
    await recalculateProgressiveBalances();

    let data = await getMonth(id);
    if (!data) {
      const prevId = getPrevMonthId(id);
      const prevData = await getMonth(prevId);
      const openingBalance = prevData ? getClosingBalance(prevData) : 0;
      data = { id, openingBalance, transactions: [] };
      await saveMonth(data);
    }
    setMonthData(data);

    const wishlist = await getThingsToBuy();
    setThingsToBuy(wishlist);
  }, []);

  useEffect(() => {
    loadData(monthId);
  }, [monthId, loadData]);

  const handleAddTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'> & { thingToBuyId?: string }) => {
    if (!monthData) return;
    const newT: Transaction = {
      id: Date.now().toString(),
      description: t.description,
      amount: t.amount,
      type: t.type,
      accountId: t.accountId, // uses accountId to save linked thingId
      createdAt: Date.now(),
    };
    const updated = { ...monthData, transactions: [...monthData.transactions, newT] };
    await saveMonth(updated);

    // If a wishlist item was linked, mark it as purchased
    if (t.accountId) {
      const wishlist = await getThingsToBuy();
      const updatedWishlist = wishlist.map(item =>
        item.id === t.accountId ? { ...item, isPurchased: true, allocatedAmount: item.price } : item,
      );
      await saveThingsToBuy(updatedWishlist);
    }

    await loadData(monthId);
  };

  const handleUpdateTransaction = async (
    id: string,
    updatedPayload: (Omit<Transaction, 'id' | 'createdAt'> & { thingToBuyId?: string }) | null,
  ) => {
    if (!monthData) return;

    // Find old transaction
    const oldTx = monthData.transactions.find(tx => tx.id === id);

    if (updatedPayload === null) {
      // Execute Delete
      const updated = { ...monthData, transactions: monthData.transactions.filter(tx => tx.id !== id) };
      await saveMonth(updated);

      // Revert linked wishlist item status
      if (oldTx && oldTx.accountId) {
        const wishlist = await getThingsToBuy();
        const updatedWishlist = wishlist.map(item =>
          item.id === oldTx.accountId ? { ...item, isPurchased: false } : item,
        );
        await saveThingsToBuy(updatedWishlist);
      }
    } else {
      // Execute Update
      const updatedTransactions = monthData.transactions.map(tx => {
        if (tx.id === id) {
          return { ...tx, ...updatedPayload };
        }
        return tx;
      });

      const updated = { ...monthData, transactions: updatedTransactions };
      await saveMonth(updated);

      // Handle wishlist updates
      if (oldTx) {
        const wishlist = await getThingsToBuy();
        let wishlistChanged = false;
        let updatedWishlist = [...wishlist];

        // Revert old wishlist item
        if (oldTx.accountId && oldTx.accountId !== updatedPayload.accountId) {
          updatedWishlist = updatedWishlist.map(item =>
            item.id === oldTx.accountId ? { ...item, isPurchased: false } : item,
          );
          wishlistChanged = true;
        }

        // Apply new wishlist item status
        if (updatedPayload.accountId && oldTx.accountId !== updatedPayload.accountId) {
          updatedWishlist = updatedWishlist.map(item =>
            item.id === updatedPayload.accountId ? { ...item, isPurchased: true, allocatedAmount: item.price } : item,
          );
          wishlistChanged = true;
        }

        if (wishlistChanged) {
          await saveThingsToBuy(updatedWishlist);
        }
      }
    }

    setEditingTransaction(null);
    await loadData(monthId);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Entry', 'Delete this planned entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!monthData) return;
          const target = monthData.transactions.find(tx => tx.id === id);
          const updated = { ...monthData, transactions: monthData.transactions.filter(tx => tx.id !== id) };
          await saveMonth(updated);

          // Revert linked wishlist item
          if (target && target.accountId) {
            const wishlist = await getThingsToBuy();
            const updatedWishlist = wishlist.map(item =>
              item.id === target.accountId ? { ...item, isPurchased: false } : item,
            );
            await saveThingsToBuy(updatedWishlist);
          }

          await loadData(monthId);
        },
      },
    ]);
  };

  const handleSaveOpening = async () => {
    if (!monthData) return;
    const val = parseFloat(openingInput.replace(/,/g, ''));
    if (isNaN(val)) {
      setEditingOpening(false);
      return;
    }
    const updated = { ...monthData, overrideStartingBalance: val, openingBalance: val };
    setMonthData(updated);
    await saveMonth(updated);

    await loadData(monthId);
    setEditingOpening(false);
  };

  const netBalance = monthData ? getClosingBalance(monthData) : 0;
  const transactions = monthData ? getRunningBalances(monthData) : [];
  const totalIncome = monthData?.transactions.filter(tx => tx.type === 'income').reduce((a, tx) => a + tx.amount, 0) ?? 0;
  const totalExpense = monthData?.transactions.filter(tx => tx.type === 'expense').reduce((a, tx) => a + tx.amount, 0) ?? 0;
  const balanceColor = netBalance >= 0 ? C.income : C.expense;

  const renderTransaction = ({ item }: { item: (typeof transactions)[0] }) => {
    const linkedWishItem = thingsToBuy.find(w => w.id === item.accountId);
    return (
      <TouchableOpacity
        style={styles.txRow}
        onPress={() => {
          setEditingTransaction(item);
          setShowAdd(true);
        }}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.75}
        delayLongPress={500}
      >
        <View style={styles.txLeft}>
          <View
            style={[
              styles.txDot,
              { backgroundColor: item.type === 'income' ? C.income + '18' : C.expense + '18' },
            ]}
          >
            {item.type === 'income' ? (
              <TrendingUp size={16} color={C.income} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={16} color={C.expense} strokeWidth={2.5} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.txDesc} numberOfLines={1}>
              {item.description}
            </Text>
            <View style={styles.txMetaRow}>
              <Text style={styles.txNet}>Progressive Net: {formatCurrency(item.runningBalance)}</Text>
              {linkedWishItem && (
                <View style={styles.linkedBadge}>
                  <ShoppingBag size={10} color="#FFF" />
                  <Text style={styles.linkedBadgeText} numberOfLines={1}>
                    Wishlist: {linkedWishItem.name}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
        <Text style={[styles.txAmount, { color: item.type === 'income' ? C.income : C.expense }]}>
          {item.type === 'income' ? '+' : '-'}{formatCurrency(item.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  const ListHeader = () => (
    <>
      {/* App Logo Header */}
      <View style={styles.logoHeader}>
        <View style={styles.logoIcon}>
          <View style={styles.logoDotActive} />
          <View style={styles.logoLineHorizontal} />
          <View style={styles.logoLineVertical} />
        </View>
        <Text style={styles.logoText}>balance planner</Text>
      </View>

      {/* Month Selector */}
      <View style={styles.monthRow}>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonthId(getPrevMonthId(monthId))} activeOpacity={0.7}>
          <ChevronLeft size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{getMonthLabel(monthId)}</Text>
        <TouchableOpacity style={styles.navBtn} onPress={() => setMonthId(getNextMonthId(monthId))} activeOpacity={0.7}>
          <ChevronRight size={20} color={C.text} strokeWidth={2} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={styles.balCard}>
        <Text style={styles.balLabel}>PROJECTED CLOSING BALANCE</Text>
        <Text style={[styles.balAmount, { color: balanceColor }]}>{formatCurrency(netBalance)}</Text>

        {/* Opening balance */}
        <TouchableOpacity
          style={styles.openRow}
          onPress={() => {
            setOpeningInput(String(monthData?.openingBalance ?? 0));
            setEditingOpening(true);
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.openLabel}>Starting Balance</Text>
          <View style={styles.openRight}>
            <Text style={styles.openValue}>{formatCurrency(monthData?.openingBalance ?? 0)}</Text>
            <Pencil size={12} color={C.muted} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <TrendingUp size={14} color={C.income} strokeWidth={2.5} />
            <Text style={styles.summaryLabel}>Income</Text>
            <Text style={[styles.summaryVal, { color: C.income }]}>{formatCurrency(totalIncome)}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <TrendingDown size={14} color={C.expense} strokeWidth={2.5} />
            <Text style={styles.summaryLabel}>Expenses</Text>
            <Text style={[styles.summaryVal, { color: C.expense }]}>{formatCurrency(totalExpense)}</Text>
          </View>
        </View>
      </View>

      {transactions.length > 0 && (
        <View style={styles.entriesHeader}>
          <Text style={styles.entriesTitle}>PLANNED ENTRIES</Text>
          <Text style={styles.entriesHint}>Tap to edit • Long press to remove</Text>
        </View>
      )}
    </>
  );

  const ListEmpty = () => (
    <View style={styles.emptyWrap}>
      <ClipboardList size={52} color={C.muted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>Nothing planned yet</Text>
      <Text style={styles.emptyBody}>
        Tap + to plan your income{'\n'}and expenses for {getMonthLabel(monthId)}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      <FlatList
        data={transactions}
        keyExtractor={item => item.id}
        renderItem={renderTransaction}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          setEditingTransaction(null);
          setShowAdd(true);
        }}
        activeOpacity={0.85}
      >
        <Plus size={28} color="#fff" strokeWidth={2} />
      </TouchableOpacity>

      <AddTransactionModal
        visible={showAdd}
        onClose={() => {
          setShowAdd(false);
          setEditingTransaction(null);
        }}
        onAdd={handleAddTransaction}
        onUpdate={handleUpdateTransaction}
        thingsToBuy={thingsToBuy}
        editingTransaction={editingTransaction}
      />

      {/* Edit Starting Balance */}
      <Modal visible={editingOpening} transparent animationType="fade" onRequestClose={() => setEditingOpening(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEditingOpening(false)} />
          <View style={styles.editCard}>
            <Text style={styles.editTitle}>Starting Balance</Text>
            <Text style={styles.editSub}>Set opening balance for {getMonthLabel(monthId)}</Text>
            <View style={styles.editInputRow}>
              <Text style={[styles.rupee, { color: C.accent }]}>₹</Text>
              <TextInput
                style={styles.editInput}
                value={openingInput}
                onChangeText={setOpeningInput}
                keyboardType="numeric"
                autoFocus
                selectTextOnFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveOpening}
                placeholderTextColor={C.muted}
              />
            </View>
            <TouchableOpacity style={styles.editSave} onPress={handleSaveOpening} activeOpacity={0.85}>
              <Text style={styles.editSaveText}>Save</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { paddingBottom: 100 },

  logoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 8,
  },
  logoIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: C.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoDotActive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000',
  },
  logoLineHorizontal: {
    width: 12,
    height: 2,
    backgroundColor: '#000',
    position: 'absolute',
    bottom: 4,
  },
  logoLineVertical: {
    width: 2,
    height: 12,
    backgroundColor: '#000',
    position: 'absolute',
    right: 4,
  },
  logoText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
    textTransform: 'uppercase',
  },

  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  monthLabel: { color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },

  balCard: {
    marginHorizontal: 16,
    backgroundColor: C.card,
    borderRadius: 22,
    padding: 22,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 16,
  },
  balLabel: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  balAmount: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 18 },

  openRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 18,
  },
  openLabel: { color: C.muted, fontSize: 13, fontWeight: '500' },
  openRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  openValue: { color: C.text, fontSize: 14, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', gap: 16 },
  summaryItem: { flex: 1, gap: 4 },
  summaryDivider: { width: 1, backgroundColor: C.border },
  summaryLabel: { color: C.muted, fontSize: 11, fontWeight: '500' },
  summaryVal: { fontSize: 15, fontWeight: '700' },

  entriesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 8,
    marginBottom: 10,
  },
  entriesTitle: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  entriesHint: { color: C.muted, fontSize: 10 },

  txRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.surface,
    marginHorizontal: 16,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  txDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txDesc: { color: C.text, fontSize: 15, fontWeight: '600' },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  txNet: { color: C.muted, fontSize: 11 },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(123, 110, 245, 0.18)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 120,
  },
  linkedBadgeText: { color: '#7B6EF5', fontSize: 9, fontWeight: '700' },
  txAmount: { fontSize: 16, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12, paddingHorizontal: 32 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '600' },
  emptyBody: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: C.accent,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },

  editOverlay: { flex: 1, justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.85)' },
  editCard: {
    backgroundColor: C.card,
    marginHorizontal: 24,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  editTitle: { color: C.text, fontSize: 20, fontWeight: '700' },
  editSub: { color: C.muted, fontSize: 13, marginTop: 4, marginBottom: 20 },
  editInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.accent + '40',
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  rupee: { fontSize: 22, fontWeight: '700', marginRight: 8 },
  editInput: { flex: 1, paddingVertical: 14, color: C.text, fontSize: 22, fontWeight: '700' },
  editSave: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  editSaveText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default HomeScreen;
