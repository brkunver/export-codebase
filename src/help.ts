import chalk from "chalk"
import { DEFAULT_OUTPUT_FILENAME } from "./constants.ts"
import { getPackageVersion } from "./version.ts"

async function displayHelp() {
  const version = await getPackageVersion()
  console.log(`
${chalk.bold.green("Pack Code")} (v${version})
Concatenates relevant project text files into a single output file.

${chalk.bold("Usage:")}
  npx export-codebase [options]
  export-codebase [options] # If globally linked or installed

${chalk.bold("Options:")}
  -o, --output <filename>   Specify the output file name (default: "${DEFAULT_OUTPUT_FILENAME}")
  -s, --silent              Suppress informational logs (errors and final summary will still be shown)
  -h, --help                Display this help message
  --include-hidden          Process hidden files and folders (those starting with '.')
                            that are not explicitly ignored by .gitignore or other rules.
                            (fast-glob's 'dot' option default behavior is to include them unless ignored)

${chalk.bold("Exclusions by Default:")}
  - Files and directories listed in .gitignore
  - Standard ignored patterns: node_modules, .git, common build outputs (dist, build, out), etc.
  - Environment files (.env, .env.*, except .env.example)
  - Lock files (package-lock.json, yarn.lock, pnpm-lock.yaml)
  - The output file itself
  - Binary files (based on common extensions)
`)
}

export { displayHelp }
