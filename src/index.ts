// src/index.ts

import chalk from "chalk"
import { createLogger } from "./logger.ts"
import { parseArgs } from "./args.ts"
import { loadGitignore, findFiles, writeOutputFile } from "./file-utils.ts"
import { displaySummary } from "./formatter.ts"
// No need to import `Ignore` type here, it's an implementation detail of file-utils.

async function main() {
  const args = await parseArgs()
  if (!args) return // Exit if args are null (e.g., help was displayed and process exited)

  const { outputFilename, silent, includeHidden } = args
  const logger = createLogger({ silent })

  logger.info(`Starting export-codebase... Output will be ${chalk.cyan(outputFilename)}`)
  const projectRoot = process.cwd()

  // Load .gitignore rules. This returns an `Ignore` instance.
  const gitignoreRules = await loadGitignore(projectRoot, logger)

  // Find and read files, passing the loaded .gitignore rules.
  const validFileContents = await findFiles(projectRoot, outputFilename, includeHidden, logger, gitignoreRules)

  // Write output file, passing .gitignore rules again for structure generation.
  const result = await writeOutputFile(projectRoot, outputFilename, validFileContents, logger, gitignoreRules)

  if (!result.success) {
    logger.error(`Failed to create ${outputFilename}. See previous errors.`)
    process.exit(1) // Exit with error code if writing failed
  }

  // Display summary if successful
  // Ensure properties exist on result before trying to display them
  if (typeof result.fileSize === "number" && typeof result.totalLines === "number" && result.filePath) {
    if (validFileContents.length > 0 || result.fileSize > 0) {
      // Display summary if files were processed OR if the file has size (e.g., only structure was written)
      displaySummary(result.filePath, validFileContents.length, result.totalLines, result.fileSize)
    } else {
      // This case implies the output file was created but is effectively empty (e.g. 0 bytes, no files, no structure).
      logger.warn(`Output file ${chalk.cyan(result.filePath)} was created but contains no content.`)
    }
  } else if (result.success) {
    // This case means success was true, but summary details are missing, which is unexpected.
    logger.error("Output file writing reported success, but summary information is incomplete.")
    process.exit(1)
  }
  // If !result.success, an error message is already logged by writeOutputFile or earlier.
}

main().catch(error => {
  // General catch-all for unexpected errors in the main async flow
  console.error(chalk.bgRed.whiteBright.bold(`\n✖ A critical unexpected error occurred: `))
  if (error instanceof Error) {
    console.error(chalk.red(error.stack || error.message))
  } else {
    console.error(chalk.red(String(error)))
  }
  process.exit(1)
})
