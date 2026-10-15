# The CFO Game

An interactive financial-management simulation where the player becomes CFO of a fictional ₹100 crore company and makes four consequential decisions.

## Local development

```bash
pnpm install
pnpm dev
```

The app runs on port 3000. Create a production bundle with `pnpm build`.

## Deployment

This is a Vite static frontend with a committed `vercel.json`. Import the repository into Vercel, keep the default pnpm install behavior, use `pnpm build` as the build command, and publish the `dist` directory.
