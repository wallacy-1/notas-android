<p align="center">
  <img src="assets/icone/ic_launcher-192.png" width="96" alt="Ícone do Caderno" />
</p>

<h1 align="center">Caderno</h1>

<p align="center">App de notas (React Native + Expo, foco Android) implementado a partir do design <code>Caderno.dc.html</code>.</p>

## Telas

| Notas | Filtro por tag | Busca |
| :---: | :---: | :---: |
| <img src="docs/screenshots/notas.jpg" width="240" /> | <img src="docs/screenshots/filtro.jpg" width="240" /> | <img src="docs/screenshots/busca.jpg" width="240" /> |

| Editor | Edição markdown | Opções da nota |
| :---: | :---: | :---: |
| <img src="docs/screenshots/editor.jpg" width="240" /> | <img src="docs/screenshots/edicao.jpg" width="240" /> | <img src="docs/screenshots/menu-nota.jpg" width="240" /> |

| Anexos de imagem | Anexos de arquivo | PDF e planilha |
| :---: | :---: | :---: |
| <img src="docs/screenshots/imagens.jpg" width="240" /> | <img src="docs/screenshots/anexos.jpg" width="240" /> | <img src="docs/screenshots/reuniao.jpg" width="240" /> |

| Receita | Nova tag | Favoritas |
| :---: | :---: | :---: |
| <img src="docs/screenshots/receita.jpg" width="240" /> | <img src="docs/screenshots/tags.jpg" width="240" /> | <img src="docs/screenshots/favoritas.jpg" width="240" /> |

| Menu | Área de transferência | Backup e exportação |
| :---: | :---: | :---: |
| <img src="docs/screenshots/menu.jpg" width="240" /> | <img src="docs/screenshots/transferencia.jpg" width="240" /> | <img src="docs/screenshots/backup.jpg" width="240" /> |

## Funcionalidades

- Lista de notas com chips de tag, ordenação e busca
- Editor markdown (formatado ao tocar fora; toolbar B / I / H2 / lista / código)
- Tags, favoritas (tela em terracota), anexos (imagens e arquivos copiados para o app)
- Autosave, backup automático local diário, exportação Markdown (.zip), PDF e JSON, restauração
- Overlay de área de transferência: histórico tipado (texto / link / código), filtro, fixar, apagar, colar na nota

## Rodar

```bash
npm install
npx expo start --android
```

Precisa de Expo Go no aparelho/emulador, ou `npx expo run:android` para build nativo (Android SDK instalado).

## Estrutura

- `src/theme.ts` — tokens do design system Organic
- `src/store/` — notas/configurações e área de transferência (AsyncStorage)
- `src/lib/` — markdown, datas, arquivos, backup/exportação
- `src/screens/` — Notas, Editor, Busca, Favoritas, Backup
- `src/components/` — cards, chips, nav inferior, sheets
