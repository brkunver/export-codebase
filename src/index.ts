import chalk from "chalk"
import { createLogger } from "./logger.ts"
import { parseArgs } from "./args.ts"
import { loadGitignore, findFiles, writeOutputFile } from "./file-utils.ts"
import { displaySummary } from "./formatter.ts"

async function main() {
  const args = await parseArgs()
  if (!args) return

  const { outputFilename, silent, includeHidden } = args
  const logger = createLogger({ silent })

  logger.info(`Starting export-codebase... Output will be ${chalk.cyan(outputFilename)}`)
  const projectRoot = process.cwd()

  // Load gitignore rules
  const ig = await loadGitignore(projectRoot, logger)

  // Find and read files
  const validFileContents = await findFiles(projectRoot, outputFilename, includeHidden, logger, ig)

  // Write output file
  const result = await writeOutputFile(projectRoot, outputFilename, validFileContents, logger)

  if (!result.success) {
    process.exit(1)
  }

  if (result.success && result.fileSize > 0) {
    displaySummary(result.filePath, validFileContents.length, result.totalLines, result.fileSize)
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
