# export-codebase
[![npm](https://img.shields.io/npm/v/export-codebase)](https://www.npmjs.com/package/export-codebase)
[![npm downloads](https://img.shields.io/npm/dm/export-codebase)](https://www.npmjs.com/package/export-codebase)

export-codebase is a CLI tool designed for Node.js projects. When you run npx export-codebase in your project directory, it reads all code and configuration files (excluding files listed in .gitignore, all .env files, and the node_modules directory) and combines their contents into a single project.txt file. Each file is prefixed with its relative path (e.g., //src/index.ts), followed by its code. This tool is useful for sharing or archiving your project's codebase in a single text file.

### Features

- Ignores files and folders specified in .gitignore
- Always excludes .env files and node_modules directory
- Supports JavaScript, TypeScript, and configuration files
- Outputs all code into a single, well-structured project.txt

### Usage

```bash
npx export-codebase
```

### Options

- `-o, --output <filename>`: Specify the output file name (default: "project.txt")
- `-s, --silent`: Suppress informational logs (errors and final summary will still be shown)
- `-h, --help`: Display this help message
- `--include-hidden`: Process hidden files and folders (those starting with '.')
  that are not explicitly ignored by .gitignore or other rules.

### License

This project is licensed under the GNU General Public License v3.0.  
See the [LICENSE](./LICENSE) file or read more at:  
https://www.gnu.org/licenses/gpl-3.0.html
