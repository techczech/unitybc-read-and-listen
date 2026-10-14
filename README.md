# UnityBC — Read and listen

A static multilingual companion demonstrating fixed study information with recorded speech, sentence highlighting, paired English/translation reading, Focus view and browser-local notes.

**Live reader:** https://unitybc-read-and-listen.pages.dev/

**Embedding demonstration:** https://embed-check.unitybc-read-and-listen.pages.dev/embed-example.html

**Status:** Research demonstration. Translations, AI-generated recordings and semantic passage matching await human language review. This is not an approved interpreting service or a participant recruitment system. Current study information and participation remain at the [official UnityBC website](https://www.ceu.ox.ac.uk/research/unitybc).

## Available material

English opens by default. Bengali, Urdu, Gujarati and Czech are available from the language row. Each language has the participant information (12 sections), full plain language summary and three questionnaire examples. The Czech questionnaire source wording differs from the other language packages; corresponding English text/audio stays attached to the correct source variant.

The fixed audio uses OpenAI GPT Audio Mini / Shimmer, compressed to mono MP3 at 32 kbps. These are existing recordings, reused without generation calls for this website. Possible speech substitutions and translation/pronunciation issues remain under review, particularly in Bengali and Gujarati. Sentence timings and meaning-pair mappings are provisional.

## Run locally

Python 3.10 or newer is sufficient; the reader has no installation dependencies.

```sh
python3 scripts/build-unitybc-companion.py
python3 -m http.server 8000
```

Open http://localhost:8000/. Use HTTP rather than opening HTML from disk because the website uses shared assets and root-relative links. The earlier offline single-file delivery is a separate format.

## Edit or add material

`source/material-<language>-<document>.md` holds canonical JSON-compatible YAML frontmatter. It contains fixed text, structured questionnaire options, sentence character/time offsets, explicit English/translation passage pairing and audio URLs. The generated HTML is not the editable source of truth. Do not edit translated text without checking its recording, timestamps and passage mapping. No runtime translation service or API key is involved.

`source/reader-*.js` contains the established reader behaviour. The build adapts its audio loader to external MP3s and emits the shared `assets/reader.js`. `assets/styles-reader.css` preserves the original reader foundation; `assets/styles-companion.css` supplies the approved white/navy/magenta website design. `source/template-unitybc-reader.html` is the shared document structure. The build validates placeholder replacement and produces 15 language/document routes.

Add a language by providing its material sources with the same schema, accurate audio/timings and explicit source-passage pairing, then add its native-script label to the build’s `LANGUAGES` map. Verify the language with a human reviewer before describing it as approved.

## Delivery size and privacy

The audio manifest contains 80 distinct MP3 files totalling about 29.5 MB, deduplicated by SHA-256. Text, timings and code load separately from recordings. Audio is requested when selected for playback, not downloaded as an all-language bundle. No analytics, accounts, model calls or response-submission endpoint is present. Notes and example answers remain in browser storage; normal hosting requests still reach the hosting provider.

## Deploy and embed

Run the Python build, then `python3 scripts/package-unitybc-site.py` to create the allowlisted `dist/` website. Deploy with `wrangler pages deploy dist --project-name unitybc-read-and-listen --branch main` using your own Cloudflare login. There are no deployment credentials in this repository. The initial deployment uses the CLI; GitHub pushes do not automatically publish. A team-owned Git integration can be configured later without changing the reader. The `_headers` file controls Content Security Policy, allowed iframe parents and caching of fingerprinted audio. Source, tests and local verification outputs stay outside the deployed folder.

Append `?embed=1` to any reader page. The approved parent is `https://www.ceu.ox.ac.uk`, alongside this companion and its separate cross-origin embed demonstration. The parent site also needs to permit the iframe origin. The [embed guide](https://unitybc-read-and-listen.pages.dev/embed-guide.html) includes a fixed-height snippet and optional origin-checked resize helper. Installation in the actual Oxford website is a separate step.

## Verification and licensing

Run `python3 tests/check-public-export.py` for asset checksums, route/schema integrity and unintended private-path checks. Browser checks use Playwright supplied externally; no browser automation dependency is installed for visitors. Interface checks do not establish clinical accuracy or native-speaker approval.

The reader code is MIT-licensed; see `LICENSE`. Lucide/Feather icon notices are retained in `LICENSE-ICONS`. Study text, translations and recordings are separate content; see `CONTENT-RIGHTS.md`. Public access does not imply a new blanket licence for study-owned material. This repository contains an explicit export, not the private translation/research workspace.
