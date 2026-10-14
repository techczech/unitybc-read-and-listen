# UnityBC public companion

This repository contains a fixed public demonstration, not the private research workspace.

- Keep study text, recordings, timings and pair mappings together. Never regenerate or rewrite study wording as a routine UI change.
- Canonical material is in `source/material-*.md`. Rebuild with `python3 scripts/build-unitybc-companion.py`.
- Preserve the approved first-mockup page design, English default, English-first paired audio, highlighting, compact playback dock and local notes.
- Keep the language-review notice visible. No clinical or native-speaker approval is implied by browser tests.
- Do not add tracking, participant submission, credentials, private reviewer feedback or provider logs.
- Validate checksums with `python3 tests/check-public-export.py`; test playback and mobile/RTL behaviour before publishing.
- Embedding origins are configured in `_headers` and `assets/companion.js`; update both deliberately.

## Self-Healing

When a regression occurs, follow `_AGENT-INSTRUCTIONS/self-healing.md` and add a bounded check. Preserve content bytes unless the requested correction explicitly concerns them.
