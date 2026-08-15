# agents.md

This document is written for AI agents (and human contributors) who need to work on this repository. It explains the project's architecture, execution flow, conventions, and practical notes so you can make changes confidently and correctly.

## Project Overview

**export-codebase** is a Node.js CLI tool that aggregates a project's text files into a single, well-structured output file (default: `project.txt`). Each file's content is prefixed with its relative path (e.g., `// src/index.ts`), and the output begins with a visual tree of the project structure.

It is designed for sharing or archiving a codebase in one file, and for feeding context to LLMs.

## Tech Stack

| Concern         | Choice                                                                                                              |
| --------------- | ------------------------------------------------------------------------------------------------------------------- |
| Language        | TypeScript (strict mode, ES2022 target)                                                                             |
| Module system   | ESM (`"type": "module"`, `module: NodeNext`)                                                                        |
| Runtime         | Node.js >= 18                                                                                                       |
| Bundler         | [tsup](https://tsup.egoist.dev/) (ESM output, single file, dts + sourcemaps, minified)                              |
| Package manager | bun (lockfile: `bun.lock`); `npm` only used in CI for publishing                                                    |
| Dependencies    | `chalk` (colored output), `fast-glob` (file discovery), `ignore` (gitignore matching), `minimist` (CLI arg parsing) |
| Code style      | Prettier (config in `.prettierrc.json`: no semicolons, double quotes, 120 print width, 2-space indent)              |

## Repository Layout

```
.
├── src/
│   ├── index.ts       # Entry point: orchestrates the whole flow
│   ├── args.ts        # CLI argument parsing (minimist) → ProgramArgs
│   ├── constants.ts   # Hardcoded ignore patterns + binary extension list
│   ├── file-utils.ts  # File discovery, reading, gitignore loading, output writing
│   ├── formatter.ts   # Project structure tree, file-size formatting, summary display
│   ├── help.ts        # `--help` text
│   ├── logger.ts      # Leveled console logger (log/info/warn/error/success)
│   └── version.ts     # Reads package.json version for the help message
├── tsup.config.ts     # Build configuration
├── tsconfig.json      # TS compiler options (noEmit; tsup handles output)
├── package.json       # Scripts, metadata, deps
├── push.sh            # Deprecated release helper (was dev → main merge → npm publish)
└── README.md          # User-facing docs
```

## Execution Flow

```
process starts
  └─ src/index.ts main()
       ├─ parseArgs()            → ProgramArgs | null (exits on --help)
       ├─ createLogger({silent}) → leveled logger
       ├─ loadGitignore()        → Ignore instance from .gitignore (empty if missing)
       ├─ findFiles()            → FileContent[] (path + content)
       │    ├─ fast-glob "**/*" with HARDCODED_IGNORES + output filename
       │    ├─ filter out .gitignore matches
       │    ├─ filter out binary extensions
       │    └─ read each file as utf-8 (failures are logged and skipped)
       ├─ writeOutputFile()      → WriteResult
       │    ├─ generateProjectStructure() → ASCII tree of the repo
       │    ├─ concat: structure + `// <path>` + content for each file
       │    └─ write file (trimEnd + trailing newline), stat it
       └─ displaySummary()       → file count, total lines, size (skipped if empty output)
```

Key detail: **`main()` is an async IIFE with a catch-all** at the bottom of `index.ts` that prints a styled "critical unexpected error" and exits with code 1. Keep that in mind when changing control flow.

## Module Responsibilities

### `src/index.ts` — Orchestrator

- Parses args, builds the logger, runs the pipeline, displays the summary.
- Exits with code 1 if output writing fails or the summary is unexpectedly incomplete.
- Warns when the output file was created but is empty.

### `src/args.ts` — CLI Parsing

- `minimist` with aliases: `-o/--output`, `-s/--silent`, `-h/--help`, plus `--include-hidden`.
- Returns `null` (and the process exits 0) when `--help` is passed.
- Default output filename comes from `constants.ts`.

### `src/constants.ts` — Central Config

- `DEFAULT_OUTPUT_FILENAME` — default output name.
- `HARDCODED_IGNORES` — always-excluded patterns: `node_modules`, `.git`, `.env`/`.env.*` (but NOT `.env.example`), lock files (incl. `Cargo.lock`, `go.sum`), build outputs (`dist`, `build`, `out`, `coverage`, Rust's `target`), Go `coverage.out`, logs, OS junk.
- `BINARY_EXTENSIONS` — extension set for binary files that are skipped (incl. object/archive artifacts `.o`, `.a`, `.rlib`, `.rmeta`).
- `MAX_FILE_SIZE_BYTES` — files larger than this (1 MB) are skipped as too large for text context.

**If you add an exclusion or file type, this is the file to edit.**

### `src/file-utils.ts` — File I/O

- `loadGitignore(projectRoot, logger)` — reads `.gitignore` into an `ignore` instance; falls back to an empty instance (with a warning) if missing/unreadable.
- `findFiles(...)` — two-stage filtering:
  1. `fast-glob` ignores `HARDCODED_IGNORES` + the output filename (so it's never considered).
  2. Per-file: `.gitignore` check, binary extension check, then `stat` + size check (files over `MAX_FILE_SIZE_BYTES` are logged and skipped), then async read.
  - Returns `FileContent[]` with **normalized (forward-slash) relative paths**.
  - File reads happen concurrently via `Promise.all`; unreadable/unreadable-sized files are logged and skipped (never fatal).
- `writeOutputFile(...)` — builds the final string (`structure + "\n\n"` then per-file `// <path>\n\n<content>\n\n`), trims trailing whitespace, ensures one trailing newline, writes, and stats the file. Returns a discriminated `WriteResult` union.

### `src/formatter.ts` — Presentation

- `generateProjectStructure(...)` — recursive `readdirSync` walk producing an ASCII tree (`├──` / `└──`), directories first, alphabetically sorted. Uses `HARDCODED_IGNORES` + output filename + `.gitignore` for filtering. Directory read errors become inline `[Error reading directory: ...]` lines instead of crashing.
- `formatFileSize(bytes)` — B / KB / MB.
- `displaySummary(...)` — colored summary block.

### `src/logger.ts` — Logging

- `createLogger({silent})`: `log`/`info` respect `silent`; `warn`/`error` always print (errors are always shown per the README contract); `success` always prints. Note `error` accepts an optional second payload.

### `src/help.ts` / `src/version.ts`

- `displayHelp()` — prints usage text with chalk styling; version is read dynamically via `getPackageVersion()` (reads `package.json` relative to the module path, falls back to `"N/A"`).

## Scripts (from `package.json`)

| Script             | What it does                                                            |
| ------------------ | ----------------------------------------------------------------------- |
| `npm run build`    | Bundle with tsup (entry `src/index.ts`, ESM, dts, sourcemaps, minified) |
| `npm run dev`      | tsup watch mode                                                         |
| `npm start`        | Run the built CLI (`node dist/index.js`)                                |
| `npm run fulltest` | Build then run — the project's manual smoke test                        |

There is **no automated test suite** in this repo. Verify changes with `npm run build` (type safety + bundling) and `npm run fulltest` against a sample project (or the repo itself) to check behavior. Note the CLI writes its output file into the CWD, so run it in a scratch directory (or use `-o` with a throwaway name) when testing.

## Conventions & Style

- **No semicolons**, double quotes, 2-space indent, 120-column print width (Prettier via `.prettierrc.json`). Match existing style; consider running `npx prettier --write` on touched files.
- Use **`.ts` extensions in relative imports** (`./logger.ts`) — required by `allowImportingTsExtensions` + NodeNext.
- Explicit types on exported functions; internal types (`Ignore`) stay in `file-utils.ts` (see the comment in `index.ts`).
- Comments in the code explain _why_ (e.g., why the output file is added to fast-glob ignores) — preserve that intent when editing.
- Errors are surfaced through the logger (colored), not raw throws, except the top-level catch-all.
- No framework, no tests directory, no lint config beyond Prettier — keep it simple.

## Release / Branching Notes

- **Releases are fully automated**: pushing/merging to `main` triggers `.github/workflows/publish.yml`, which installs with bun, builds, and runs `npm publish --provenance` via the npm trusted publisher (OIDC — no token secret needed). A version guard skips the publish step when the version is already on npm.
- `push.sh` is deprecated/unused — do not treat it as the release path.
- Bump `package.json`'s `version` before merging to `main` to trigger a real publish.
- The `.gitignore` excludes `.freebuff`, `.cursorrules`, `.windsurfrules`, `.vscode`, and output files like `project.txt` / `custom_output.txt` — generated artifacts should not be committed.

## Common Agent Tasks — Where to Look

- **Change default ignore rules** → `src/constants.ts` (`HARDCODED_IGNORES`).
- **Add/remove a binary file type** → `src/constants.ts` (`BINARY_EXTENSIONS`).
- **Change output format** (separator, header, structure tree) → `src/file-utils.ts` (`writeOutputFile`) and `src/formatter.ts`.
- **Add a CLI flag** → `src/args.ts` (parsing) + `src/help.ts` (docs) + wire into `index.ts`/relevant modules.
- **Tweak logging behavior** → `src/logger.ts`.
- **Change file discovery** → `src/file-utils.ts` (`findFiles` + `loadGitignore`).

## Gotchas

- **Path normalization**: file paths are normalized to forward slashes before gitignore/binary checks and stored in the output; `path.join` is used for actual filesystem access. Windows compatibility depends on this — don't introduce raw backslash comparisons.
- **The output file must never be processed**: it is excluded in both `fast-glob` ignores and the structure-tree ignores. If you change the default filename, both places already read from the constant, but keep the symmetry.
- **`.env.example` is intentionally kept** while all other `.env*` are dropped.
- **Large files are skipped by size**: `MAX_FILE_SIZE_BYTES` (1 MB) is enforced in `findFiles` via `fs.stat` before reading. If you change the constant, keep `help.ts`'s "1 MB" text in sync.
- **Case sensitivity is OS-dependent** (`caseSensitiveMatch: process.platform !== "win32"`).
- **`ignore` instances are cheap to create but stateful**: `structureSpecificIgnores` gets a fresh instance per `generateProjectStructure` call; `.gitignore` rules are loaded once and reused for both file filtering and the tree.
- The build target is `node18` and `fsevents` is externalized (macOS optional dep) — don't use Node APIs newer than 18 without a good reason.
