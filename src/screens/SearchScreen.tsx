import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import type { Note } from '../types';
import { colors, fonts, radius } from '../theme';
import { useNotes } from '../store/NotesContext';
import { stripMarkdown } from '../lib/markdown';
import { Kicker, Tag } from '../components/ui';

type Props = NativeStackScreenProps<RootStackParamList, 'Search'>;

function norm(s: string) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Divide o texto em partes, marcando as que casam com a busca. */
function highlight(text: string, q: string): { t: string; hit: boolean }[] {
  if (!q) return [{ t: text, hit: false }];
  const n = norm(text);
  const nq = norm(q);
  const parts: { t: string; hit: boolean }[] = [];
  let i = 0;
  // norm() preserva o comprimento (só remove diacríticos combinantes), então os índices batem
  while (i < text.length) {
    const j = n.indexOf(nq, i);
    if (j < 0) {
      parts.push({ t: text.slice(i), hit: false });
      break;
    }
    if (j > i) parts.push({ t: text.slice(i, j), hit: false });
    parts.push({ t: text.slice(j, j + q.length), hit: true });
    i = j + q.length;
  }
  return parts;
}

function snippet(body: string, q: string): string {
  const plain = stripMarkdown(body);
  if (!q) return plain.slice(0, 110);
  const idx = norm(plain).indexOf(norm(q));
  if (idx < 0) return plain.slice(0, 110);
  const start = Math.max(0, idx - 40);
  const end = Math.min(plain.length, idx + q.length + 60);
  return (start > 0 ? '…' : '') + plain.slice(start, end) + (end < plain.length ? '…' : '');
}

function Highlighted({ text, q, style }: { text: string; q: string; style: object }) {
  return (
    <Text style={style} numberOfLines={2}>
      {highlight(text, q).map((p, i) => (
        <Text key={i} style={p.hit ? styles.hit : undefined}>
          {p.t}
        </Text>
      ))}
    </Text>
  );
}

export function SearchScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { notes, allTags } = useNotes();
  const [q, setQ] = useState('');
  const [tag, setTag] = useState<string | null>(null);
  const [onlyFav, setOnlyFav] = useState(false);
  const [withAtt, setWithAtt] = useState(false);

  const results = useMemo(() => {
    const nq = norm(q.trim());
    return notes
      .filter((n) => !tag || n.tags.includes(tag))
      .filter((n) => !onlyFav || n.favorite)
      .filter((n) => !withAtt || n.attachments.length > 0)
      .filter((n) => !nq || norm(n.title).includes(nq) || norm(n.body).includes(nq) || n.tags.some((t) => norm(t).includes(nq)))
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, q, tag, onlyFav, withAtt]);

  const active = q.trim() || tag || onlyFav || withAtt;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={styles.search}>
          <Feather name="search" size={16} color={colors.neutral600} />
          <TextInput
            value={q}
            onChangeText={setQ}
            placeholder="Buscar nas notas"
            placeholderTextColor={colors.neutral600}
            autoFocus
            autoCorrect={false}
            returnKeyType="search"
            style={styles.input}
            selectionColor={colors.accent}
          />
          {q ? (
            <Pressable onPress={() => setQ('')} hitSlop={8}>
              <Feather name="x" size={16} color={colors.neutral600} />
            </Pressable>
          ) : null}
        </View>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.cancel}>Cancelar</Text>
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={{ flexGrow: 0 }} keyboardShouldPersistTaps="handled">
        {tag ? (
          <Tag label={`${tag} ✕`} size="md" variant="solid2" onPress={() => setTag(null)} />
        ) : (
          allTags.slice(0, 6).map((t) => <Tag key={t} label={t} size="md" variant="accent2" onPress={() => setTag(t)} />)
        )}
        <Tag label="só favoritas" size="md" variant={onlyFav ? 'solid' : 'neutral'} onPress={() => setOnlyFav((v) => !v)} />
        <Tag label="com anexo" size="md" variant={withAtt ? 'solid' : 'neutral'} onPress={() => setWithAtt((v) => !v)} />
      </ScrollView>

      <FlatList
        data={active ? results : []}
        keyExtractor={(n) => n.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={active ? <Kicker>{results.length === 1 ? '1 resultado' : `${results.length} resultados`}</Kicker> : null}
        ListEmptyComponent={<Text style={styles.empty}>{active ? 'Nada encontrado.' : 'Digite para buscar no texto inteiro, ou use um filtro.'}</Text>}
        renderItem={({ item }: { item: Note }) => (
          <Pressable onPress={() => navigation.navigate('Editor', { noteId: item.id })} style={({ pressed }) => [styles.result, pressed && { opacity: 0.8 }]}>
            <Highlighted text={item.title || 'Sem título'} q={q.trim()} style={styles.resultTitle} />
            <Highlighted text={snippet(item.body, q.trim())} q={q.trim()} style={styles.resultBody} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  search: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, height: 46, paddingHorizontal: 18, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.accent },
  input: { flex: 1, fontFamily: fonts.body, fontSize: 16, color: colors.text, paddingVertical: 0 },
  cancel: { fontFamily: fonts.body, fontSize: 15, color: colors.accent700 },
  chips: { gap: 8, paddingHorizontal: 20, paddingBottom: 14 },
  list: { paddingHorizontal: 20, gap: 10, paddingBottom: 30 },
  empty: { fontFamily: fonts.body, fontSize: 14, color: colors.neutral600, textAlign: 'center', paddingTop: 40, paddingHorizontal: 20 },
  result: { backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16, gap: 5 },
  resultTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.text },
  resultBody: { fontFamily: fonts.body, fontSize: 14, lineHeight: 21, color: colors.neutral700 },
  hit: { backgroundColor: colors.accent200, borderRadius: 6 },
});
