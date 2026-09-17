import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Note } from '../types';
import { colors, fonts } from '../theme';
import { formatNoteDate } from '../lib/date';
import { stripMarkdown } from '../lib/markdown';
import { Card, Tag } from './ui';

export function NoteCard({
  note,
  onPress,
  onToggleFavorite,
  onLongPress,
  tinted,
}: {
  note: Note;
  onPress: () => void;
  onToggleFavorite: () => void;
  onLongPress?: () => void;
  tinted?: boolean; // fundo terracota (tela Favoritas)
}) {
  const preview = stripMarkdown(note.body);
  return (
    <Card bg={tinted ? colors.accent100 : colors.surface} onPress={onPress} onLongPress={onLongPress} style={tinted && { shadowOpacity: 0, elevation: 0 }}>
      <View style={styles.row}>
        <Text style={styles.title} numberOfLines={2}>
          {note.title || 'Sem título'}
        </Text>
        <Pressable onPress={onToggleFavorite} hitSlop={10}>
          <Feather name="star" size={16} color={note.favorite ? colors.accent600 : colors.neutral400} style={note.favorite && { textShadowColor: colors.accent600 }} />
        </Pressable>
      </View>
      {preview ? (
        <Text style={[styles.preview, tinted && { color: colors.neutral800 }]} numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
      <View style={styles.meta}>
        <Text style={[styles.date, tinted && { color: colors.neutral700 }]}>{formatNoteDate(note.updatedAt)}</Text>
        {note.tags.slice(0, 3).map((t) => (
          <Tag key={t} label={t} size="sm" />
        ))}
        {note.attachments.length > 0 ? (
          <View style={styles.att}>
            <Feather name="paperclip" size={11} color={colors.accent700} />
            <Text style={styles.attText}>{note.attachments.length}</Text>
          </View>
        ) : null}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, lineHeight: 21, color: colors.text },
  preview: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.neutral700 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 2 },
  date: { fontFamily: fonts.body, fontSize: 12, color: colors.neutral600 },
  att: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  attText: { fontFamily: fonts.body, fontSize: 12, color: colors.accent700 },
});
