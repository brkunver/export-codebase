import fs from "fs/promises"
import path from "path"
import fg from "fast-glob"
import ignore from "ignore"
import chalk from "chalk"
import minimist from "minimist"
import { fileURLToPath } from "url"

const DEFAULT_OUTPUT_FILENAME = "project.txt"
const HARDCODED_IGNORES = [
  "node_modules/**",
  ".git/**",
  ".env",
  ".env.*",
  "!.env.example", // Keep .env.example if it exists
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "dist/**",
  "build/**",
  "out/**",
  "coverage/**",
  "*.log",
  ".DS_Store",
  "Thumbs.db",
]

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".webp",
  ".svg",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".mkv",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".iso",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".app",
  ".dmg",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".wasm",
  ".cur",
  ".ico",
  ".jar",
  ".bin",
  ".img",
])

// Function to load version dynamically for help message
async function getPackageVersion(): Promise<string> {
  try {
    const ownPackageJsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json")
    const pkg = JSON.parse(await fs.readFile(ownPackageJsonPath, "utf8"))
    return pkg.version || "N/A"
  } catch (e) {
    return "N/A"
  }
}

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

async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ["output"],
    boolean: ["silent", "help", "include-hidden"],
    alias: {
      o: "output",
      s: "silent",
      h: "help",
    },
  })

  if (argv.help) {
    await displayHelp()
    process.exit(0)
  }

  const outputFilename = argv.output || DEFAULT_OUTPUT_FILENAME
  const beSilent = argv.silent || false
  const includeHiddenFlag = argv["include-hidden"] || false

  const logger = {
    log: (...args: any[]) => {
      if (!beSilent) console.log(...args)
    },
    info: (message: string) => {
      if (!beSilent) console.log(chalk.blue(`ℹ ${message}`))
    },
    warn: (message: string) => console.warn(chalk.yellow(`⚠ ${message}`)),
    error: (message: string, error?: any) => {
      console.error(chalk.red(`✖ ${message}`))
      if (error && (error instanceof Error || typeof error === "string")) console.error(chalk.red(error.toString()))
      else if (error) console.error(chalk.red(JSON.stringify(error)))
    },
    success: (message: string) => console.log(chalk.green(`✔ ${message}`)),
  }

  logger.info(`Starting export-codebase... Output will be ${chalk.cyan(outputFilename)}`)
  const projectRoot = process.cwd()
  const ig = ignore.default()

  try {
    const gitignorePath = path.join(projectRoot, ".gitignore")
    const gitignoreContent = await fs.readFile(gitignorePath, "utf-8")
    ig.add(gitignoreContent)
    logger.log(".gitignore rules loaded.")
  } catch (error) {
    logger.warn(".gitignore not found or unreadable. Proceeding with default and hardcoded exclusions only.")
  }

  const effectiveIgnores = [...HARDCODED_IGNORES, outputFilename]

  const files = await fg("**/*", {
    cwd: projectRoot,
    ignore: effectiveIgnores,
    dot: includeHiddenFlag, // If true, explicitly enable; fast-glob's default for dot is true.
    onlyFiles: true,
    stats: false,
    absolute: false,
    caseSensitiveMatch: process.platform !== "win32",
  })

  logger.log(`Found ${chalk.bold(files.length.toString())} potential files after initial filtering.`)

  const contentPromises: Promise<{ filePath: string; content: string } | null>[] = []

  for (const relativeFilePath of files) {
    if (ig.ignores(relativeFilePath)) {
      continue
    }

    const ext = path.extname(relativeFilePath).toLowerCase()
    if (BINARY_EXTENSIONS.has(ext)) {
      continue
    }

    const absoluteFilePath = path.join(projectRoot, relativeFilePath)
    contentPromises.push(
      fs
        .readFile(absoluteFilePath, "utf-8")
        .then(content => ({ filePath: relativeFilePath, content }))
        .catch(err => {
          logger.warn(
            `Could not read file: ${chalk.magenta(relativeFilePath)}. Error: ${(err as Error).message}. Skipping.`,
          )
          return null
        }),
    )
  }

  const fileContentsResults = await Promise.all(contentPromises)
  const validFileContents = fileContentsResults.filter(Boolean) as { filePath: string; content: string }[]

  if (validFileContents.length === 0) {
    logger.warn("No suitable text files found to include in the output.")
    const emptyOutputFilePath = path.join(projectRoot, outputFilename)
    try {
      await fs.writeFile(
        emptyOutputFilePath,
        `// No processable text files found in project at ${new Date().toISOString()}\n// Searched in: ${projectRoot}\n`,
      )
      logger.success(`Wrote empty state to ${chalk.cyan(emptyOutputFilePath)}.`)
    } catch (writeError) {
      logger.error(`Failed to write empty state file: ${chalk.cyan(emptyOutputFilePath)}`, writeError)
    }
    return
  }

  validFileContents.sort((a, b) => a.filePath.localeCompare(b.filePath))

  let finalOutput = ""
  let totalLines = 0

  for (const { filePath, content } of validFileContents) {
    finalOutput += `// ${filePath}\n\n${content.trim()}\n\n`
    totalLines += content.split("\n").length
  }

  const outputFilePath = path.join(projectRoot, outputFilename)
  try {
    await fs.writeFile(outputFilePath, finalOutput.trimEnd())
    const stats = await fs.stat(outputFilePath)
    const fileSizeInBytes = stats.size
    let fileSizeFormatted: string
    if (fileSizeInBytes < 1024) {
      fileSizeFormatted = `${fileSizeInBytes} B`
    } else if (fileSizeInBytes < 1024 * 1024) {
      fileSizeFormatted = `${(fileSizeInBytes / 1024).toFixed(2)} KB`
    } else {
      fileSizeFormatted = `${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB`
    }

    console.log(chalk.bold("\n--- Summary ---"))
    logger.success(`Processed ${chalk.bold(validFileContents.length.toString())} files.`)
    console.log(`  Total lines written: ${chalk.bold(totalLines.toString())}`)
    console.log(`  Output file: ${chalk.cyan(path.resolve(outputFilePath))}`)
    console.log(`  File size: ${chalk.bold(fileSizeFormatted)}`)
    console.log(chalk.bold("---------------"))
  } catch (writeError) {
    logger.error(`Failed to write output file: ${chalk.cyan(outputFilePath)}`, writeError)
    process.exit(1)
  }
}

main().catch(error => {
  console.error(chalk.bgRed.whiteBright.bold(`\n✖ A critical unexpected error occurred: `))
  if (error instanceof Error) {
    console.error(chalk.red(error.stack || error.message))
  } else {
    console.error(chalk.red(String(error)))
  }
  process.exit(1)
})
