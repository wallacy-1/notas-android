import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts } from '../theme';
import { useNotes } from '../store/NotesContext';
import { useClipboard } from '../store/ClipboardContext';
import { NoteCard } from '../components/NoteCard';
import { BottomNav } from '../components/BottomNav';
import { MenuSheet } from '../components/MenuSheet';
import { IconCircle, ScreenTitle } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Favorites'>;

export function FavoritesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { notes, toggleFavorite, createNote } = useNotes();
  const clip = useClipboard();
  const [menu, setMenu] = useState(false);
  const favs = useMemo(() => notes.filter((n) => n.favorite).sort((a, b) => b.updatedAt - a.updatedAt), [notes]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <IconCircle icon="chevron-left" size={36} iconSize={22} color={colors.accent700} onPress={() => navigation.goBack()} style={{ marginLeft: -10 }} accessibilityLabel="Voltar" />
          <ScreenTitle>Favoritas</ScreenTitle>
        </View>
        <Text style={styles.sub}>{favs.length === 0 ? 'Nenhuma nota fixada ainda' : favs.length === 1 ? '1 nota fixada no topo do caderno' : `${favs.length} notas fixadas no topo do caderno`}</Text>
      </View>

      <FlatList
        data={favs}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => <NoteCard note={item} tinted onPress={() => navigation.navigate('Editor', { noteId: item.id })} onToggleFavorite={() => toggleFavorite(item.id)} />}
        ListEmptyComponent={<Text style={styles.empty}>Toque na estrela de uma nota para ela aparecer aqui, em terracota.</Text>}
      />

      <BottomNav
        onMenu={() => setMenu(true)}
        onNew={() => navigation.navigate('Editor', { noteId: createNote().id })}
        onClipboard={clip.open}
        menuActive={menu}
      />
      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        entries={[
          { icon: 'book-open', label: 'Todas as notas', onPress: () => navigation.navigate('Notes') },
          { icon: 'search', label: 'Buscar', onPress: () => navigation.navigate('Search') },
          { icon: 'shield', label: 'Backup e exportação', onPress: () => navigation.navigate('Backup') },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 14, paddingHorizontal: 22, paddingBottom: 16, gap: 6 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.neutral700 },
  list: { paddingHorizontal: 22, gap: 12, paddingBottom: 24 },
  empty: { fontFamily: fonts.body, fontSize: 15, lineHeight: 23, color: colors.neutral600, paddingTop: 30, paddingHorizontal: 8 },
});
