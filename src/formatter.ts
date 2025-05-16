// src/formatter.ts

import chalk from "chalk"
import path from "path"
import fs from "fs"
import { HARDCODED_IGNORES } from "./constants.ts"
import type { Ignore } from "ignore" // Type for an ignore instance
import ignore from "ignore" // The ignore factory function

export function formatFileSize(fileSizeInBytes: number): string {
  if (fileSizeInBytes < 1024) {
    return `${fileSizeInBytes} B`
  } else if (fileSizeInBytes < 1024 * 1024) {
    return `${(fileSizeInBytes / 1024).toFixed(2)} KB`
  } else {
    return `${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

// Helper function for recursive directory traversal
function listDirectoryRecursive(
  currentPath: string, // Full path to the current directory being listed
  relativePathToRoot: string, // Path of this directory relative to the project root
  indentPrefix: string, // Prefix for indentation (e.g., "│   " or "    ")
  structureSpecificIgnores: Ignore,
  gitignoreRules: Ignore,
  structure: string[], // Array to append lines to
): void {
  try {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true })

    const filteredEntries = entries
      .filter(entry => {
        // Path relative to project root for ignore checks
        const entryRelativePath = path.join(relativePathToRoot, entry.name)
        const normalizedEntryRelativePath = entryRelativePath.replace(/\\/g, "/")

        return (
          !structureSpecificIgnores.ignores(normalizedEntryRelativePath) &&
          !gitignoreRules.ignores(normalizedEntryRelativePath)
        )
      })
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

    filteredEntries.forEach((entry, index) => {
      const isLastEntry = index === filteredEntries.length - 1
      const connector = isLastEntry ? "└── " : "├── "
      const entryDisplayName = entry.name + (entry.isDirectory() ? "/" : "")
      structure.push(`${indentPrefix}${connector}${entryDisplayName}`)

      if (entry.isDirectory()) {
        const nextIndentPrefix = indentPrefix + (isLastEntry ? "    " : "│   ")
        listDirectoryRecursive(
          path.join(currentPath, entry.name),
          path.join(relativePathToRoot, entry.name), // Update relative path for the next level
          nextIndentPrefix,
          structureSpecificIgnores,
          gitignoreRules,
          structure,
        )
      }
    })
  } catch (readError) {
    structure.push(`${indentPrefix}└── [Error reading directory: ${path.basename(currentPath)}]`)
  }
}

export function generateProjectStructure(
  rootPath: string,
  gitignoreRules: Ignore, // Rules loaded from .gitignore
  outputFilename: string, // The name of the output file to ignore for the structure
): string {
  const structure: string[] = []

  const structureSpecificIgnores = ignore.default()
  structureSpecificIgnores.add(HARDCODED_IGNORES)
  structureSpecificIgnores.add(outputFilename.replace(/\\/g, "/"))

  structure.push("// Project structure")
  structure.push(`${path.basename(rootPath)}/`) // Project root directory name

  // Start the recursive listing from the root.
  // The initial relativePathToRoot is an empty string.
  // The initial indentPrefix is empty because the first level connectors are handled by the main function call.

  try {
    const topLevelEntries = fs.readdirSync(rootPath, { withFileTypes: true })

    const filteredTopLevelEntries = topLevelEntries
      .filter(entry => {
        const entryRelativePath = entry.name // At root, relative path is just the name
        const normalizedEntryRelativePath = entryRelativePath.replace(/\\/g, "/")

        return (
          !structureSpecificIgnores.ignores(normalizedEntryRelativePath) &&
          !gitignoreRules.ignores(normalizedEntryRelativePath)
        )
      })
      .sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1
        if (!a.isDirectory() && b.isDirectory()) return 1
        return a.name.localeCompare(b.name)
      })

    filteredTopLevelEntries.forEach((entry, index) => {
      const isLastEntry = index === filteredTopLevelEntries.length - 1
      const connector = isLastEntry ? "└── " : "├── "
      const entryDisplayName = entry.name + (entry.isDirectory() ? "/" : "")
      structure.push(`${connector}${entryDisplayName}`)

      if (entry.isDirectory()) {
        const indentPrefix = isLastEntry ? "    " : "│   "
        listDirectoryRecursive(
          path.join(rootPath, entry.name), // Full path to the subdirectory
          entry.name, // Path of subdirectory relative to root
          indentPrefix,
          structureSpecificIgnores,
          gitignoreRules,
          structure,
        )
      }
    })
  } catch (rootReadError) {
    structure.push(`└── [Error reading project root: ${(rootReadError as Error).message}]`)
  }

  return structure.join("\n")
}

export function displaySummary(filePath: string, fileCount: number, totalLines: number, fileSize: number): void {
  console.log(chalk.bold("\n--- Summary ---"))
  console.log(chalk.green(`✔ Processed ${chalk.bold(fileCount.toString())} files.`))
  console.log(`  Total lines written: ${chalk.bold(totalLines.toString())}`)
  console.log(`  Output file: ${chalk.cyan(path.resolve(filePath))}`)
  console.log(`  File size: ${chalk.bold(formatFileSize(fileSize))}`)
  console.log(chalk.bold("---------------"))
}
