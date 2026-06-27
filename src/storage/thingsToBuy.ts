import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThingToBuy {
  id: string;
  name: string;
  price: number;
  allocatedAmount: number;
  isPurchased: boolean;
  notes?: string;
  createdAt: number;
}

const KEY = '@BalancePlanner:thingsToBuy';

export const getThingsToBuy = async (): Promise<ThingToBuy[]> => {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch {
    return [];
  }
};

export const saveThingsToBuy = async (items: ThingToBuy[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error saving things to buy', e);
  }
};
