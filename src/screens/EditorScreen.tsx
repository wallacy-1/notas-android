import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type NativeSyntheticEvent, type TextInputSelectionChangeEventData } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import type { RootStackParamList } from '../navigation/types';
import type { Attachment } from '../types';
import { colors, fonts, radius, shadow } from '../theme';
import { useNotes } from '../store/NotesContext';
import { useClipboard } from '../store/ClipboardContext';
import { MarkdownView } from '../components/MarkdownView';
import { MenuSheet } from '../components/MenuSheet';
import { IconCircle, Tag } from '../components/ui';
import { formatRelative, formatBytes } from '../lib/date';
import { importAttachment } from '../lib/files';

type Props = NativeStackScreenProps<RootStackParamList, 'Editor'>;
type Sel = { start: number; end: number };

function wrapSelection(text: string, sel: Sel, before: string, after = before, placeholder = 'texto') {
  const chunk = text.slice(sel.start, sel.end) || placeholder;
  const next = text.slice(0, sel.start) + before + chunk + after + text.slice(sel.end);
  const cursor = sel.start + before.length + chunk.length;
  return { next, sel: { start: sel.start + before.length, end: cursor } };
}

function prefixLine(text: string, sel: Sel, prefix: string) {
  const lineStart = text.lastIndexOf('\n', sel.start - 1) + 1;
  const already = text.startsWith(prefix, lineStart);
  const next = already ? text.slice(0, lineStart) + text.slice(lineStart + prefix.length) : text.slice(0, lineStart) + prefix + text.slice(lineStart);
  const delta = already ? -prefix.length : prefix.length;
  return { next, sel: { start: Math.max(lineStart, sel.start + delta), end: Math.max(lineStart, sel.end + delta) } };
}

function AttachmentRow({ att, onOpen, onRemove }: { att: Attachment; onOpen: () => void; onRemove: () => void }) {
  const isPdf = att.kind === 'pdf';
  return (
    <Pressable onPress={onOpen} onLongPress={onRemove} style={({ pressed }) => [styles.attRow, pressed && { opacity: 0.8 }]}>
      <View style={[styles.attIcon, { backgroundColor: isPdf ? colors.accent200 : colors.accent2_200 }]}>
        {isPdf ? <Text style={styles.attIconText}>PDF</Text> : <Feather name="file" size={16} color={colors.accent2_800} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.attName} numberOfLines={1}>
          {att.name}
        </Text>
        <Text style={styles.attMeta}>{formatBytes(att.size)}</Text>
      </View>
      <Feather name="download" size={16} color={colors.neutral700} />
    </Pressable>
  );
}

