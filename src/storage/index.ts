import AsyncStorage from '@react-native-async-storage/async-storage';
import { MonthData } from '../types';
import { getClosingBalance } from '../utils';

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

export const recalculateProgressiveBalances = async (): Promise<void> => {
  try {
    const ids = await getAllMonthIds();
    // Sort chronologically
    ids.sort();

    let prevClosing: number | null = null;

    for (let i = 0; i < ids.length; i++) {
      const currentId = ids[i];
      const data = await getMonth(currentId);
      if (!data) continue;

      let updated = false;

      // Determine the opening balance
      if (data.overrideStartingBalance !== undefined) {
        if (data.openingBalance !== data.overrideStartingBalance) {
          data.openingBalance = data.overrideStartingBalance;
          updated = true;
        }
      } else if (prevClosing !== null) {
        if (data.openingBalance !== prevClosing) {
          data.openingBalance = prevClosing;
          updated = true;
        }
      }

      // If opening balance was updated or if it's just part of propagation, update prevClosing
      prevClosing = getClosingBalance(data);

      if (updated) {
        await saveMonth(data);
      }
    }
  } catch (e) {
    console.error('Error recalculating progressive balances', e);
  }
};
