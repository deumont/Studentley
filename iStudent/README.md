# iStudent

A local-first iStudent prototype built with React and Vite. It contains demo study data and stores changes in browser localStorage; it does not call AI or payment APIs.

## Run locally

```bash
pnpm install
pnpm dev
```

Create a production build with `pnpm build`. The app is ready to deploy on Vercel without hard-coded URLs or secrets.

## Future integrations

`src/services/ai.js` is the boundary for a future secure server-side AI integration. Keep API keys on the server and invoke that service through authenticated endpoints.
