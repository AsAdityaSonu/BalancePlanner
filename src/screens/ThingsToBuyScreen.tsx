import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  Plus,
  Pencil,
  Trash2,
  ShoppingBag,
  Check,
  X,
  DollarSign,
} from 'lucide-react-native';
import { ThingToBuy, getThingsToBuy, saveThingsToBuy } from '../storage/thingsToBuy';
import { getMonth, saveMonth, getAllMonthIds, recalculateProgressiveBalances } from '../storage';
import { formatCurrency, getCurrentMonthId, getClosingBalance } from '../utils';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  bg: '#000000',
  surface: '#121212',
  sheet: '#16162E',
  border: 'rgba(255,255,255,0.10)',
  income: '#30D158',
  expense: '#FF453A',
  accent: '#7B6EF5',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  mutedHigh: 'rgba(255,255,255,0.65)',
};

const ThingsToBuyScreen = () => {
  const [items, setItems] = useState<ThingToBuy[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentProgressiveBalance, setCurrentProgressiveBalance] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showAllocateModal, setShowAllocateModal] = useState(false);
  const [editingItem, setEditingItem] = useState<ThingToBuy | null>(null);
  const [allocatingItem, setAllocatingItem] = useState<ThingToBuy | null>(null);

  // Form states
  const [inputName, setInputName] = useState('');
  const [inputPrice, setInputPrice] = useState('');
  const [inputNotes, setInputNotes] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_e, gestureState) => gestureState.dy > 5,
      onPanResponderMove: (_e, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_e, gestureState) => {
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
    }),
  ).current;

  const loadData = useCallback(async () => {
    setLoading(true);
    // Recalculate balances first to get accurate progressive balance
    await recalculateProgressiveBalances();

    const wishlist = await getThingsToBuy();
    setItems(wishlist);

    // Get closing balance of current month as the progressive balance
    const currentId = getCurrentMonthId();
    const currentData = await getMonth(currentId);
    if (currentData) {
      setCurrentProgressiveBalance(getClosingBalance(currentData));
    } else {
      // Find latest month in storage to get progressive balance
      const ids = await getAllMonthIds();
      if (ids.length > 0) {
        ids.sort();
        const latestData = await getMonth(ids[ids.length - 1]);
        setCurrentProgressiveBalance(latestData ? getClosingBalance(latestData) : 0);
      } else {
        setCurrentProgressiveBalance(0);
      }
    }
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    if (showModal || showAllocateModal) {
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 90,
      }).start();
    }
  }, [showModal, showAllocateModal, translateY]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setShowModal(false);
      setShowAllocateModal(false);
      setEditingItem(null);
      setAllocatingItem(null);
    });
  };

  const openAdd = () => {
    setEditingItem(null);
    setInputName('');
    setInputPrice('');
    setInputNotes('');
    setShowModal(true);
  };

  const openEdit = (item: ThingToBuy) => {
    setEditingItem(item);
    setInputName(item.name);
    setInputPrice(String(item.price));
    setInputNotes(item.notes || '');
    setShowModal(true);
  };

  const openAllocate = (item: ThingToBuy) => {
    setAllocatingItem(item);
    setAllocateAmount('');
    setShowAllocateModal(true);
  };

  const handleSave = async () => {
    const price = parseFloat(inputPrice.replace(/,/g, ''));
    if (!inputName.trim() || isNaN(price) || price <= 0) {
      Alert.alert('Invalid input', 'Please enter a name and valid price.');
      return;
    }

    let updated: ThingToBuy[];
    if (editingItem) {
      updated = items.map(i =>
        i.id === editingItem.id
          ? {
              ...i,
              name: inputName.trim(),
              price,
              notes: inputNotes.trim() || undefined,
            }
          : i,
      );
    } else {
      const newItem: ThingToBuy = {
        id: Date.now().toString(),
        name: inputName.trim(),
        price,
        allocatedAmount: 0,
        isPurchased: false,
        notes: inputNotes.trim() || undefined,
        createdAt: Date.now(),
      };
      updated = [...items, newItem];
    }

    setItems(updated);
    await saveThingsToBuy(updated);
    handleClose();
  };

  const handleAllocate = async () => {
    const amount = parseFloat(allocateAmount.replace(/,/g, ''));
    if (isNaN(amount) || amount <= 0 || !allocatingItem) {
      Alert.alert('Invalid amount', 'Please enter a valid allocation amount.');
      return;
    }

    // Update wishlist items
    const updated = items.map(i => {
      if (i.id === allocatingItem.id) {
        const newAllocated = Math.min(i.price, i.allocatedAmount + amount);
        return {
          ...i,
          allocatedAmount: newAllocated,
        };
      }
      return i;
    });

    setItems(updated);
    await saveThingsToBuy(updated);
    handleClose();
    Alert.alert('Success', `Allocated ${formatCurrency(amount)} to ${allocatingItem.name}`);
  };

  const handlePurchase = async (item: ThingToBuy) => {
    Alert.alert(
      'Purchase Item',
      `Mark "${item.name}" as purchased and add to this month's plan as an expense of ${formatCurrency(item.price)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Purchase',
          onPress: async () => {
            const currentId = getCurrentMonthId();
            let monthData = await getMonth(currentId);
            if (!monthData) {
              monthData = { id: currentId, openingBalance: 0, transactions: [] };
            }

            // Add transaction to current month
            const newT = {
              id: Date.now().toString(),
              description: `Purchased: ${item.name}`,
              amount: item.price,
              type: 'expense' as const,
              createdAt: Date.now(),
            };

            const updatedMonth = {
              ...monthData,
              transactions: [...monthData.transactions, newT],
            };

            await saveMonth(updatedMonth);
            await recalculateProgressiveBalances();

            // Mark item as purchased in storage
            const updatedItems = items.map(i =>
              i.id === item.id ? { ...i, isPurchased: true, allocatedAmount: i.price } : i,
            );

            setItems(updatedItems);
            await saveThingsToBuy(updatedItems);
            loadData();
          },
        },
      ],
    );
  };

  const handleDelete = (id: string) => {
    Alert.alert('Delete Item', 'Remove this item from your list?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updated = items.filter(i => i.id !== id);
          setItems(updated);
          await saveThingsToBuy(updated);
        },
      },
    ]);
  };

  const renderItem = ({ item }: { item: ThingToBuy }) => {
    const progress = Math.min(1, item.allocatedAmount / item.price);
    const needed = Math.max(0, item.price - item.allocatedAmount);

    return (
      <View style={[styles.card, item.isPurchased && styles.cardPurchased]}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemName, item.isPurchased && styles.textLineThrough]}>
              {item.name}
            </Text>
            {item.notes ? (
              <Text style={styles.itemNotes} numberOfLines={2}>
                {item.notes}
              </Text>
            ) : null}
          </View>
          <Text style={styles.itemPrice}>{formatCurrency(item.price)}</Text>
        </View>

        {!item.isPurchased ? (
          <>
            {/* Progress bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${progress * 100}%` }]} />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressText}>
                  Saved: {formatCurrency(item.allocatedAmount)} ({Math.round(progress * 100)}%)
                </Text>
                <Text style={styles.progressText}>Needed: {formatCurrency(needed)}</Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.allocateBtn}
                onPress={() => openAllocate(item)}
                activeOpacity={0.7}
              >
                <DollarSign size={14} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.allocateBtnText}>Save Money</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.purchaseBtn}
                onPress={() => handlePurchase(item)}
                activeOpacity={0.7}
              >
                <Check size={14} color="#30D158" strokeWidth={2.5} />
                <Text style={styles.purchaseBtnText}>Purchase</Text>
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 6, marginLeft: 'auto' }}>
                <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                  <Pencil size={15} color={C.muted} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.iconBtn}>
                  <Trash2 size={15} color={C.expense + 'BB'} />
                </TouchableOpacity>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.purchasedRow}>
            <View style={styles.badgeSuccess}>
              <Check size={12} color="#30D158" strokeWidth={3} />
              <Text style={styles.badgeSuccessText}>Purchased</Text>
            </View>
            <TouchableOpacity
              onPress={() => handleDelete(item.id)}
              style={[styles.iconBtn, { marginLeft: 'auto' }]}
            >
              <Trash2 size={15} color={C.expense + 'AA'} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Calculations
  const pendingItems = items.filter(i => !i.isPurchased);
  const totalBudgetNeeded = pendingItems.reduce((acc, i) => acc + (i.price - i.allocatedAmount), 0);

  const Header = () => (
    <>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>Things to Buy</Text>
        <Text style={styles.pageSub}>Plan and budget for future purchases</Text>
      </View>

      {/* Overview Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>BUDGET NEEDED</Text>
          <Text style={styles.statsValue}>{formatCurrency(totalBudgetNeeded)}</Text>
        </View>

        <View style={styles.statsCard}>
          <Text style={styles.statsLabel}>PROGRESSIVE BALANCE</Text>
          <Text style={[styles.statsValue, { color: currentProgressiveBalance >= 0 ? C.income : C.expense }]}>
            {formatCurrency(currentProgressiveBalance)}
          </Text>
        </View>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>WISHLIST & TARGETS</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.7}>
          <Plus size={14} color="#FFF" strokeWidth={2.5} />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const Empty = () => (
    <View style={styles.empty}>
      <ShoppingBag size={52} color={C.muted} strokeWidth={1.5} />
      <Text style={styles.emptyTitle}>Wishlist is empty</Text>
      <Text style={styles.emptyBody}>
        Add things you want to buy and track your saving progress here.
      </Text>
      <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd} activeOpacity={0.8}>
        <Plus size={16} color="#FFF" strokeWidth={2.5} />
        <Text style={styles.emptyAddBtnText}>Add First Item</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <FlatList
        data={items}
        keyExtractor={i => i.id}
        renderItem={renderItem}
        ListHeaderComponent={Header}
        ListEmptyComponent={!loading ? Empty : null}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadData} tintColor="#FFF" />
        }
      />

      {/* Add / Edit Modal */}
      <Modal visible={showModal} transparent animationType="none" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
            <View style={styles.backdrop} />
          </Pressable>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>
                {editingItem ? 'Edit Wishlist Item' : 'Add Wishlist Item'}
              </Text>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <X size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Item Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. MacBook Pro, Gym Shoes..."
              placeholderTextColor={C.muted}
              value={inputName}
              onChangeText={setInputName}
              autoFocus
            />

            <Text style={styles.inputLabel}>Price (₹)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={C.muted}
                value={inputPrice}
                onChangeText={setInputPrice}
                keyboardType="numeric"
              />
            </View>

            <Text style={styles.inputLabel}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
              placeholder="e.g. Needs to be the space black model..."
              placeholderTextColor={C.muted}
              value={inputNotes}
              onChangeText={setInputNotes}
              multiline
            />

            <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>
                {editingItem ? 'Update Item' : 'Add to Wishlist'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Allocate Budget Modal */}
      <Modal visible={showAllocateModal} transparent animationType="none" onRequestClose={handleClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.overlay}
        >
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose}>
            <View style={styles.backdrop} />
          </Pressable>
          <Animated.View
            style={[styles.sheet, { transform: [{ translateY }] }]}
            {...panResponder.panHandlers}
          >
            <View style={styles.handle} />
            <View style={styles.sheetHeader}>
              <View>
                <Text style={styles.sheetTitle}>Save Money</Text>
                <Text style={styles.sheetSub}>
                  Allocate progressive balance to {allocatingItem?.name}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.closeIconBtn}
                onPress={handleClose}
                activeOpacity={0.7}
              >
                <X size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Amount to Allocate (₹)</Text>
            <View style={styles.amountRow}>
              <Text style={styles.rupee}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={C.muted}
                value={allocateAmount}
                onChangeText={setAllocateAmount}
                keyboardType="numeric"
                autoFocus
              />
            </View>

            <Text style={styles.infoText}>
              Available Progressive Balance: {formatCurrency(currentProgressiveBalance)}
            </Text>

            <TouchableOpacity style={styles.saveBtn} onPress={handleAllocate} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Allocate Savings</Text>
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

  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statsCard: {
    flex: 1,
    backgroundColor: C.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  statsLabel: { color: C.muted, fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  statsValue: { color: C.text, fontSize: 18, fontWeight: '800', marginTop: 6 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: { color: C.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: C.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: '#FFF', fontSize: 12, fontWeight: '700' },

  card: {
    backgroundColor: C.surface,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardPurchased: { opacity: 0.65 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 },
  itemName: { color: C.text, fontSize: 16, fontWeight: '700' },
  itemNotes: { color: C.muted, fontSize: 12, marginTop: 4 },
  itemPrice: { color: C.text, fontSize: 16, fontWeight: '700' },
  textLineThrough: { textDecorationLine: 'line-through', color: C.muted },

  progressContainer: { marginTop: 16 },
  progressBarBg: { height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: C.accent },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressText: { color: C.muted, fontSize: 11, fontWeight: '500' },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'center' },
  allocateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(123, 110, 245, 0.18)',
    borderWidth: 1,
    borderColor: 'rgba(123, 110, 245, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  allocateBtnText: { color: '#7B6EF5', fontSize: 12, fontWeight: '700' },
  purchaseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  purchaseBtnText: { color: '#30D158', fontSize: 12, fontWeight: '700' },
  iconBtn: { padding: 6 },

  purchasedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  badgeSuccess: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(48, 209, 88, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeSuccessText: { color: '#30D158', fontSize: 11, fontWeight: '700' },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { color: C.text, fontSize: 18, fontWeight: '600' },
  emptyBody: { color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.accent,
    borderRadius: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 8,
  },
  emptyAddBtnText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  sheet: {
    backgroundColor: C.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 40,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.border,
  },
  handle: {
    width: 42,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sheetTitle: { color: C.text, fontSize: 20, fontWeight: '700' },
  sheetSub: { color: C.muted, fontSize: 12, marginTop: 4 },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputLabel: { color: C.muted, fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: C.text,
    fontSize: 16,
    marginBottom: 18,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.accent + '40',
    paddingHorizontal: 16,
    marginBottom: 18,
  },
  rupee: { color: C.text, fontSize: 22, fontWeight: '700', marginRight: 8 },
  amountInput: { flex: 1, paddingVertical: 14, color: C.text, fontSize: 22, fontWeight: '700' },
  infoText: { color: C.muted, fontSize: 12, marginBottom: 18, fontStyle: 'italic' },
  saveBtn: { backgroundColor: C.accent, borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

export default ThingsToBuyScreen;
