import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { IconCircle } from './ui';

export function BottomNav({ onMenu, onNew, onClipboard, menuActive }: { onMenu: () => void; onNew: () => void; onClipboard: () => void; menuActive?: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) + 14 }]}>
      <IconCircle icon="menu" onPress={onMenu} bg={menuActive ? colors.accent100 : 'transparent'} color={menuActive ? colors.accent700 : colors.neutral700} accessibilityLabel="Menu" />
      <IconCircle icon="plus" size={60} iconSize={30} bg={colors.accent} color={colors.bg} elevated onPress={onNew} accessibilityLabel="Nova nota" />
      <IconCircle icon="clipboard" onPress={onClipboard} accessibilityLabel="Área de transferência" />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    paddingHorizontal: 30,
    backgroundColor: colors.bg,
  },
});
