import AsyncStorage from '@react-native-async-storage/async-storage';
import { MonthData } from '../types';

const PREFIX = '@BalancePlanner:month:';

export const getMonth = async (id: string): Promise<MonthData | null> => {
  try {
    const json = await AsyncStorage.getItem(PREFIX + id);
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
};

export const saveMonth = async (data: MonthData): Promise<void> => {
  try {
    await AsyncStorage.setItem(PREFIX + data.id, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving month', e);
  }
};

export const getAllMonthIds = async (): Promise<string[]> => {
  try {
    const keys = await AsyncStorage.getAllKeys();
    return keys
      .filter(k => k.startsWith(PREFIX))
      .map(k => k.replace(PREFIX, ''))
      .sort();
  } catch {
    return [];
  }
};
