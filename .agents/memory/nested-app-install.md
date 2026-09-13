---
name: Nested app dependency installation
description: Dependency installation behavior for imported projects whose runnable app lives below the workspace root
---

Use the runnable app's own package manager and lockfile when the project is nested under a directory such as app/. Generic workspace package installation can resolve against a different root package and fail on unrelated peer dependencies.

**Why:** The workspace can contain multiple package manifests; installing from the wrong root may target an unrelated dependency tree even though the configured workflow runs the nested app.

**How to apply:** Check the configured workflow's working directory, then install with that directory as the working directory and use its existing lockfile before running the build.