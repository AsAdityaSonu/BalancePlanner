import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import ThingsToBuyScreen from '../screens/ThingsToBuyScreen';

const ACCENT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.40)';
const BAR_BG = '#121212';
const BORDER = 'rgba(255,255,255,0.10)';

const PlanIcon = ({ color }: { color: string }) => (
  <View style={styles.tabIconBase}>
    <View style={[styles.tabIconBox, { borderColor: color }]} />
    <View style={[styles.tabIconLine, { backgroundColor: color, width: 8 }]} />
    <View style={[styles.tabIconLine, { backgroundColor: color, width: 10, marginTop: 3 }]} />
  </View>
);

const BuyIcon = ({ color }: { color: string }) => (
  <View style={styles.tabIconBase}>
    <View style={{ width: 8, height: 5, borderTopWidth: 2, borderLeftWidth: 2, borderRightWidth: 2, borderTopLeftRadius: 4, borderTopRightRadius: 4, borderColor: color, marginBottom: -2 }} />
    <View style={[styles.tabIconBox, { borderColor: color, height: 12, width: 15 }]} />
  </View>
);

export default function AppNavigator() {
  const [activeTab, setActiveTab] = useState<'Plan' | 'Buy'>('Plan');
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'Plan' && <HomeScreen />}
        {activeTab === 'Buy' && <ThingsToBuyScreen />}
      </View>

      <View style={[styles.bar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 10 }]}>
        <TouchableOpacity
          style={styles.item}
          onPress={() => setActiveTab('Plan')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrap, activeTab === 'Plan' && styles.iconWrapActive]}>
            <PlanIcon color={activeTab === 'Plan' ? ACCENT : MUTED} />
          </View>
          <Text style={[styles.label, { color: activeTab === 'Plan' ? ACCENT : MUTED }]}>Plan</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => setActiveTab('Buy')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrap, activeTab === 'Buy' && styles.iconWrapActive]}>
            <BuyIcon color={activeTab === 'Buy' ? ACCENT : MUTED} />
          </View>
          <Text style={[styles.label, { color: activeTab === 'Buy' ? ACCENT : MUTED }]}>Things to Buy</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#080B14',
  },

  content: {
    flex: 1,
  },
  bar: {
    flexDirection: 'row',
    backgroundColor: BAR_BG,
    borderTopWidth: 1,
    borderTopColor: BORDER,
    paddingTop: 10,
    paddingBottom: 10,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 44,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: ACCENT + '18',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 4,
  },
  tabIconBase: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabIconBox: {
    width: 14,
    height: 14,
    borderWidth: 2,
    borderRadius: 3,
  },
  tabIconLine: {
    height: 2,
    borderRadius: 1,
    position: 'absolute',
  },
});
