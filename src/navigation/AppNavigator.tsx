import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import OverviewScreen from '../screens/OverviewScreen';
import WalletScreen from '../screens/WalletScreen';

const ACCENT = '#FFFFFF';
const MUTED = 'rgba(255,255,255,0.40)';
const BAR_BG = '#121212';
const BORDER = 'rgba(255,255,255,0.10)';

// Inline simpler icon designs to remove lucide-react-native and react-native-svg dependency entirely
const PlanIcon = ({ color }: { color: string }) => (
  <View style={styles.tabIconBase}>
    <View style={[styles.tabIconBox, { borderColor: color }]} />
    <View style={[styles.tabIconLine, { backgroundColor: color, width: 8 }]} />
    <View style={[styles.tabIconLine, { backgroundColor: color, width: 10, marginTop: 3 }]} />
  </View>
);

const OverviewIcon = ({ color }: { color: string }) => (
  <View style={[styles.tabIconBase, { flexDirection: 'row', alignItems: 'flex-end', gap: 3 }]}>
    <View style={{ width: 4, height: 8, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ width: 4, height: 14, backgroundColor: color, borderRadius: 1 }} />
    <View style={{ width: 4, height: 11, backgroundColor: color, borderRadius: 1 }} />
  </View>
);

const WalletIcon = ({ color }: { color: string }) => (
  <View style={styles.tabIconBase}>
    <View style={[styles.tabIconBox, { borderColor: color, height: 11, width: 16 }]} />
    <View style={[styles.tabIconDot, { backgroundColor: color }]} />
  </View>
);

export default function AppNavigator() {
  const [activeTab, setActiveTab] = useState<'Plan' | 'Overview' | 'Wallet'>('Plan');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {activeTab === 'Plan' && <HomeScreen />}
        {activeTab === 'Overview' && <OverviewScreen />}
        {activeTab === 'Wallet' && <WalletScreen />}
      </View>

      <View style={styles.bar}>
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
          onPress={() => setActiveTab('Overview')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrap, activeTab === 'Overview' && styles.iconWrapActive]}>
            <OverviewIcon color={activeTab === 'Overview' ? ACCENT : MUTED} />
          </View>
          <Text style={[styles.label, { color: activeTab === 'Overview' ? ACCENT : MUTED }]}>Overview</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.item}
          onPress={() => setActiveTab('Wallet')}
          activeOpacity={0.8}
        >
          <View style={[styles.iconWrap, activeTab === 'Wallet' && styles.iconWrapActive]}>
            <WalletIcon color={activeTab === 'Wallet' ? ACCENT : MUTED} />
          </View>
          <Text style={[styles.label, { color: activeTab === 'Wallet' ? ACCENT : MUTED }]}>Wallet</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
  tabIconDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    position: 'absolute',
    right: 4,
  },
});
