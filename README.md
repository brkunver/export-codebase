# export-codebase

[![npm](https://img.shields.io/npm/v/export-codebase)](https://www.npmjs.com/package/export-codebase)
[![npm downloads](https://img.shields.io/npm/dm/export-codebase)](https://www.npmjs.com/package/export-codebase)

A simple CLI tool that exports a project's relevant text files into a single, structured file.

`export-codebase` is useful when you want to share a codebase, archive a project, or provide an entire project as context to an LLM.

## Features

- Respects your project's `.gitignore`
- Automatically excludes `node_modules`, `.git`, build outputs, lock files, and environment files
- Keeps `.env.example` while excluding other `.env` files
- Skips binary files
- Skips files larger than 1 MB
- Generates an ASCII project structure
- Preserves each file's relative path in the output
- Supports custom output filenames
- Supports hidden files when explicitly enabled
- Works with any project, regardless of programming language

## Installation

You don't need to install it globally.

Run it directly with `npx`:

```bash
npx export-codebase
```

Or install it as a dependency:

```bash
npm install export-codebase
```

## Usage

Run the command from the root of your project:

```bash
npx export-codebase
```

By default, it creates:

```text
project.txt
```

The generated file contains the project structure followed by the contents of the relevant files.

Example:

```text
// Project structure
my-project/
├── src/
│   ├── index.ts
│   └── utils.ts
├── package.json
└── README.md

// src/index.ts

import { hello } from "./utils.ts"

hello()

// src/utils.ts

export function hello() {
  console.log("Hello, world!")
}
```

This makes it easy to copy an entire project into an LLM or share it as a single file.

## Options

### Custom output file

Use `-o` or `--output` to specify the output filename:

```bash
npx export-codebase -o codebase.txt
```

### Silent mode

Use `-s` or `--silent` to suppress informational logs:

```bash
npx export-codebase --silent
```

Warnings, errors, and the final summary are still displayed.

### Include hidden files

Hidden files and directories are excluded by default.

Use `--include-hidden` to process hidden files that are not otherwise ignored:

```bash
npx export-codebase --include-hidden
```

## Exclusions

`export-codebase` automatically excludes:

- Files and directories matched by `.gitignore`
- `node_modules`
- `.git`
- `.env` and other environment files
- Build outputs such as `dist`, `build`, `out`, `coverage`, and `target`
- Package manager lock files
- Binary files
- Files larger than 1 MB
- The generated output file itself

`.env.example` is intentionally not excluded.

## Why?

When working with AI coding tools, you often need to provide context from an entire codebase.

Copying files manually is tedious, while sending an entire directory can include unnecessary files such as dependencies, build artifacts, binaries, and secrets.

`export-codebase` creates a clean, structured representation of your project in a single file.

```text
Project
  ↓
export-codebase
  ↓
project.txt
  ↓
LLM / sharing / archiving
```

## Requirements

- Node.js 18 or newer

## Development

Clone the repository and install dependencies:

```bash
git clone https://github.com/brkunver/export-codebase.git
cd export-codebase
npm install
```

Build the project:

```bash
npm run build
```

Run the CLI:

```bash
npm start
```

Run the manual smoke test:

```bash
npm run fulltest
```

## License

This project is licensed under the GNU General Public License v3.0.

See the [LICENSE](./LICENSE) file for details.

## Repository

[GitHub](https://github.com/brkunver/export-codebase)

[NPM](https://www.npmjs.com/package/export-codebase)
