---
name: Nested dependency firewall
description: Distinguishing Replit-local package registry failures from GitHub Actions build failures for imported nested projects
---

When an imported app under `app/` cannot install a locked dependency because the Replit package firewall returns HTTP 403, do not bypass the firewall or treat the fetch error as evidence that the GitHub Actions workflow has the same problem. Compare against the attached or live CI install logs; if CI installs successfully, debug its later build output independently.

**Why:** GitHub Actions successfully downloaded the nested app's dependencies while the Replit environment returned 403 for one package fetch, preventing local build verification.

**How to apply:** Keep project code fixes based on CI's actual build errors. Report local verification as blocked if dependencies cannot be safely installed.
