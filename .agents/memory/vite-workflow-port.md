---
name: Vite workflow port
description: Replit preview workflows need Vite invoked directly when pnpm forwards an extra separator.
---

For a Vite web preview, invoke the binary with explicit host and port flags when the package script causes pnpm to pass an extra `--`; otherwise Vite may ignore the requested port and fall back to its config.

**Why:** The preview workflow timed out because `pnpm dev -- --host ... --port ...` reached Vite as `vite -- --host ...`, leaving the server on its configured port instead of the workflow port.

**How to apply:** Prefer `pnpm exec vite --host 0.0.0.0 --port 5000` for the Replit webview workflow, and verify the workflow log shows port 5000.