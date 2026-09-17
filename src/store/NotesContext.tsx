import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Attachment, Note, Settings } from '../types';
import { uid } from '../lib/id';
import { deleteAttachmentFile } from '../lib/files';
import { writeLocalBackup } from '../lib/backup';

const NOTES_KEY = 'caderno.notes.v1';
const SETTINGS_KEY = 'caderno.settings.v1';
const DAY = 24 * 60 * 60 * 1000;

const defaultSettings: Settings = { autoBackup: true, lastBackupAt: null };

interface NotesApi {
  ready: boolean;
  notes: Note[];
  settings: Settings;
  allTags: string[];
  getNote: (id: string) => Note | undefined;
  createNote: (init?: Partial<Pick<Note, 'title' | 'body' | 'tags'>>) => Note;
  updateNote: (id: string, patch: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  toggleFavorite: (id: string) => void;
  addAttachment: (id: string, att: Attachment) => void;
  removeAttachment: (id: string, attId: string) => void;
  appendToNote: (id: string, text: string) => void;
  replaceAll: (notes: Note[], settings?: Partial<Settings>) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  backupNow: () => void;
}

const Ctx = createContext<NotesApi | null>(null);

export function NotesProvider({ children }: { children: React.ReactNode }) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [n, s] = await Promise.all([AsyncStorage.getItem(NOTES_KEY), AsyncStorage.getItem(SETTINGS_KEY)]);
        if (n) setNotes(JSON.parse(n));
        if (s) setSettings({ ...defaultSettings, ...JSON.parse(s) });
      } finally {
        setReady(true);
      }
    })();
  }, []);

  // Autosave: persiste com debounce curto após qualquer mudança.
  useEffect(() => {
    if (!ready) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes)).catch(() => {});
    }, 350);
  }, [notes, ready]);

  useEffect(() => {
    if (!ready) return;
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings, ready]);

  const backupNow = useCallback(() => {
    try {
      writeLocalBackup(notes, settings);
      setSettings((s) => ({ ...s, lastBackupAt: Date.now() }));
    } catch {}
  }, [notes, settings]);

  // Backup automático diário (local), só quando há notas.
  useEffect(() => {
    if (!ready || !settings.autoBackup || notes.length === 0) return;
    const due = !settings.lastBackupAt || Date.now() - settings.lastBackupAt > DAY;
    if (due) backupNow();
  }, [ready, settings.autoBackup, settings.lastBackupAt, notes.length, backupNow]);

  const getNote = useCallback((id: string) => notes.find((n) => n.id === id), [notes]);

  const createNote = useCallback((init?: Partial<Pick<Note, 'title' | 'body' | 'tags'>>) => {
    const now = Date.now();
    const note: Note = {
      id: uid(),
      title: init?.title ?? '',
      body: init?.body ?? '',
      tags: init?.tags ?? [],
      favorite: false,
      attachments: [],
      createdAt: now,
      updatedAt: now,
    };
    setNotes((list) => [note, ...list]);
    return note;
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)));
  }, []);

  const deleteNote = useCallback((id: string) => {
    setNotes((list) => {
      const target = list.find((n) => n.id === id);
      target?.attachments.forEach(deleteAttachmentFile);
      return list.filter((n) => n.id !== id);
    });
  }, []);

  const toggleFavorite = useCallback((id: string) => {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, favorite: !n.favorite } : n)));
  }, []);

  const addAttachment = useCallback((id: string, att: Attachment) => {
    setNotes((list) => list.map((n) => (n.id === id ? { ...n, attachments: [...n.attachments, att], updatedAt: Date.now() } : n)));
  }, []);

  const removeAttachment = useCallback((id: string, attId: string) => {
    setNotes((list) =>
      list.map((n) => {
        if (n.id !== id) return n;
        const att = n.attachments.find((a) => a.id === attId);
        if (att) deleteAttachmentFile(att);
        return { ...n, attachments: n.attachments.filter((a) => a.id !== attId), updatedAt: Date.now() };
      }),
    );
  }, []);

  const appendToNote = useCallback((id: string, text: string) => {
    setNotes((list) =>
      list.map((n) => {
        if (n.id !== id) return n;
        const sep = n.body.trim().length ? (n.body.endsWith('\n') ? '\n' : '\n\n') : '';
        return { ...n, body: n.body + sep + text, updatedAt: Date.now() };
      }),
    );
  }, []);

  const replaceAll = useCallback((next: Note[], s?: Partial<Settings>) => {
    setNotes(next);
    if (s) setSettings((cur) => ({ ...cur, ...s }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), []);

  const allTags = useMemo(() => {
    const count = new Map<string, number>();
    notes.forEach((n) => n.tags.forEach((t) => count.set(t, (count.get(t) ?? 0) + 1)));
    return [...count.entries()].sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [notes]);

  const value = useMemo<NotesApi>(
    () => ({
      ready,
      notes,
      settings,
      allTags,
      getNote,
      createNote,
      updateNote,
      deleteNote,
      toggleFavorite,
      addAttachment,
      removeAttachment,
      appendToNote,
      replaceAll,
      updateSettings,
      backupNow,
    }),
    [ready, notes, settings, allTags, getNote, createNote, updateNote, deleteNote, toggleFavorite, addAttachment, removeAttachment, appendToNote, replaceAll, updateSettings, backupNow],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotes() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotes fora do NotesProvider');
  return ctx;
}
