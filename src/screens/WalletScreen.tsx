import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  Alert,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Plus, Pencil, Trash2, Landmark, TrendingUp, TrendingDown, CreditCard, Wallet } from 'lucide-react-native';
import { BankAccount, getWallet, saveWallet } from '../storage/wallet';
import { getMonth } from '../storage';
import { formatCurrency, getCurrentMonthId, getClosingBalance } from '../utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  bg: '#080B14',
  surface: '#111827',
  sheet: '#16162E',
  border: 'rgba(255,255,255,0.07)',
  income: '#10D9A5',
  expense: '#FF5E6C',
  accent: '#7B6EF5',
  text: '#F0F0FF',
  muted: 'rgba(240,240,255,0.45)',
  mutedHigh: 'rgba(240,240,255,0.65)',
};

const WalletScreen = () => {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [plannedBalance, setPlannedBalance] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<BankAccount | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputAmount, setInputAmount] = useState('');
  const [accountType, setAccountType] = useState<'bank' | 'cash'>('bank');

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Swipe gesture for modal dismissal
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldPanResponder: () => true,
      onMoveShouldPanResponder: (_, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 0.5) {
          handleClose();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 7,
            tension: 80,
          }).start();
        }
      },
    })
  ).current;

  const load = useCallback(async () => {
    setLoading(true);
    const [accs, monthData] = await Promise.all([
      getWallet(),
      getMonth(getCurrentMonthId()),
    ]);
    setAccounts(accs);
    setPlannedBalance(monthData ? getClosingBalance(monthData) : null);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (showModal) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 90,
      }).start();
    }
  }, [showModal, translateY]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
    });
  };

  const openAdd = () => {
    setEditing(null);
    setInputName('');
    setInputAmount('');
    setAccountType('bank');
    setShowModal(true);
  };

  const openEdit = (acc: BankAccount & { type?: 'bank' | 'cash' }) => {
    setEditing(acc);
    setInputName(acc.name);
    setInputAmount(String(acc.balance));
    setAccountType(acc.type || 'bank');
    setShowModal(true);
  };

  const handleSave = async () => {
    const amount = parseFloat(inputAmount.replace(/,/g, ''));
    if (!inputName.trim() || isNaN(amount)) return;
    let updated: BankAccount[];
    if (editing) {
      updated = accounts.map(a =>
        a.id === editing.id
          ? {
              ...a,
              name: inputName.trim(),
              balance: amount,
              type: accountType, // save type attribute
              updatedAt: Date.now(),
            } as any
          : a
      );
    } else {
      const newAcc: BankAccount & { type: 'bank' | 'cash' } = {
        id: Date.now().toString(),
        name: inputName.trim(),
        balance: amount,
        type: accountType,
        updatedAt: Date.now(),
      };
      updated = [...accounts, newAcc];
    }
    setAccounts(updated);
    await saveWallet(updated);
    handleClose();
  };

  const handleDelete = (id: string) => {
    Alert.alert('Remove Account', 'Delete this account?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const updated = accounts.filter(a => a.id !== id);
          setAccounts(updated);
          await saveWallet(updated);
        },
      },
    ]);
  };

  const renderAccount = ({ item }: { item: BankAccount & { type?: 'bank' | 'cash' } }) => (
    <View style={styles.accRow}>
      <View style={styles.accLeft}>
        <View style={styles.accIcon}>
          {item.type === 'cash' ? (
            <Wallet size={16} color="#10D9A5" strokeWidth={2} />
          ) : (
            <CreditCard size={16} color={C.accent} strokeWidth={2} />
          )}
        </View>
        <View>
          <Text style={styles.accName}>{item.name}</Text>
          <Text style={styles.accUpdated}>
            {item.type === 'cash' ? 'Cash Account' : 'Bank Account'} • Updated {new Date(item.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </Text>
        </View>
      </View>
      <View style={styles.accRight}>
        <Text style={styles.accBalance}>{formatCurrency(item.balance)}</Text>
        <View style={styles.accActions}>
          <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
            <Pencil size={14} color={C.muted} strokeWidth={2} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
            <Trash2 size={14} color={C.expense + 'AA'} strokeWidth={2} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const Header = () => (
    <>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Wallet</Text>
        <Text style={styles.pageSub}>Manage your cash and bank balance</Text>
      </View>

      {/* Total actual balance */}
      <View style={styles.totalCard}>
        <View style={styles.totalCardTop}>
          <Landmark size={18} color={C.accent} strokeWidth={2} />
          <Text style={styles.totalCardLabel}>TOTAL ACTUAL BALANCE</Text>
        </View>
        <Text style={[styles.totalAmount, { color: totalActual >= 0 ? C.income : C.expense }]}>
          {formatCurrency(totalActual)}
        </Text>

        {/* vs Planned */}
        {plannedBalance !== null && accounts.length > 0 && (
          <View style={styles.vsRow}>
            <View style={styles.vsItem}>
              <Text style={styles.vsLabel}>Actual</Text>
              <Text style={[styles.vsValue, { color: C.text }]}>{formatCurrency(totalActual)}</Text>
            </View>
            <View style={styles.vsDivider} />
            <View style={styles.vsItem}>
              <Text style={styles.vsLabel}>Planned End</Text>
              <Text style={[styles.vsValue, { color: C.muted }]}>{formatCurrency(plannedBalance)}</Text>
            </View>
            <View style={styles.vsDivider} />
            <View style={styles.vsItem}>
              <Text style={styles.vsLabel}>Diff</Text>
              <Text style={[styles.vsValue, { color: diff !== null && diff >= 0 ? C.income : C.expense }]}>
                {diff !== null ? `${diff >= 0 ? '+' : ''}${formatCurrency(diff)}` : '—'}
              </Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.accountsHeader}>
        <Text style={styles.sectionTitle}>ACCOUNTS & WALLETS</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.7}>
          <Plus size={14} color={C.accent} strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const Empty = () => (
    <View style={styles.empty}>
      <CreditCard size={52} color={C.muted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>No accounts yet</Text>
      <Text style={styles.emptyBody}>Add your cash and bank accounts to track your actual balance</Text>
      <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd} activeOpacity={0.8}>
        <Plus size={16} color="#fff" strokeWidth={2.5} />
        <Text style={styles.emptyAddBtnText}>Add Account</Text>
      </TouchableOpacity>
    </View>
  );

  const totalActual = accounts.reduce((a, acc) => a + acc.balance, 0);
  const diff = plannedBalance !== null ? totalActual - plannedBalance : null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FlatList
        data={accounts}
        keyExtractor={a => a.id}
        renderItem={renderAccount}
        ListHeaderComponent={Header}
        ListEmptyComponent={!loading ? Empty : null}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.accent} />}
      />

      {/* Add / Edit Modal */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={handleClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
          <Animated.View 
            style={[styles.sheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
            <Text style={styles.sheetTitle}>{editing ? 'Edit Account' : 'Add Account'}</Text>

            {/* Type selector */}
            <Text style={styles.inputLabel}>Account Type</Text>
            <View style={styles.typeRow}>
              <TouchableOpacity 
                style={[styles.typeBtn, accountType === 'bank' && styles.typeBtnActive]} 
                onPress={() => setAccountType('bank')}
              >
                <CreditCard size={15} color={accountType === 'bank' ? '#FFF' : C.muted} />
                <Text style={[styles.typeText, accountType === 'bank' && styles.typeTextActive]}>Bank Card</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.typeBtn, accountType === 'cash' && styles.typeBtnActive]} 
                onPress={() => setAccountType('cash')}
              >
                <Wallet size={15} color={accountType === 'cash' ? '#FFF' : C.muted} />
                <Text style={[styles.typeText, accountType === 'cash' && styles.typeTextActive]}>Cash in Hand</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Account Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. HDFC Savings, Cash Wallet..."
              placeholderTextColor={C.muted}
              value={inputName}
              onChangeText={setInputName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Balance (₹)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={C.muted}
                value={inputAmount}
                onChangeText={setInputAmount}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{editing ? 'Update' : 'Add Account'}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  list: { paddingHorizontal: 16, paddingBottom: 100 },

  pageHeader: { paddingTop: 16, paddingBottom: 4, paddingHorizontal: 4 },
  pageTitle: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  pageSub: { color: C.muted, fontSize: 13, marginTop: 3, marginBottom: 16 },

  totalCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: C.border,
  },
  totalCardTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  totalCardLabel: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  totalAmount: { fontSize: 38, fontWeight: '800', letterSpacing: -1, marginBottom: 18 },

  vsRow: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  vsItem: { flex: 1, alignItems: 'center', paddingVertical: 12, gap: 5 },
  vsDivider: { width: 1, backgroundColor: C.border },
  vsLabel: { color: C.muted, fontSize: 11, fontWeight: '600' },
  vsValue: { fontSize: 13, fontWeight: '700' },

  accountsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 },
  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.accent + '18', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.accent + '30' },
  addBtnText: { color: C.accent, fontSize: 13, fontWeight: '600' },

  accRow: {
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
  accLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  accIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center' },
  accName: { color: C.text, fontSize: 15, fontWeight: '600' },
  accUpdated: { color: C.muted, fontSize: 11, marginTop: 2 },
  accRight: { alignItems: 'flex-end', gap: 6 },
  accBalance: { color: C.text, fontSize: 16, fontWeight: '700' },
  accActions: { flexDirection: 'row', gap: 10 },
  iconBtn: { padding: 4 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '600' },
  emptyBody: { color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  emptyAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: C.accent, borderRadius: 14, paddingHorizontal: 20, paddingVertical: 12, marginTop: 8 },
  emptyAddBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#16162E', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 40, borderWidth: 1, borderBottomWidth: 0, borderColor: C.border },
  handle: { width: 42, height: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 2.5, alignSelf: 'center', marginBottom: 20 },
  sheetTitle: { color: C.text, fontSize: 20, fontWeight: '700', marginBottom: 20 },
  typeRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  typeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: 1.5, borderColor: C.border, borderRadius: 12, paddingVertical: 12 },
  typeBtnActive: { backgroundColor: C.accent, borderColor: C.accent },
  typeText: { color: C.muted, fontWeight: '600', fontSize: 14 },
  typeTextActive: { color: '#FFF' },
  inputLabel: { color: C.muted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  input: { backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 16, paddingVertical: 14, color: C.text, fontSize: 16, marginBottom: 18 },
  amountRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 14, borderWidth: 1.5, borderColor: C.accent + '40', paddingHorizontal: 16, marginBottom: 24 },
  rupee: { color: C.accent, fontSize: 22, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, paddingVertical: 14, color: C.text, fontSize: 22, fontWeight: '700' },
  saveBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default WalletScreen;
