---
name: pnpm tar override
description: tar@6.2.1 is blocked by Replit package firewall (critical CVE). Must override to a safe version.
---

# pnpm tar CVE override

**Rule:** Any pnpm project on Replit must override `tar` to `^7.0.0` if the lock file pins it to 6.2.1.

**Why:** The Replit package firewall (`package-firewall.replit.local`) blocks `tar@6.2.1` with a 403 Forbidden, preventing `pnpm install` from completing.

**How to apply:** Add to the app's `package.json`:
```json
"pnpm": {
  "overrides": {
    "tar": "^7.0.0"
  }
}
```
Then re-run `pnpm install`.