export function EditorScreen({ navigation, route }: Props) {
  const { noteId } = route.params;
  const insets = useSafeAreaInsets();
  const { getNote, updateNote, deleteNote, toggleFavorite, addAttachment, removeAttachment } = useNotes();
  const clip = useClipboard();
  const note = getNote(noteId);

  const [title, setTitle] = useState(note?.title ?? '');
  const [body, setBody] = useState(note?.body ?? '');
  const [editing, setEditing] = useState(!note?.body);
  const [sel, setSel] = useState<Sel>({ start: 0, end: 0 });
  const [pendingSel, setPendingSel] = useState<Sel | null>(null);
  const [tagInput, setTagInput] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [now, setNow] = useState(Date.now());
  const inputRef = useRef<TextInput>(null);
  const noteRef = useRef(note);
  noteRef.current = note;

  // Nota aberta vira alvo do overlay de transferência.
  useFocusEffect(
    useCallback(() => {
      clip.setActiveNoteId(noteId);
      return () => clip.setActiveNoteId(null);
    }, [noteId, clip.setActiveNoteId]),
  );

  // Último corpo que este editor mandou para o contexto; se o contexto mudar
  // por fora (overlay de transferência colando), o estado local acompanha.
  const lastSent = useRef(note?.body ?? '');
  useEffect(() => {
    if (!note || note.body === lastSent.current) return;
    lastSent.current = note.body;
    setBody(note.body);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.body]);

  // Autosave com debounce curto.
  useEffect(() => {
    if (!note) return;
    if (note.title === title && note.body === body) return;
    const t = setTimeout(() => {
      lastSent.current = body;
      updateNote(noteId, { title, body });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, body]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(t);
  }, []);

  // Ao sair: descarrega edição pendente; nota vazia some sozinha.
  const draftRef = useRef({ title, body });
  draftRef.current = { title, body };
  useEffect(
    () => () => {
      const n = noteRef.current;
      if (!n) return;
      const d = draftRef.current;
      if (!d.title.trim() && !d.body.trim() && n.attachments.length === 0) {
        deleteNote(n.id);
      } else if (n.title !== d.title || n.body !== d.body) {
        updateNote(n.id, d);
      }
    },
    [deleteNote, updateNote],
  );

  const savedLabel = useMemo(() => {
    if (!note) return '';
    const dirty = note.title !== title || note.body !== body;
    if (dirty) return 'Salvando…';
    const r = formatRelative(note.updatedAt, now);
    return r === 'agora' ? 'Salvo agora' : `Salvo ${r}`;
  }, [note, title, body, now]);

  if (!note) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, alignItems: 'center', justifyContent: 'center' }]}>
        <Text style={styles.meta}>Essa nota não existe mais.</Text>
      </View>
    );
  }

  const startEditing = (at?: number) => {
    setEditing(true);
    if (at !== undefined) setPendingSel({ start: at, end: at });
    setTimeout(() => inputRef.current?.focus(), 30);
  };

  const apply = (fn: (text: string, s: Sel) => { next: string; sel: Sel }) => {
    const s = editing ? sel : { start: body.length, end: body.length };
    const r = fn(body, s);
    setBody(r.next);
    setPendingSel(r.sel);
    if (!editing) startEditing();
  };

  const onSelectionChange = (e: NativeSyntheticEvent<TextInputSelectionChangeEventData>) => {
    setSel(e.nativeEvent.selection);
    if (pendingSel) setPendingSel(null);
  };

  const addTag = (raw: string) => {
    const t = raw.trim().toLowerCase().replace(/^#/, '');
    if (t && !note.tags.includes(t)) updateNote(noteId, { tags: [...note.tags, t] });
    setTagInput(null);
  };

  const removeTag = (t: string) => updateNote(noteId, { tags: note.tags.filter((x) => x !== t) });

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const att = await importAttachment(a.uri, a.fileName ?? `imagem-${Date.now()}.jpg`, a.mimeType ?? 'image/jpeg', a.fileSize);
    addAttachment(noteId, att);
  };

  const pickFile = async () => {
    const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true, multiple: false });
    if (res.canceled || !res.assets[0]) return;
    const a = res.assets[0];
    const att = await importAttachment(a.uri, a.name, a.mimeType, a.size);
    addAttachment(noteId, att);
  };

  const attach = () => {
    Alert.alert('Anexar', 'O arquivo é copiado para dentro do caderno.', [
      { text: 'Imagem da galeria', onPress: () => pickImage().catch(() => Alert.alert('Não deu', 'Não consegui importar a imagem.')) },
      { text: 'Arquivo', onPress: () => pickFile().catch(() => Alert.alert('Não deu', 'Não consegui importar o arquivo.')) },
      { text: 'Cancelar', style: 'cancel' },
    ]);
  };

  const openAttachment = async (att: Attachment) => {
    if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(att.uri, { mimeType: att.mimeType, UTI: att.mimeType });
  };

  const confirmRemoveAttachment = (att: Attachment) => {
    Alert.alert('Remover anexo', att.name, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => removeAttachment(noteId, att.id) },
    ]);
  };

  const confirmDelete = () => {
    Alert.alert('Apagar nota', 'Vai sumir do caderno, com os anexos.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () => {
          deleteNote(noteId);
          navigation.goBack();
        },
      },
    ]);
  };

  const images = note.attachments.filter((a) => a.kind === 'image');
  const files = note.attachments.filter((a) => a.kind !== 'image');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <IconCircle icon="chevron-left" size={36} iconSize={22} color={colors.accent700} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" />
        <Text style={styles.saved}>{savedLabel}</Text>
        <IconCircle icon="star" size={36} iconSize={18} color={note.favorite ? colors.accent600 : colors.neutral400} onPress={() => toggleFavorite(noteId)} accessibilityLabel="Favoritar" />
        <IconCircle icon="more-horizontal" size={36} iconSize={18} onPress={() => setMenu(true)} accessibilityLabel="Mais" />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive">
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Título"
          placeholderTextColor={colors.neutral500}
          style={styles.title}
          multiline
          returnKeyType="next"
          blurOnSubmit
          onSubmitEditing={() => startEditing()}
        />

        <View style={styles.tags}>
          {note.tags.map((t) => (
            <Tag key={t} label={t} size="sm" style={{ paddingVertical: 4, paddingHorizontal: 11 }} onPress={() => Alert.alert('Tag', `Remover "${t}" desta nota?`, [{ text: 'Não', style: 'cancel' }, { text: 'Remover', onPress: () => removeTag(t) }])} />
          ))}
          {tagInput === null ? (
            <Tag label="+ tag" variant="outline" size="sm" style={{ paddingVertical: 4, paddingHorizontal: 11 }} onPress={() => setTagInput('')} />
          ) : (
            <TextInput
              value={tagInput}
              onChangeText={setTagInput}
              onSubmitEditing={() => addTag(tagInput)}
              onBlur={() => addTag(tagInput)}
              autoFocus
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="nova tag"
              placeholderTextColor={colors.neutral500}
              style={styles.tagInput}
            />
          )}
        </View>

        {editing ? (
          <TextInput
            ref={inputRef}
            value={body}
            onChangeText={setBody}
            onSelectionChange={onSelectionChange}
            selection={pendingSel ?? undefined}
            onBlur={() => body.trim() && setEditing(false)}
            placeholder="Escreva em markdown: ## título, - lista, > citação, **negrito**"
            placeholderTextColor={colors.neutral500}
            multiline
            textAlignVertical="top"
            autoFocus={!body}
            style={styles.body}
            scrollEnabled={false}
          />
        ) : (
          <Pressable onPress={() => startEditing(body.length)} style={{ minHeight: 120 }}>
            <MarkdownView source={body} />
          </Pressable>
        )}

        {images.map((att) => (
          <Pressable key={att.id} onPress={() => openAttachment(att)} onLongPress={() => confirmRemoveAttachment(att)} style={styles.imageWrap}>
            <Image source={{ uri: att.uri }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageBadge}>
              <Text style={styles.imageBadgeText}>{att.name}</Text>
            </View>
          </Pressable>
        ))}

        {files.length > 0 ? (
          <View style={{ gap: 10 }}>
            {files.map((att) => (
              <AttachmentRow key={att.id} att={att} onOpen={() => openAttachment(att)} onRemove={() => confirmRemoveAttachment(att)} />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View style={[styles.toolbarWrap, { paddingBottom: Math.max(insets.bottom, 10) + 10 }]}>
        <View style={styles.toolbar}>
          <Pressable hitSlop={8} onPress={() => apply((t, s) => wrapSelection(t, s, '**', '**', 'negrito'))}>
            <Text style={[styles.tool, { fontFamily: fonts.bodyBold }]}>B</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => apply((t, s) => wrapSelection(t, s, '_', '_', 'itálico'))}>
            <Text style={[styles.tool, { fontFamily: fonts.bodyItalic }]}>I</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => apply((t, s) => prefixLine(t, s, '## '))}>
            <Text style={[styles.tool, { fontFamily: fonts.heading, fontSize: 15 }]}>H2</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => apply((t, s) => prefixLine(t, s, '- '))}>
            <Text style={styles.tool}>•</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={() => apply((t, s) => wrapSelection(t, s, '`', '`', 'código'))}>
            <Text style={[styles.tool, { fontFamily: fonts.mono, fontSize: 14 }]}>{'</>'}</Text>
          </Pressable>
          <Pressable hitSlop={8} onPress={attach} accessibilityLabel="Anexar">
            <Feather name="paperclip" size={18} color={colors.accent700} />
          </Pressable>
          <Pressable hitSlop={8} onPress={clip.open} accessibilityLabel="Área de transferência">
            <Feather name="clipboard" size={18} color={colors.accent700} />
          </Pressable>
        </View>
      </View>

      <MenuSheet
        visible={menu}
        onClose={() => setMenu(false)}
        title={note.title || 'Nota'}
        entries={[
          { icon: editing ? 'eye' : 'edit-2', label: editing ? 'Ver formatado' : 'Editar texto', onPress: () => (editing ? setEditing(false) : startEditing(body.length)) },
          { icon: 'copy', label: 'Copiar como markdown', onPress: () => clip.copy(`# ${title}\n\n${body}`) },
          { icon: 'paperclip', label: 'Anexar arquivo', onPress: attach },
          { icon: 'trash-2', label: 'Apagar nota', onPress: confirmDelete },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 2 },
  saved: { flex: 1, fontFamily: fonts.body, fontSize: 13, color: colors.neutral600 },
  meta: { fontFamily: fonts.body, color: colors.neutral600 },
  content: { paddingHorizontal: 24, paddingTop: 10, paddingBottom: 24, gap: 14 },
  title: { fontFamily: fonts.heading, fontSize: 27, lineHeight: 33, color: colors.text, padding: 0 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, alignItems: 'center' },
  tagInput: { fontFamily: fonts.body, fontSize: 12, color: colors.text, borderBottomWidth: 1, borderBottomColor: colors.accent, minWidth: 80, paddingVertical: 2, paddingHorizontal: 4 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26, color: colors.text, padding: 0, minHeight: 200 },
  imageWrap: { borderRadius: 22, overflow: 'hidden', backgroundColor: colors.neutral200, height: 200 },
  image: { width: '100%', height: '100%', opacity: 0.94 },
  imageBadge: { position: 'absolute', bottom: 10, right: 12, backgroundColor: 'rgba(46,43,37,0.55)', borderRadius: radius.pill, paddingVertical: 3, paddingHorizontal: 9 },
  imageBadgeText: { fontFamily: fonts.body, fontSize: 11, color: colors.bg },
  attRow: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: colors.surface, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 16 },
  attIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  attIconText: { fontFamily: fonts.bodyBold, fontSize: 12, color: colors.accent800 },
  attName: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  attMeta: { fontFamily: fonts.body, fontSize: 12, color: colors.neutral600 },
  toolbarWrap: { paddingHorizontal: 16, paddingTop: 10, backgroundColor: colors.bg },
  toolbar: { height: 52, borderRadius: radius.pill, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, ...shadow.md },
  tool: { fontFamily: fonts.body, fontSize: 16, color: colors.neutral800 },
});
