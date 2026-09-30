import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import type { ClipItem } from '../types';
import { uid } from '../lib/id';
import { detectClipKind } from '../lib/clip';

const KEY = 'caderno.clips.v1';
const MAX_ITEMS = 60;
const DAY = 24 * 60 * 60 * 1000;

interface ClipboardApi {
  items: ClipItem[];
  visible: boolean;
  open: () => void;
  close: () => void;
  /** nota aberta no editor — alvo do "Colar na nota" */
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  refresh: () => Promise<void>;
  togglePin: (id: string) => void;
  remove: (id: string) => void;
  copy: (text: string) => Promise<void>;
}

const Ctx = createContext<ClipboardApi | null>(null);

/** Fixados ficam; o resto expira em 24 h ou pelo limite de itens. */
function prune(list: ClipItem[]): ClipItem[] {
  const cutoff = Date.now() - DAY;
  return list.filter((i) => i.pinned || i.createdAt > cutoff).slice(0, MAX_ITEMS);
}

export function ClipboardProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ClipItem[]>([]);
  const [visible, setVisible] = useState(false);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const loaded = useRef(false);
  const lastSeen = useRef<string>('');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) {
          const list: ClipItem[] = JSON.parse(raw);
          setItems(prune(list));
          if (list[0]) lastSeen.current = list[0].text;
        }
      })
      .catch(() => {})
      .finally(() => {
        loaded.current = true;
        refresh();
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(KEY, JSON.stringify(items)).catch(() => {});
  }, [items]);

  const push = useCallback((text: string) => {
    const t = text.trim();
    if (!t) return;
    lastSeen.current = text;
    setItems((list) => {
      const dup = list.find((i) => i.text === t);
      const rest = list.filter((i) => i.text !== t);
      const item: ClipItem = dup ? { ...dup, createdAt: Date.now() } : { id: uid(), text: t, kind: detectClipKind(t), pinned: false, createdAt: Date.now() };
      return prune([item, ...rest]);
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      if (!(await Clipboard.hasStringAsync())) return;
      const text = await Clipboard.getStringAsync();
      if (text && text !== lastSeen.current) push(text);
    } catch {}
  }, [push]);

  // Android só expõe a área de transferência com o app em primeiro plano:
  // escuta mudanças enquanto aberto e revalida ao voltar do segundo plano.
  useEffect(() => {
    const sub = Clipboard.addClipboardListener(({ contentTypes }) => {
      if (contentTypes.includes(Clipboard.ContentType.PLAIN_TEXT)) refresh();
    });
    const app = AppState.addEventListener('change', (s) => {
      if (s === 'active') refresh();
    });
    return () => {
      sub.remove();
      app.remove();
    };
  }, [refresh]);

  const open = useCallback(() => {
    setItems(prune);
    refresh();
    setVisible(true);
  }, [refresh]);
  const close = useCallback(() => setVisible(false), []);

  const togglePin = useCallback((id: string) => {
    setItems((list) => list.map((i) => (i.id === id ? { ...i, pinned: !i.pinned } : i)));
  }, []);

  const remove = useCallback((id: string) => setItems((list) => list.filter((i) => i.id !== id)), []);

  const copy = useCallback(
    async (text: string) => {
      push(text);
      await Clipboard.setStringAsync(text);
    },
    [push],
  );

  const value = useMemo<ClipboardApi>(
    () => ({ items, visible, open, close, activeNoteId, setActiveNoteId, refresh, togglePin, remove, copy }),
    [items, visible, open, close, activeNoteId, refresh, togglePin, remove, copy],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useClipboard() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useClipboard fora do ClipboardProvider');
  return ctx;
}
