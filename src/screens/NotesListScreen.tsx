import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius } from '../theme';
import { useNotes } from '../store/NotesContext';
import { useClipboard } from '../store/ClipboardContext';
import { NoteCard } from '../components/NoteCard';
import { BottomNav } from '../components/BottomNav';
import { MenuSheet } from '../components/MenuSheet';
import { IconCircle, PillButton, ScreenTitle, Tag } from '../components/ui';
import { pickBackupFile } from '../lib/backup';

type Props = NativeStackScreenProps<RootStackParamList, 'Notes'>;
type Sort = 'recent' | 'title';

function EmptyState({ onWrite, onPaste, onRestore }: { onWrite: () => void; onPaste: () => void; onRestore: () => void }) {
  return (
    <View style={styles.empty}>
      <View style={styles.circles}>
        <View style={[styles.circle, { width: 66, height: 66, backgroundColor: colors.accent2_300 }]} />
        <View style={[styles.circle, { width: 50, height: 50, backgroundColor: colors.accent200, marginLeft: -16 }]} />
        <View style={[styles.circle, { width: 34, height: 34, backgroundColor: colors.neutral300, marginLeft: -12 }]} />
      </View>
      <Text style={styles.emptyTitle}>Caderno em branco</Text>
      <Text style={styles.emptyText}>A primeira nota pode ser qualquer coisa: uma lista de compras, uma ideia, um endereço colado.</Text>
      <View style={{ gap: 10, width: '100%' }}>
        <PillButton label="Escrever a primeira nota" onPress={onWrite} />
        <PillButton label="Colar da área de transferência" variant="secondary" onPress={onPaste} />
        <PillButton label="Restaurar de um backup" variant="ghost" onPress={onRestore} />
      </View>
    </View>
  );
}

export function NotesListScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { notes, allTags, ready, createNote, toggleFavorite, deleteNote, replaceAll } = useNotes();
  const clip = useClipboard();
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>('recent');
  const [menu, setMenu] = useState(false);

  const list = useMemo(() => {
    const base = activeTag ? notes.filter((n) => n.tags.includes(activeTag)) : notes;
    return [...base].sort((a, b) => (sort === 'recent' ? b.updatedAt - a.updatedAt : a.title.localeCompare(b.title, 'pt-BR')));
  }, [notes, activeTag, sort]);

  const openNew = () => {
    const note = createNote();
    navigation.navigate('Editor', { noteId: note.id });
  };

  const confirmDelete = (id: string, title: string) => {
    Alert.alert('Apagar nota', `"${title || 'Sem título'}" vai sumir do caderno, com os anexos.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Apagar', style: 'destructive', onPress: () => deleteNote(id) },
    ]);
  };

  const restore = async () => {
    try {
      const data = await pickBackupFile();
      if (!data) return;
      replaceAll(data.notes, data.settings);
    } catch {
      Alert.alert('Não deu', 'Esse arquivo não parece um backup do Caderno.');
    }
  };

  if (!ready) return <View style={[styles.screen, { paddingTop: insets.top }]} />;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <ScreenTitle>Notas</ScreenTitle>
        {notes.length > 0 ? (
          <IconCircle
            icon={sort === 'recent' ? 'clock' : 'type'}
            size={40}
            iconSize={16}
            bg={colors.surface}
            onPress={() => setSort((s) => (s === 'recent' ? 'title' : 'recent'))}
            accessibilityLabel={sort === 'recent' ? 'Ordenar por título' : 'Ordenar por data'}
          />
        ) : null}
      </View>

      {notes.length === 0 ? (
        <EmptyState onWrite={openNew} onPaste={clip.open} onRestore={restore} />
      ) : (
        <>
          <Pressable onPress={() => navigation.navigate('Search')} style={styles.searchWrap}>
            <View style={styles.search}>
              <Feather name="search" size={16} color={colors.neutral600} />
              <Text style={styles.searchText}>Buscar</Text>
            </View>
          </Pressable>

          {allTags.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }}>
              <Tag label="Todas" size="md" variant={activeTag ? 'neutral' : 'solid'} onPress={() => setActiveTag(null)} />
              {allTags.map((t) => (
                <Tag key={t} label={t} size="md" variant={activeTag === t ? 'solid2' : 'accent2'} onPress={() => setActiveTag(activeTag === t ? null : t)} />
              ))}
            </ScrollView>
          ) : null}

          <FlatList
            data={list}
            keyExtractor={(n) => n.id}
            contentContainerStyle={styles.list}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <NoteCard
                note={item}
                onPress={() => navigation.navigate('Editor', { noteId: item.id })}
                onToggleFavorite={() => toggleFavorite(item.id)}
                onLongPress={() => confirmDelete(item.id, item.title)}
              />
            )}
            ListEmptyComponent={<Text style={styles.noMatch}>Nenhuma nota com essa tag.</Text>}
          />
        </>
      )}

      <BottomNav onMenu={() => setMenu(true)} onNew={openNew} onClipboard={clip.open} menuActive={menu} />

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        entries={[
          { icon: 'star', label: 'Favoritas', hint: `${notes.filter((n) => n.favorite).length} notas fixadas`, onPress: () => navigation.navigate('Favorites') },
          { icon: 'search', label: 'Buscar', hint: 'no texto inteiro, com filtros', onPress: () => navigation.navigate('Search') },
          { icon: 'shield', label: 'Backup e exportação', hint: 'Markdown, PDF ou JSON', onPress: () => navigation.navigate('Backup') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 14, paddingHorizontal: 22, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  searchWrap: { paddingHorizontal: 22, paddingBottom: 12 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.surface },
  searchText: { fontFamily: fonts.body, fontSize: 16, color: colors.neutral600 },
  chips: { gap: 8, paddingHorizontal: 22, paddingBottom: 16 },
  list: { paddingHorizontal: 22, gap: 12, paddingBottom: 24 },
  noMatch: { fontFamily: fonts.body, color: colors.neutral600, textAlign: 'center', paddingTop: 30 },
  empty: { flex: 1, justifyContent: 'center', alignItems: 'flex-start', gap: 20, paddingHorizontal: 30 },
  circles: { flexDirection: 'row', alignItems: 'center' },
  circle: { borderRadius: radius.pill },
  emptyTitle: { fontFamily: fonts.heading, fontSize: 26, lineHeight: 32, color: colors.text },
  emptyText: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26, color: colors.neutral700, maxWidth: 300 },
});
