import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BankAccount {
  id: string;
  name: string;
  balance: number;
  updatedAt: number;
}

const KEY = '@BalancePlanner:wallet';

export const getWallet = async (): Promise<BankAccount[]> => {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

export const saveWallet = async (accounts: BankAccount[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(accounts));
  } catch (e) {
    console.error('Wallet save error', e);
  }
};
