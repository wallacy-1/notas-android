import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../theme';
import { parseMarkdown, type Block, type Inline } from '../lib/markdown';

function Inlines({ parts, base }: { parts: Inline[]; base?: object }) {
  return (
    <>
      {parts.map((p, i) => {
        if (p.type === 'bold') return <Text key={i} style={[base, styles.bold]}>{p.text}</Text>;
        if (p.type === 'italic') return <Text key={i} style={[base, styles.italic]}>{p.text}</Text>;
        if (p.type === 'code') return <Text key={i} style={[base, styles.code]}>{p.text}</Text>;
        return <Text key={i} style={base}>{p.text}</Text>;
      })}
    </>
  );
}

function BlockView({ block, showMarks }: { block: Block; showMarks: boolean }) {
  switch (block.type) {
    case 'heading': {
      const size = block.level === 1 ? 24 : block.level === 2 ? 19 : 17;
      return (
        <Text style={[styles.heading, { fontSize: size, lineHeight: size * 1.25 }]}>
          {showMarks ? <Text style={styles.mark}>{block.marker}</Text> : null}
          <Inlines parts={block.inlines} />
        </Text>
      );
    }
    case 'bullet':
      return (
        <View style={styles.listRow}>
          <Text style={styles.bullet}>•</Text>
          <Text style={styles.p}>
            <Inlines parts={block.inlines} />
          </Text>
        </View>
      );
    case 'ordered':
      return (
        <View style={styles.listRow}>
          <Text style={[styles.bullet, { minWidth: 18 }]}>{block.index}.</Text>
          <Text style={styles.p}>
            <Inlines parts={block.inlines} />
          </Text>
        </View>
      );
    case 'quote':
      return (
        <View style={styles.quote}>
          <Text style={[styles.p, styles.quoteText]}>
            <Inlines parts={block.inlines} />
          </Text>
        </View>
      );
    case 'codeblock':
      return (
        <View style={styles.codeBlock}>
          <Text style={styles.codeBlockText}>{block.text}</Text>
        </View>
      );
    case 'paragraph':
      return (
        <Text style={styles.p}>
          <Inlines parts={block.inlines} />
        </Text>
      );
    case 'blank':
      return <View style={{ height: 4 }} />;
  }
}

export function MarkdownView({ source, showMarks = true }: { source: string; showMarks?: boolean }) {
  const blocks = useMemo(() => parseMarkdown(source), [source]);
  return (
    <View style={styles.wrap}>
      {blocks.map((b, i) => (
        <BlockView key={i} block={b} showMarks={showMarks} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  p: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26, color: colors.text, flex: 1 },
  bold: { fontFamily: fonts.bodyBold },
  italic: { fontFamily: fonts.bodyItalic },
  code: { fontFamily: fonts.mono, fontSize: 14, backgroundColor: colors.neutral200, borderRadius: 8 },
  heading: { fontFamily: fonts.heading, color: colors.text, marginTop: 6 },
  mark: { fontFamily: fonts.body, fontSize: 16, color: colors.accent400 },
  listRow: { flexDirection: 'row', gap: 10 },
  bullet: { fontFamily: fonts.body, fontSize: 16, lineHeight: 26, color: colors.accent2_600 },
  quote: { borderLeftWidth: 3, borderLeftColor: colors.accent2_400, paddingLeft: 14 },
  quoteText: { color: colors.neutral700, fontFamily: fonts.bodyItalic },
  codeBlock: { backgroundColor: colors.neutral200, borderRadius: 14, padding: 12 },
  codeBlockText: { fontFamily: fonts.mono, fontSize: 13, lineHeight: 19, color: colors.text },
});
