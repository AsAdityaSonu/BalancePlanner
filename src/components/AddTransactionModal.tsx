import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  PanResponder,
  Dimensions,
  Alert,
  ScrollView,
} from 'react-native';
import { TrendingUp, TrendingDown, Plus, ShoppingBag, X } from 'lucide-react-native';
import { Transaction } from '../types';
import { ThingToBuy } from '../storage/thingsToBuy';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (t: Omit<Transaction, 'id' | 'createdAt'> & { thingToBuyId?: string }) => void;
  onUpdate?: (id: string, t: Omit<Transaction, 'id' | 'createdAt'> & { thingToBuyId?: string }) => void;
  thingsToBuy?: ThingToBuy[];
  editingTransaction?: Transaction | null;
}

const COLORS = {
  bg: '#000000',
  sheet: '#16162E',
  border: 'rgba(255,255,255,0.10)',
  income: '#30D158',
  expense: '#FF453A',
  accent: '#7B6EF5',
  text: '#FFFFFF',
  muted: 'rgba(255,255,255,0.45)',
  surface: 'rgba(255,255,255,0.04)',
};

const AddTransactionModal: React.FC<Props> = ({ 
  visible, 
  onClose, 
  onAdd, 
  onUpdate, 
  thingsToBuy = [], 
  editingTransaction 
}) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedThingId, setSelectedThingId] = useState<string>('');

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
    })
  ).current;

  useEffect(() => {
    if (visible) {
      if (editingTransaction) {
        setType(editingTransaction.type);
        setDescription(editingTransaction.description);
        setAmount(String(editingTransaction.amount));
        setSelectedThingId(editingTransaction.accountId || ''); // repurpose accountId as thingToBuyId in DB linking
      } else {
        setType('expense');
        setDescription('');
        setAmount('');
        setSelectedThingId('');
      }

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 90,
      }).start();
    }
  }, [visible, translateY, editingTransaction]);

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const handleSave = () => {
    const num = parseFloat(amount.replace(/,/g, ''));
    if (!description.trim() || isNaN(num) || num <= 0) {
      Alert.alert('Invalid input', 'Please enter a description and amount.');
      return;
    }
    
    const payload = {
      description: description.trim(),
      amount: num,
      type,
      accountId: selectedThingId || undefined, // use accountId slot to store linked thing id
    };

    if (editingTransaction && onUpdate) {
      onUpdate(editingTransaction.id, payload);
    } else {
      onAdd(payload);
    }
    
    setDescription('');
    setAmount('');
    setType('expense');
    setSelectedThingId('');
    handleClose();
  };

  const accentColor = type === 'income' ? COLORS.income : COLORS.expense;
  const pendingThings = thingsToBuy.filter(item => !item.isPurchased);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <Pressable 
          style={StyleSheet.absoluteFill} 
          onPress={handleClose} 
        >
          <View style={styles.backdrop} />
        </Pressable>
        
        <Animated.View 
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <View style={styles.handle} />

          <View style={styles.sheetHeader}>
            <Text style={styles.title}>{editingTransaction ? 'Edit Entry' : 'Add Entry'}</Text>
            <TouchableOpacity style={styles.closeIconBtn} onPress={handleClose} activeOpacity={0.7}>
              <X size={20} color={COLORS.muted} strokeWidth={2.2} />
            </TouchableOpacity>
          </View>

          {/* Type Toggle */}
          <View style={styles.toggle}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                type === 'income' && { backgroundColor: COLORS.income + '22', borderColor: COLORS.income },
              ]}
              onPress={() => setType('income')}
              activeOpacity={0.7}>
              <TrendingUp size={16} color={type === 'income' ? COLORS.income : COLORS.muted} strokeWidth={2.5} />
              <Text style={[styles.toggleText, type === 'income' && { color: COLORS.income }]}>
                Income
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                type === 'expense' && { backgroundColor: COLORS.expense + '22', borderColor: COLORS.expense },
              ]}
              onPress={() => setType('expense')}
              activeOpacity={0.7}>
              <TrendingDown size={16} color={type === 'expense' ? COLORS.expense : COLORS.muted} strokeWidth={2.5} />
              <Text style={[styles.toggleText, type === 'expense' && { color: COLORS.expense }]}>
                Expense
              </Text>
            </TouchableOpacity>
          </View>

          {/* Description */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.input, { borderColor: accentColor + '40' }]}
              placeholder="e.g. Rent, Salary, Food..."
              placeholderTextColor={COLORS.muted}
              value={description}
              onChangeText={setDescription}
              returnKeyType="next"
              autoFocus
            />
          </View>

          {/* Optional link to Wishlist / Things to Buy */}
          {type === 'expense' && pendingThings.length > 0 && (
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Link to Wishlist Item (Optional)</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.wishlistScroll}>
                {pendingThings.map(item => {
                  const selected = selectedThingId === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.wishlistItem,
                        selected && { borderColor: COLORS.accent, backgroundColor: 'rgba(123, 110, 245, 0.15)' }
                      ]}
                      onPress={() => {
                        if (selected) {
                          setSelectedThingId('');
                        } else {
                          setSelectedThingId(item.id);
                          setDescription(`Purchase: ${item.name}`);
                          setAmount(String(item.price));
                        }
                      }}
                      activeOpacity={0.8}
                    >
                      <ShoppingBag size={13} color={selected ? COLORS.accent : COLORS.muted} />
                      <Text style={[styles.wishlistText, selected && { color: COLORS.text }]}>
                        {item.name} ({formatCurrency(item.price)})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          {/* Amount */}
          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <View style={[styles.amountRow, { borderColor: accentColor + '40' }]}>
              <Text style={[styles.rupeeSign, { color: accentColor }]}>₹</Text>
              <TextInput
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={COLORS.muted}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                returnKeyType="done"
                onSubmitEditing={handleSave}
              />
            </View>
          </View>

          {/* Add/Save Button */}
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: COLORS.accent }]}
            onPress={handleSave}
            activeOpacity={0.85}>
            <Plus size={18} color="#fff" strokeWidth={2.5} style={{ marginRight: 6 }} />
            <Text style={styles.addBtnText}>{editingTransaction ? 'Save Changes' : 'Add to Plan'}</Text>
          </TouchableOpacity>

          {editingTransaction && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => {
                Alert.alert('Remove Entry', 'Delete this planned entry?', [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      if (editingTransaction && onUpdate) {
                        onUpdate(editingTransaction.id, null as any);
                        handleClose();
                      }
                    },
                  },
                ]);
              }}
              activeOpacity={0.85}>
              <Text style={styles.deleteBtnText}>Delete Entry</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

// Helper for formatting
const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  sheet: {
    backgroundColor: COLORS.sheet,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingBottom: 44,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: COLORS.border,
  },
  handle: {
    width: 42,
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    letterSpacing: 0.3,
  },
  closeIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
  },
  toggleText: {
    color: COLORS.muted,
    fontWeight: '600',
    fontSize: 15,
  },
  inputWrapper: {
    marginBottom: 18,
  },
  inputLabel: {
    color: COLORS.muted,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '500',
    borderColor: COLORS.border,
  },
  wishlistScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  wishlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  wishlistText: {
    color: COLORS.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  rupeeSign: {
    fontSize: 20,
    fontWeight: '700',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
  },
  addBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.3,
  },
  deleteBtn: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    borderWidth: 1.5,
    borderColor: '#FF453A',
    backgroundColor: 'rgba(255, 69, 58, 0.08)',
  },
  deleteBtnText: {
    color: '#FF453A',
    fontWeight: '700',
    fontSize: 16,
  },
});

export default AddTransactionModal;
