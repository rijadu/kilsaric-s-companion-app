# Kilsaric Companion App

Angular is now the primary app for this repository.

## Main app

Run the app from the repo root:

```bash
npm install
npm run dev
```

Build from the repo root:

```bash
npm run build
```

The root scripts now delegate to the Angular workspace in `angular-app/`.

## Legacy React source

The original Lovable React/Vite export is still preserved in the root `src/` and related Vite files.

If you need to run the legacy React app:

```bash
npm run dev:react
```

Legacy React build:

```bash
npm run build:react
```

## Notes

- Tailwind is retained in the Angular app.
- The Angular app has full route coverage for the migrated screens.
- The remaining work is visual QA and small parity fixes, not framework migration.
