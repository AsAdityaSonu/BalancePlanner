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
} from 'react-native';
import { TrendingUp, TrendingDown, Plus, Landmark } from 'lucide-react-native';
import { Transaction } from '../types';
import { BankAccount } from '../storage/wallet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd: (t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  onUpdate?: (id: string, t: Omit<Transaction, 'id' | 'createdAt'>) => void;
  accounts: BankAccount[];
  editingTransaction?: Transaction | null;
}

const COLORS = {
  bg: '#0A0A1A',
  sheet: '#16162E',
  border: 'rgba(255,255,255,0.08)',
  income: '#10D9A5',
  expense: '#FF5E6C',
  accent: '#7B6EF5',
  text: '#F0F0FF',
  muted: 'rgba(240,240,255,0.45)',
  surface: 'rgba(255,255,255,0.04)',
};

const AddTransactionModal: React.FC<Props> = ({ 
  visible, 
  onClose, 
  onAdd, 
  onUpdate, 
  accounts, 
  editingTransaction 
}) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Pan Responder for swiping down to close
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
          // Snap back
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
        setSelectedAccountId(editingTransaction.accountId || '');
      } else {
        setType('expense');
        setDescription('');
        setAmount('');
        if (accounts.length > 0) {
          setSelectedAccountId(accounts[0].id);
        } else {
          setSelectedAccountId('');
        }
      }

      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 90,
      }).start();
    }
  }, [visible, translateY, accounts, editingTransaction]);

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
    if (!description.trim() || isNaN(num) || num <= 0) return;
    
    const payload = {
      description: description.trim(),
      amount: num,
      type,
      accountId: selectedAccountId || undefined,
    };

    if (editingTransaction && onUpdate) {
      onUpdate(editingTransaction.id, payload);
    } else {
      onAdd(payload);
    }
    
    setDescription('');
    setAmount('');
    setType('expense');
    handleClose();
  };

  const accentColor = type === 'income' ? COLORS.income : COLORS.expense;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <Pressable 
          style={styles.backdrop} 
          onPress={handleClose} 
        />
        
        <Animated.View 
          style={[styles.sheet, { transform: [{ translateY }] }]}
          {...panResponder.panHandlers}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={20}
          >
            {/* Header handle */}
            <View style={styles.handle} />

            <Text style={styles.title}>{editingTransaction ? 'Edit Entry' : 'Add Entry'}</Text>

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

            {/* Account Selection */}
            {accounts.length > 0 && (
              <View style={styles.inputWrapper}>
                <Text style={styles.inputLabel}>Select Wallet Account</Text>
                <View style={styles.accountsScroll}>
                  {accounts.map(acc => {
                    const selected = selectedAccountId === acc.id;
                    return (
                      <TouchableOpacity
                        key={acc.id}
                        style={[
                          styles.accountSelectorItem,
                          selected && { borderColor: COLORS.accent, backgroundColor: COLORS.accent + '15' }
                        ]}
                        onPress={() => setSelectedAccountId(acc.id)}
                        activeOpacity={0.8}
                      >
                        <Landmark size={13} color={selected ? COLORS.accent : COLORS.muted} />
                        <Text style={[styles.accountSelectorText, selected && { color: COLORS.text }]}>
                          {acc.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
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
              style={[styles.addBtn, { backgroundColor: accentColor }]}
              onPress={handleSave}
              activeOpacity={0.85}>
              <Plus size={18} color="#fff" strokeWidth={2.5} style={{ marginRight: 6 }} />
              <Text style={styles.addBtnText}>{editingTransaction ? 'Save Changes' : 'Add to Plan'}</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
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
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
    letterSpacing: 0.3,
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
  },
  accountsScroll: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  accountSelectorItem: {
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
  accountSelectorText: {
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
});

export default AddTransactionModal;
