import React from 'react';
import { Pressable, StyleSheet, Text, View, type PressableProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, fonts, radius, shadow } from '../theme';

export type IconName = React.ComponentProps<typeof Feather>['name'];

/* ── Tag / chip ─────────────────────────────────────────────── */
type TagVariant = 'accent' | 'accent2' | 'neutral' | 'outline' | 'solid' | 'solid2';

const tagPalette: Record<TagVariant, { bg: string; fg: string; border?: string }> = {
  accent: { bg: colors.accent100, fg: colors.accent800 },
  accent2: { bg: colors.accent2_100, fg: colors.accent2_800 },
  neutral: { bg: colors.neutral100, fg: colors.neutral800 },
  outline: { bg: 'transparent', fg: colors.accent, border: colors.accent },
  solid: { bg: colors.accent600, fg: colors.bg },
  solid2: { bg: colors.accent2_600, fg: colors.bg },
};

export function Tag({
  label,
  variant = 'accent2',
  size = 'sm',
  onPress,
  style,
}: {
  label: string;
  variant?: TagVariant;
  size?: 'xs' | 'sm' | 'md';
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const p = tagPalette[variant];
  const dims = size === 'xs' ? { fontSize: 10, paddingVertical: 2, paddingHorizontal: 8 } : size === 'sm' ? { fontSize: 11, paddingVertical: 2, paddingHorizontal: 9 } : { fontSize: 13, paddingVertical: 7, paddingHorizontal: 15 };
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.tag,
        { backgroundColor: p.bg, borderColor: p.border ?? 'transparent', paddingVertical: dims.paddingVertical, paddingHorizontal: dims.paddingHorizontal, opacity: pressed ? 0.7 : 1 },
        style,
      ]}
    >
      <Text style={{ fontFamily: fonts.body, fontSize: dims.fontSize, color: p.fg, letterSpacing: 0.2 }}>{label}</Text>
    </Pressable>
  );
}

/* ── Botão circular com ícone ───────────────────────────────── */
export function IconCircle({
  icon,
  size = 48,
  iconSize = 20,
  bg = 'transparent',
  color = colors.neutral700,
  elevated,
  style,
  ...rest
}: PressableProps & { icon: IconName; size?: number; iconSize?: number; bg?: string; color?: string; elevated?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      hitSlop={6}
      {...rest}
      style={({ pressed }) => [
        { width: size, height: size, borderRadius: radius.pill, backgroundColor: bg, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 },
        elevated && shadow.md,
        style,
      ]}
    >
      <Feather name={icon} size={iconSize} color={color} />
    </Pressable>
  );
}

/* ── Botões de texto (pill) ─────────────────────────────────── */
export function PillButton({
  label,
  variant = 'primary',
  icon,
  onPress,
  style,
  disabled,
}: {
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  icon?: IconName;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
}) {
  const fg = variant === 'primary' ? colors.bg : variant === 'ghost' ? colors.accent700 : colors.neutral800;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.pill,
        variant === 'primary' && { backgroundColor: colors.accent, ...shadow.md },
        variant === 'secondary' && { borderWidth: 1, borderColor: colors.divider },
        { opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}
    >
      {icon ? <Feather name={icon} size={18} color={fg} /> : null}
      <Text style={{ fontFamily: variant === 'primary' ? fonts.bodySemi : fonts.body, fontSize: variant === 'primary' ? 16 : 15, color: fg }}>{label}</Text>
    </Pressable>
  );
}

/* ── Título de tela ─────────────────────────────────────────── */
export function ScreenTitle({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Kicker({ children }: { children: React.ReactNode }) {
  return <Text style={styles.kicker}>{children}</Text>;
}

/* ── Card base ──────────────────────────────────────────────── */
export function Card({ children, style, bg = colors.surface, onPress, onLongPress }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; bg?: string; onPress?: () => void; onLongPress?: () => void }) {
  if (!onPress && !onLongPress) return <View style={[styles.card, { backgroundColor: bg }, style]}>{children}</View>;
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={({ pressed }) => [styles.card, { backgroundColor: bg, opacity: pressed ? 0.85 : 1 }, style]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: { borderRadius: radius.pill, borderWidth: 1, alignSelf: 'flex-start', alignItems: 'center', flexDirection: 'row' },
  pill: { height: 52, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 10, paddingHorizontal: 20 },
  title: { fontFamily: fonts.heading, fontSize: 30, lineHeight: 34, color: colors.text },
  kicker: { fontFamily: fonts.body, fontSize: 11, letterSpacing: 1.3, textTransform: 'uppercase', color: colors.accent700, paddingHorizontal: 4, paddingVertical: 6 },
  card: { borderRadius: 24, paddingVertical: 16, paddingHorizontal: 18, gap: 7, ...shadow.sm },
});
