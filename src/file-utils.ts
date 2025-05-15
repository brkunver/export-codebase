import fs from "fs/promises"
import path from "path"
import fg from "fast-glob"
import ignore from "ignore"
import chalk from "chalk"
import { HARDCODED_IGNORES, BINARY_EXTENSIONS } from "./constants.ts"
import { Logger } from "./logger.ts"

export type FileContent = {
  filePath: string
  content: string
}

export async function loadGitignore(projectRoot: string, logger: Logger) {
  const ig = ignore.default()

  try {
    const gitignorePath = path.join(projectRoot, ".gitignore")
    const gitignoreContent = await fs.readFile(gitignorePath, "utf-8")
    ig.add(gitignoreContent)
    logger.log(".gitignore rules loaded.")
  } catch (error) {
    logger.warn(".gitignore not found or unreadable. Proceeding with default and hardcoded exclusions only.")
  }

  return ig
}

export async function findFiles(
  projectRoot: string, 
  outputFilename: string, 
  includeHidden: boolean,
  logger: Logger,
  ig: ReturnType<typeof ignore.default>
) {
  const effectiveIgnores = [...HARDCODED_IGNORES, outputFilename]

  const files = await fg("**/*", {
    cwd: projectRoot,
    ignore: effectiveIgnores,
    dot: includeHidden,
    onlyFiles: true,
    stats: false,
    absolute: false,
    caseSensitiveMatch: process.platform !== "win32",
  })

  logger.log(`Found ${chalk.bold(files.length.toString())} potential files after initial filtering.`)

  const contentPromises: Promise<FileContent | null>[] = []

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
  return fileContentsResults.filter(Boolean) as FileContent[]
}

export type WriteResult = {
  success: true
  filePath: string
  fileSize: number
  totalLines: number
} | {
  success: false
  filePath?: undefined
  fileSize?: undefined
  totalLines?: undefined
}

export async function writeOutputFile(
  projectRoot: string,
  outputFilename: string,
  validFileContents: FileContent[],
  logger: Logger
): Promise<WriteResult> {
  if (validFileContents.length === 0) {
    logger.warn("No suitable text files found to include in the output.")
    const emptyOutputFilePath = path.join(projectRoot, outputFilename)
    try {
      await fs.writeFile(
        emptyOutputFilePath,
        `// No processable text files found in project at ${new Date().toISOString()}\n// Searched in: ${projectRoot}\n`,
      )
      logger.success(`Wrote empty state to ${chalk.cyan(emptyOutputFilePath)}.`)
      return { success: true, filePath: emptyOutputFilePath, fileSize: 0, totalLines: 0 }
    } catch (writeError) {
      logger.error(`Failed to write empty state file: ${chalk.cyan(emptyOutputFilePath)}`, writeError)
      return { success: false }
    }
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
    
    return {
      success: true,
      filePath: outputFilePath,
      fileSize: stats.size,
      totalLines,
    }
  } catch (writeError) {
    logger.error(`Failed to write output file: ${chalk.cyan(outputFilePath)}`, writeError)
    return { success: false }
  }
}
