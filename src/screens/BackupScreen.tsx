import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { colors, fonts, radius } from '../theme';
import { useNotes } from '../store/NotesContext';
import type { File } from 'expo-file-system';
import { exportJson, exportMarkdownZip, exportPdf, InvalidBackupError, listLocalBackups, parseBackup, pickBackupFile, restoreAttachments, type BackupPayload } from '../lib/backup';
import { attachmentsTotalSize } from '../lib/files';
import { formatBytes, formatStamp } from '../lib/date';
import { IconCircle, Kicker, PillButton, ScreenTitle } from '../components/ui';
import { MenuSheet } from '../components/MenuSheet';

type Props = NativeStackScreenProps<RootStackParamList, 'Backup'>;

function ExportRow({ badge, icon, title, hint, onPress, last }: { badge?: string; icon?: React.ComponentProps<typeof Feather>['name']; title: string; hint: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && { opacity: 0.7 }]}>
      <View style={styles.badge}>
        {icon ? <Feather name={icon} size={17} color={colors.accent800} /> : <Text style={styles.badgeText}>{badge}</Text>}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowHint}>{hint}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={colors.neutral600} />
    </Pressable>
  );
}

export function BackupScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { notes, settings, updateSettings, backupNow, replaceAll } = useNotes();
  const [busy, setBusy] = useState<string | null>(null);
  const [localBackups, setLocalBackups] = useState<File[] | null>(null);

  const size = useMemo(() => {
    const text = notes.reduce((acc, n) => acc + n.title.length + n.body.length, 0) * 2;
    return text + notes.reduce((acc, n) => acc + attachmentsTotalSize(n.attachments), 0);
  }, [notes]);

  const attCount = notes.reduce((acc, n) => acc + n.attachments.length, 0);

  const run = async (key: string, fn: () => Promise<void>) => {
    if (busy) return;
    setBusy(key);
    try {
      await fn();
    } catch (e) {
      console.warn('export', key, e);
      Alert.alert('Não deu', 'A exportação falhou. Tente de novo.');
    } finally {
      setBusy(null);
    }
  };

  const plural = (n: number) => (n === 1 ? '1 nota' : `${n} notas`);

  const confirmRestore = (data: BackupPayload) => {
    Alert.alert('Restaurar backup', `${notes.length === 1 ? 'A nota atual será substituída' : `As ${notes.length} notas atuais serão substituídas`} por ${plural(data.notes.length)} do backup.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Restaurar', style: 'destructive', onPress: () => replaceAll(restoreAttachments(data.notes), data.settings) },
    ]);
  };

  const restoreFromFile = async () => {
    if (busy) return;
    setBusy('restore');
    try {
      const data = await pickBackupFile();
      if (data) confirmRestore(data);
    } catch (e) {
      if (e instanceof InvalidBackupError) return Alert.alert('Não deu', e.message);
      console.warn('restore', e);
      Alert.alert('Não deu', 'Não consegui ler esse arquivo.');
    } finally {
      setBusy(null);
    }
  };

  const restoreLocal = () => {
    const files = listLocalBackups();
    if (files.length === 0) {
      Alert.alert('Sem backups locais', 'Ainda não há backup automático neste aparelho.');
      return;
    }
    setLocalBackups(files);
  };

  const restoreLocalFile = async (f: File) => {
    try {
      const data = parseBackup(await f.text());
      if (!data) return Alert.alert('Não deu', 'Backup corrompido.');
      confirmRestore(data);
    } catch {
      Alert.alert('Não deu', 'Não consegui ler esse backup.');
    }
  };

  const lastLabel = settings.lastBackupAt ? `Último backup ${formatStamp(settings.lastBackupAt)}` : 'Nenhum backup ainda';

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <IconCircle icon="chevron-left" size={36} iconSize={22} color={colors.accent700} onPress={() => navigation.goBack()} style={{ marginLeft: -10 }} accessibilityLabel="Voltar" />
          <ScreenTitle style={{ fontSize: 28 }}>Backup e exportação</ScreenTitle>
        </View>
        <Text style={styles.sub}>{lastLabel}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.status}>
          <View style={styles.statusIcon}>
            <Feather name={settings.lastBackupAt ? 'check' : 'alert-circle'} size={22} color={colors.accent2_900} />
          </View>
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={styles.statusTitle}>{notes.length === 1 ? '1 nota protegida' : `${notes.length} notas protegidas`}</Text>
            <Text style={styles.statusHint}>
              Neste aparelho · {formatBytes(size)}
              {attCount ? ` com ${attCount} ${attCount === 1 ? 'anexo' : 'anexos'}` : ''}
            </Text>
          </View>
        </View>

        <View>
          <Kicker>Exportar</Kicker>
          <View style={styles.group}>
            <ExportRow badge="MD" title="Markdown (.zip)" hint="um arquivo por nota, anexos em pasta" onPress={() => run('md', () => exportMarkdownZip(notes))} />
            <ExportRow badge="PDF" title="PDF do caderno" hint="com sumário e tags" onPress={() => run('pdf', () => exportPdf(notes))} />
            <ExportRow badge="{ }" title="JSON completo" hint="para migrar de app ou restaurar" onPress={() => run('json', () => exportJson(notes, settings))} last />
          </View>
        </View>

        <View style={styles.toggleRow}>
          <View style={{ gap: 2, flex: 1 }}>
            <Text style={styles.rowTitle}>Backup automático</Text>
            <Text style={styles.rowHint}>diário, guardado no aparelho</Text>
          </View>
          <Switch
            value={settings.autoBackup}
            onValueChange={(v) => updateSettings({ autoBackup: v })}
            trackColor={{ false: colors.neutral300, true: colors.accent2_500 }}
            thumbColor="#fff"
          />
        </View>

        <View>
          <Kicker>Restaurar</Kicker>
          <View style={styles.group}>
            <ExportRow icon="rotate-ccw" title="De um backup local" hint="últimos backups automáticos deste aparelho" onPress={restoreLocal} />
            <ExportRow icon="upload" title="De um arquivo JSON" hint="exportado de outro aparelho" onPress={restoreFromFile} last />
          </View>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 18 }]}>
        <PillButton
          label={busy ? 'Aguarde…' : 'Fazer backup agora'}
          disabled={!!busy}
          onPress={() => {
            if (backupNow()) Alert.alert('Backup feito', 'Cópia guardada no aparelho. Para levar para outro lugar, exporte em JSON.');
            else Alert.alert('Não deu', 'Não consegui gravar o backup no aparelho.');
          }}
        />
      </View>

      <MenuSheet
        visible={localBackups !== null}
        onClose={() => setLocalBackups(null)}
        title="Backups locais"
        entries={(localBackups ?? []).map((f) => ({
          icon: 'clock' as const,
          label: formatStamp(f.modificationTime ?? 0),
          hint: f.name,
          onPress: () => restoreLocalFile(f),
        }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: { paddingTop: 14, paddingHorizontal: 22, paddingBottom: 18, gap: 6 },
  sub: { fontFamily: fonts.body, fontSize: 14, color: colors.neutral700 },
  content: { paddingHorizontal: 22, gap: 14, paddingBottom: 20 },
  status: { backgroundColor: colors.accent2_100, borderRadius: 26, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16 },
  statusIcon: { width: 52, height: 52, borderRadius: radius.pill, backgroundColor: colors.accent2_400, alignItems: 'center', justifyContent: 'center' },
  statusTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.accent2_900 },
  statusHint: { fontFamily: fonts.body, fontSize: 13, color: colors.accent2_800 },
  group: { backgroundColor: colors.surface, borderRadius: 26, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 16, paddingHorizontal: 18 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  badge: { width: 38, height: 38, borderRadius: 13, backgroundColor: colors.accent100, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontFamily: fonts.bodyBold, fontSize: 11, color: colors.accent800 },
  rowTitle: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.text },
  rowHint: { fontFamily: fonts.body, fontSize: 12, color: colors.neutral600 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.surface, borderRadius: 26, paddingVertical: 16, paddingHorizontal: 18, gap: 12 },
  footer: { paddingHorizontal: 22, paddingTop: 14, backgroundColor: colors.bg },
});
