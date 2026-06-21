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
  Landmark,
} from 'lucide-react-native';
import { MonthData, Transaction } from '../types';
import { getMonth, saveMonth, getAllMonthIds } from '../storage';
import { getWallet, saveWallet, BankAccount } from '../storage/wallet';
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
  card: '#1C1C1E',
  border: 'rgba(255,255,255,0.10)',
  income: '#30D158', // iOS System Green
  expense: '#FF453A', // iOS System Red
  accent: '#FFFFFF',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  mutedHigh: 'rgba(255,255,255,0.65)',
};

const HomeScreen = () => {
  const [monthId, setMonthId] = useState(getCurrentMonthId());
  const [monthData, setMonthData] = useState<MonthData | null>(null);
  const [walletAccounts, setWalletAccounts] = useState<BankAccount[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingOpening, setEditingOpening] = useState(false);
  const [openingInput, setOpeningInput] = useState('');

  const loadData = useCallback(async (id: string) => {
    let data = await getMonth(id);
    if (!data) {
      const prevId = getPrevMonthId(id);
      const prevData = await getMonth(prevId);
      const openingBalance = prevData ? getClosingBalance(prevData) : 0;
      data = { id, openingBalance, transactions: [] };
      // Save it, but since it has 0 transactions, overview screen will automatically filter it out!
      await saveMonth(data);
    }
    setMonthData(data);

    const wallet = await getWallet();
    setWalletAccounts(wallet);
  }, []);

  useEffect(() => {
    loadData(monthId);
  }, [monthId, loadData]);

  const updateWalletForTransaction = async (
    accountId: string,
    amount: number,
    type: 'income' | 'expense',
    operation: 'add' | 'delete'
  ) => {
    const wallets = await getWallet();
    const updated = wallets.map(acc => {
      if (acc.id === accountId) {
        let diff = amount;
        if (operation === 'delete') {
          diff = -amount;
        }
        const balanceChange = type === 'income' ? diff : -diff;
        return {
          ...acc,
          balance: acc.balance + balanceChange,
          updatedAt: Date.now(),
        };
      }
      return acc;
    });
    setWalletAccounts(updated);
    await saveWallet(updated);
  };

  const handleAddTransaction = async (t: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (!monthData) return;
    const newT: Transaction = { ...t, id: Date.now().toString(), createdAt: Date.now() };
    const updated = { ...monthData, transactions: [...monthData.transactions, newT] };
    setMonthData(updated);
    await saveMonth(updated);

    if (t.accountId) {
      await updateWalletForTransaction(t.accountId, t.amount, t.type, 'add');
    }
  };

  const handleUpdateTransaction = async (id: string, updatedPayload: Omit<Transaction, 'id' | 'createdAt'> | null) => {
    if (!monthData) return;
    
    // Find old transaction to revert wallet balances
    const oldTx = monthData.transactions.find(t => t.id === id);
    
    if (updatedPayload === null) {
      // Execute Delete
      const updated = { ...monthData, transactions: monthData.transactions.filter(t => t.id !== id) };
      setMonthData(updated);
      await saveMonth(updated);

      if (oldTx && oldTx.accountId) {
        await updateWalletForTransaction(oldTx.accountId, oldTx.amount, oldTx.type, 'delete');
      }
    } else {
      // Execute Edit Update
      const updatedTransactions = monthData.transactions.map(t => {
        if (t.id === id) {
          return { ...t, ...updatedPayload };
        }
        return t;
      });

      const updated = { ...monthData, transactions: updatedTransactions };
      setMonthData(updated);
      await saveMonth(updated);

      if (oldTx) {
        if (oldTx.accountId) {
          await updateWalletForTransaction(oldTx.accountId, oldTx.amount, oldTx.type, 'delete');
        }
        if (updatedPayload.accountId) {
          await updateWalletForTransaction(updatedPayload.accountId, updatedPayload.amount, updatedPayload.type, 'add');
        }
      }
    }
    
    setEditingTransaction(null);
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Entry', 'Delete this planned entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          if (!monthData) return;
          const target = monthData.transactions.find(t => t.id === id);
          const updated = { ...monthData, transactions: monthData.transactions.filter(t => t.id !== id) };
          setMonthData(updated);
          await saveMonth(updated);

          if (target && target.accountId) {
            await updateWalletForTransaction(target.accountId, target.amount, target.type, 'delete');
          }
        },
      },
    ]);
  };

  const handleSaveOpening = async () => {
    if (!monthData) return;
    const val = parseFloat(openingInput.replace(/,/g, ''));
    if (isNaN(val)) { setEditingOpening(false); return; }
    const updated = { ...monthData, openingBalance: val };
    setMonthData(updated);
    await saveMonth(updated);
    setEditingOpening(false);
  };

  const netBalance = monthData ? getClosingBalance(monthData) : 0;
  const transactions = monthData ? getRunningBalances(monthData) : [];
  const totalIncome = monthData?.transactions.filter(t => t.type === 'income').reduce((a, t) => a + t.amount, 0) ?? 0;
  const totalExpense = monthData?.transactions.filter(t => t.type === 'expense').reduce((a, t) => a + t.amount, 0) ?? 0;
  const balanceColor = netBalance >= 0 ? C.income : C.expense;

  const renderTransaction = ({ item }: { item: (typeof transactions)[0] }) => {
    const linkedAccount = walletAccounts.find(acc => acc.id === item.accountId);
    return (
      <TouchableOpacity
        style={styles.txRow}
        onPress={() => {
          setEditingTransaction(item);
          setShowAdd(true);
        }}
        onLongPress={() => handleDelete(item.id)}
        activeOpacity={0.75}
        delayLongPress={500}>
        <View style={styles.txLeft}>
          <View style={[styles.txDot, { backgroundColor: item.type === 'income' ? C.income + '18' : C.expense + '18' }]}>
            {item.type === 'income'
              ? <TrendingUp size={16} color={C.income} strokeWidth={2.5} />
              : <TrendingDown size={16} color={C.expense} strokeWidth={2.5} />}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.txDesc} numberOfLines={1}>{item.description}</Text>
            <View style={styles.txMetaRow}>
              <Text style={styles.txNet}>Net {formatCurrency(item.runningBalance)}</Text>
              {linkedAccount && (
                <View style={styles.linkedBadge}>
                  <Landmark size={10} color={C.accent} />
                  <Text style={styles.linkedBadgeText} numberOfLines={1}>{linkedAccount.name}</Text>
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
        <Text style={styles.balLabel}>PROJECTED NET</Text>
        <Text style={[styles.balAmount, { color: balanceColor }]}>{formatCurrency(netBalance)}</Text>

        {/* Opening balance */}
        <TouchableOpacity
          style={styles.openRow}
          onPress={() => { setOpeningInput(String(monthData?.openingBalance ?? 0)); setEditingOpening(true); }}
          activeOpacity={0.7}>
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
      <Text style={styles.emptyBody}>Tap + to plan your income{'\n'}and expenses for {getMonthLabel(monthId)}</Text>
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
        accounts={walletAccounts}
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

  monthRow: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: C.surface, alignItems: 'center',
    justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  monthLabel: { color: C.text, fontSize: 20, fontWeight: '700', letterSpacing: 0.2 },

  balCard: {
    marginHorizontal: 16, backgroundColor: C.card,
    borderRadius: 22, padding: 22,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
  },
  balLabel: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginBottom: 8 },
  balAmount: { fontSize: 42, fontWeight: '800', letterSpacing: -1, marginBottom: 16 },

  openRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16,
    borderWidth: 1, borderColor: C.border,
  },
  openLabel: { color: C.muted, fontSize: 13, fontWeight: '500' },
  openRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  openValue: { color: C.mutedHigh, fontSize: 14, fontWeight: '600' },

  summaryRow: {
    flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14, borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  summaryItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 5 },
  summaryDivider: { width: 1, backgroundColor: C.border },
  summaryLabel: { color: C.muted, fontSize: 11, fontWeight: '600' },
  summaryVal: { fontSize: 14, fontWeight: '700' },

  entriesHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 10,
  },
  entriesTitle: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  entriesHint: { color: C.muted, fontSize: 11 },

  txRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginHorizontal: 16, marginBottom: 10,
    backgroundColor: C.surface, borderRadius: 16,
    paddingHorizontal: 16, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border,
  },
  txLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  txDot: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  txDesc: { color: C.text, fontSize: 15, fontWeight: '600', maxWidth: 170 },
  txMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  txNet: { color: C.muted, fontSize: 12 },
  linkedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    maxWidth: 90,
  },
  linkedBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  txAmount: { fontSize: 16, fontWeight: '700' },

  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '600' },
  emptyBody: { color: C.muted, fontSize: 13, textAlign: 'center', lineHeight: 20 },

  fab: {
    position: 'absolute', bottom: 32, right: 24,
    width: 58, height: 58, borderRadius: 18,
    backgroundColor: '#7B6EF5',
    alignItems: 'center', justifyContent: 'center',
  },

  editOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  editCard: {
    backgroundColor: C.card, borderRadius: 24,
    padding: 28, width: '85%',
    borderWidth: 1, borderColor: C.border,
  },
  editTitle: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  editSub: { color: C.muted, fontSize: 13, marginBottom: 20 },
  editInputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14, borderWidth: 1.5,
    borderColor: C.accent + '50', paddingHorizontal: 16, marginBottom: 20,
  },
  rupee: { fontSize: 22, fontWeight: '700', marginRight: 8 },
  editInput: { flex: 1, paddingVertical: 14, color: C.text, fontSize: 24, fontWeight: '700' },
  editSave: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  editSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default HomeScreen;
