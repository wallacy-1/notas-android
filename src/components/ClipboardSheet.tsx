import React, { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow } from '../theme';
import { useClipboard } from '../store/ClipboardContext';
import { useNotes } from '../store/NotesContext';
import { navigationRef } from '../navigation/ref';
import { formatRelative } from '../lib/date';
import type { ClipItem } from '../types';
import { IconCircle, Tag } from './ui';

const kindVariant = { texto: 'accent', link: 'accent2', 'código': 'neutral' } as const;

function ClipRow({ item, selected, onPress }: { item: ClipItem; selected: boolean; onPress: () => void }) {
  const isCode = item.kind === 'código';
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.item, selected && styles.itemSelected, pressed && { opacity: 0.8 }]}>
      <View style={styles.itemHead}>
        <Tag label={item.kind} variant={kindVariant[item.kind]} size="xs" />
        {item.pinned ? <Feather name="bookmark" size={11} color={colors.accent700} /> : null}
        <Text style={styles.time}>{formatRelative(item.createdAt)}</Text>
      </View>
      <Text numberOfLines={3} style={[styles.itemText, item.kind === 'link' && { color: colors.accent700 }, isCode && styles.itemCode]}>
        {item.text}
      </Text>
    </Pressable>
  );
}

export function ClipboardSheet() {
  const clip = useClipboard();
  const notes = useNotes();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q ? clip.items.filter((i) => i.text.toLowerCase().includes(q)) : clip.items;
    return [...filtered].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.createdAt - a.createdAt);
  }, [clip.items, query]);

  const selected = list.find((i) => i.id === selectedId) ?? list[0];

  const close = () => {
    clip.close();
    setQuery('');
    setSelectedId(null);
  };

  const pasteIntoNote = () => {
    if (!selected) return;
    if (clip.activeNoteId && notes.getNote(clip.activeNoteId)) {
      notes.appendToNote(clip.activeNoteId, selected.text);
    } else {
      const note = notes.createNote({ body: selected.text });
      if (navigationRef.isReady()) navigationRef.navigate('Editor', { noteId: note.id });
    }
    close();
  };

  return (
    <Modal visible={clip.visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={close} />
      <View style={[styles.sheet, { marginBottom: Math.max(insets.bottom, 12) + 12 }]}>
        <View style={styles.head}>
          <Text style={styles.title}>Transferência</Text>
          <Text style={styles.sub}>últimas 24 h</Text>
        </View>
        <View style={styles.search}>
          <Feather name="search" size={16} color={colors.neutral600} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Filtrar itens copiados"
            placeholderTextColor={colors.neutral600}
            style={styles.searchInput}
            autoCorrect={false}
          />
        </View>
        <FlatList
          data={list}
          keyExtractor={(i) => i.id}
          style={{ maxHeight: 330 }}
          contentContainerStyle={{ gap: 10 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => <ClipRow item={item} selected={selected?.id === item.id} onPress={() => setSelectedId(item.id)} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>{query ? 'Nada copiado combina com o filtro.' : 'Nada copiado ainda. Copie um texto em qualquer app e ele aparece aqui quando você voltar.'}</Text>
            </View>
          }
        />
        <View style={styles.actions}>
          <Pressable onPress={pasteIntoNote} disabled={!selected} style={({ pressed }) => [styles.paste, { opacity: !selected ? 0.45 : pressed ? 0.85 : 1 }]}>
            <Text style={styles.pasteText}>{clip.activeNoteId ? 'Colar na nota' : 'Colar em nova nota'}</Text>
          </Pressable>
          <IconCircle icon="bookmark" size={46} bg={colors.bg} color={selected?.pinned ? colors.accent700 : colors.neutral700} disabled={!selected} onPress={() => selected && clip.togglePin(selected.id)} accessibilityLabel="Fixar" />
          <IconCircle icon="trash-2" size={46} bg={colors.bg} disabled={!selected} onPress={() => selected && clip.remove(selected.id)} accessibilityLabel="Apagar" />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: colors.overlay },
  sheet: {
    marginTop: 'auto',
    marginHorizontal: 14,
    backgroundColor: colors.surface,
    borderRadius: 32,
    paddingTop: 18,
    paddingHorizontal: 18,
    paddingBottom: 20,
    gap: 14,
    ...shadow.lg,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  title: { flex: 1, fontFamily: fonts.heading, fontSize: 20, color: colors.text },
  sub: { fontFamily: fonts.body, fontSize: 12, color: colors.neutral600 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 44, paddingHorizontal: 16, borderRadius: radius.pill, backgroundColor: colors.bg },
  searchInput: { flex: 1, fontFamily: fonts.body, fontSize: 15, color: colors.text, paddingVertical: 0 },
  item: { backgroundColor: colors.bg, borderRadius: 20, paddingVertical: 13, paddingHorizontal: 15, gap: 5, borderWidth: 1, borderColor: 'transparent' },
  itemSelected: { borderColor: colors.accent },
  itemHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  time: { marginLeft: 'auto', fontFamily: fonts.body, fontSize: 11, color: colors.neutral600 },
  itemText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.text },
  itemCode: { fontFamily: fonts.mono, fontSize: 13 },
  empty: { padding: 16, alignItems: 'center' },
  emptyText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.neutral700, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 10 },
  paste: { flex: 1, height: 46, borderRadius: radius.pill, backgroundColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
  pasteText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.bg },
});
