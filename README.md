# Cozy Tapestry

Turn a photo of your pet into a crochet pattern — a thick blanket or a lighter decorative tapestry — with a yarn list, row-by-row instructions and a printable PDF. Everything runs in your browser; your photo never leaves your device.

> **Status:** project scaffold. The app is built in phases — see [docs/README.md](docs/README.md).

## Run it locally

You need [Node.js](https://nodejs.org) 20 or newer.

```bash
npm install
```

```bash
npm run dev
```

Then open <http://localhost:5173>. In VS Code you can also press **Cmd+Shift+B** (Run Build Task) to start the dev server.

## Other commands

| Command | What it does |
| --- | --- |
| `npm test` | Run the unit tests once |
| `npm run typecheck` | Check TypeScript types |
| `npm run build` | Type-check and build the site into `dist/` |
| `npm run preview` | Serve the built site locally |

## Project layout

```
docs/               Plan, architecture and one folder per build phase
src/types.ts        Shared data contracts
src/config/         Crochet numbers (gauge, yarn use, sizes) and wizard steps
src/app/            App shell, state, navigation, theme   (Phase 1)
src/steps/          One screen per wizard step             (Phases 1–4)
src/segmentation/   Background removal                     (Phase 2)
src/engine/         Photo → stitch chart → rows → yarn     (Phase 3)
src/export/         PDF export                             (Phase 4)
tests/              Unit tests
```

## Credits

- Background removal: [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) 1.7.0 by IMG.LY (AGPL-3.0), using the ISNet model (quantized, 44 MB) and [ONNX Runtime Web](https://github.com/microsoft/onnxruntime) 1.21.0 (MIT). The model files are served from this site (`public/models/imgly/`, fetched with `node scripts/fetch-model.mjs`); your photo is processed on your device and never uploaded.
- Fonts: Fraunces and Nunito via Fontsource (SIL Open Font License 1.1).

## License

[GNU AGPL v3.0 or later](LICENSE). You may use, change and share this code, but if you share or host a changed version you must publish its source under the same license. Third-party libraries and models keep their own licenses (listed under "Credits" once added).
