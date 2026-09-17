import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, shadow } from '../theme';
import type { IconName } from './ui';

export interface MenuEntry {
  icon: IconName;
  label: string;
  hint?: string;
  onPress: () => void;
}

export function MenuSheet({ visible, onClose, entries, title = 'Caderno' }: { visible: boolean; onClose: () => void; entries: MenuEntry[]; title?: string }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} />
      <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.list}>
          {entries.map((e, i) => (
            <Pressable
              key={e.label}
              onPress={() => {
                onClose();
                e.onPress();
              }}
              style={({ pressed }) => [styles.row, i < entries.length - 1 && styles.rowBorder, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.iconBox}>
                <Feather name={e.icon} size={17} color={colors.accent800} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.label}>{e.label}</Text>
                {e.hint ? <Text style={styles.hint}>{e.hint}</Text> : null}
              </View>
              <Feather name="chevron-right" size={18} color={colors.neutral600} />
            </Pressable>
          ))}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: { marginTop: 'auto', marginHorizontal: 14, backgroundColor: colors.surface, borderRadius: 32, padding: 18, gap: 14, ...shadow.lg },
  title: { fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  list: { backgroundColor: colors.bg, borderRadius: 26, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  iconBox: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accent100, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  hint: { fontFamily: fonts.body, fontSize: 12, color: colors.neutral600 },
});
