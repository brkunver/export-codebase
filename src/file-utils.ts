// src/file-utils.ts

import fs from "fs/promises"
import path from "path"
import fg from "fast-glob"
import ignore from "ignore" // The ignore factory function
import type { Ignore } from "ignore" // Type for an ignore instance
import chalk from "chalk"
import { HARDCODED_IGNORES, BINARY_EXTENSIONS } from "./constants.ts"
import type { Logger } from "./logger.ts"
import { generateProjectStructure } from "./formatter.ts"

export type FileContent = {
  filePath: string
  content: string
}

export async function loadGitignore(projectRoot: string, logger: Logger): Promise<Ignore> {
  const ig = ignore.default() // Create an ignore instance

  try {
    const gitignorePath = path.join(projectRoot, ".gitignore")
    const gitignoreContent = await fs.readFile(gitignorePath, "utf-8")
    ig.add(gitignoreContent)
    logger.log(".gitignore rules loaded.")
  } catch (error) {
    logger.warn(".gitignore not found or unreadable. Proceeding with hardcoded exclusions for file content processing.")
    // If .gitignore is not found, `ig` will be an empty ignore instance, which means it won't ignore anything by itself.
  }
  return ig
}

export async function findFiles(
  projectRoot: string,
  outputFilename: string,
  includeHidden: boolean,
  logger: Logger,
  gitignoreRules: Ignore, // .gitignore rules instance
): Promise<FileContent[]> {
  // Explicit return type
  // These ignores are for fast-glob's initial filtering.
  // outputFilename is added here to prevent fast-glob from even considering it.
  const fgIgnorePatterns = [...HARDCODED_IGNORES, outputFilename.replace(/\\/g, "/")]

  const files = await fg("**/*", {
    cwd: projectRoot,
    ignore: fgIgnorePatterns, // Patterns for fast-glob's internal filtering
    dot: includeHidden, // Whether to include dotfiles (if not ignored)
    onlyFiles: true,
    stats: false, // We don't need file stats from fast-glob here
    absolute: false, // Get paths relative to cwd
    caseSensitiveMatch: process.platform !== "win32", // OS-dependent case sensitivity
  })

  logger.log(`Found ${chalk.bold(files.length.toString())} potential files after fast-glob filtering.`)

  const contentPromises: Promise<FileContent | null>[] = []

  for (const relativeFilePath of files) {
    // Normalize path for consistent matching against .gitignore rules
    const normalizedRelativeFilePath = relativeFilePath.replace(/\\/g, "/")

    // Now, apply the .gitignore rules loaded separately
    if (gitignoreRules.ignores(normalizedRelativeFilePath)) {
      // logger.log(`Skipping (due to .gitignore): ${chalk.gray(normalizedRelativeFilePath)}`); // Optional: for debugging
      continue
    }

    const ext = path.extname(normalizedRelativeFilePath).toLowerCase()
    if (BINARY_EXTENSIONS.has(ext)) {
      // logger.log(`Skipping binary file: ${chalk.magenta(normalizedRelativeFilePath)}`); // Optional: for debugging
      continue
    }

    // The output file itself should have been excluded by fgIgnorePatterns.
    // An explicit check against the normalized outputFilename might be redundant but safe.
    // if (normalizedRelativeFilePath === outputFilename.replace(/\\/g, '/')) {
    //   continue;
    // }

    const absoluteFilePath = path.join(projectRoot, relativeFilePath)
    contentPromises.push(
      fs
        .readFile(absoluteFilePath, "utf-8")
        .then(content => ({ filePath: normalizedRelativeFilePath, content })) // Store normalized path
        .catch(err => {
          logger.warn(
            `Could not read file: ${chalk.magenta(normalizedRelativeFilePath)}. Error: ${
              (err as Error).message
            }. Skipping.`,
          )
          return null
        }),
    )
  }

  const fileContentsResults = await Promise.all(contentPromises)
  const validFiles = fileContentsResults.filter(Boolean) as FileContent[]
  logger.log(`Successfully read ${chalk.bold(validFiles.length.toString())} text files after all filters.`)
  return validFiles
}

export type WriteResult =
  | {
      success: true
      filePath: string
      fileSize: number
      totalLines: number
    }
  | {
      success: false
      filePath?: string // filePath can be undefined if writing failed early
      fileSize?: undefined
      totalLines?: undefined
    }

export async function writeOutputFile(
  projectRoot: string,
  outputFilename: string,
  validFileContents: FileContent[],
  logger: Logger,
  gitignoreRules: Ignore, // .gitignore rules for structure generation
): Promise<WriteResult> {
  const outputPath = path.join(projectRoot, outputFilename)

  try {
    // Generate project structure; it uses gitignoreRules and outputFilename internally for its specific ignores.
    const projectStructure = generateProjectStructure(projectRoot, gitignoreRules, outputFilename)

    let finalOutput = `${projectStructure}\n\n` // Two newlines after structure block
    let totalLines = projectStructure.split("\n").length + 2 // Account for structure lines + 2 newlines

    for (const { filePath, content } of validFileContents) {
      // filePath should already be normalized from findFiles
      finalOutput += `// ${filePath}\n\n${content.trim()}\n\n` // Two newlines after content block
      totalLines += content.split("\n").length + 3 // Account for comment, content lines, and 3 newlines (before comment, after content, after block)
    }

    // Trim trailing whitespace from the whole string, then ensure a final newline.
    await fs.writeFile(outputPath, finalOutput.trimEnd() + "\n")
    const stats = await fs.stat(outputPath)

    return {
      success: true,
      filePath: outputPath,
      fileSize: stats.size,
      totalLines,
    }
  } catch (writeError) {
    logger.error(`Failed to write output file: ${chalk.cyan(outputPath)}`, writeError)
    return { success: false, filePath: outputPath } // Include filePath even on failure if known
  }
}
