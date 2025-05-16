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

export function generateProjectStructure(
  rootPath: string,
  gitignoreRules: Ignore, // Rules loaded from .gitignore
  outputFilename: string, // The name of the output file to ignore for the structure
): string {
  const structure: string[] = []

  // Create an ignore instance for hardcoded rules and the output file itself.
  // These rules apply specifically to what's listed in the project structure.
  const structureSpecificIgnores = ignore.default()
  structureSpecificIgnores.add(HARDCODED_IGNORES)
  // Normalize outputFilename for matching, as it might contain backslashes on Windows
  structureSpecificIgnores.add(outputFilename.replace(/\\/g, "/"))

  structure.push("// Project structure")
  structure.push(`${path.basename(rootPath)}/`) // Project root directory name

  try {
    const topLevelEntries = fs.readdirSync(rootPath, { withFileTypes: true })

    const filteredTopLevelEntries = topLevelEntries
      .filter(entry => {
        const entryRelativePath = entry.name
        // Normalize path for consistent matching (especially on Windows)
        const normalizedEntryRelativePath = entryRelativePath.replace(/\\/g, "/")

        // Check against structure-specific ignores (HARDCODED + outputFilename)
        // AND against .gitignore rules.
        return (
          !structureSpecificIgnores.ignores(normalizedEntryRelativePath) &&
          !gitignoreRules.ignores(normalizedEntryRelativePath)
        )
      })
      .sort((a, b) => {
        // Sort entries: directories first, then files, then alphabetically
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
        const subDirPath = path.join(rootPath, entry.name)
        try {
          const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true })

          const filteredSubEntries = subEntries
            .filter(subEntry => {
              // Construct the path relative to the project root (e.g., src/utils.ts)
              const subEntryRelativePath = path.join(entry.name, subEntry.name)
              const normalizedSubEntryRelativePath = subEntryRelativePath.replace(/\\/g, "/")

              return (
                !structureSpecificIgnores.ignores(normalizedSubEntryRelativePath) &&
                !gitignoreRules.ignores(normalizedSubEntryRelativePath)
              )
            })
            .sort((a, b) => {
              // Sort sub-entries similarly
              if (a.isDirectory() && !b.isDirectory()) return -1
              if (!a.isDirectory() && b.isDirectory()) return 1
              return a.name.localeCompare(b.name)
            })

          filteredSubEntries.forEach((subEntry, subIndex) => {
            const isLastSubEntry = subIndex === filteredSubEntries.length - 1
            const subConnector = isLastSubEntry ? "└── " : "├── "
            // Determine indentation based on whether the parent entry was the last one
            const indent = isLastEntry ? "    " : "│   "
            const subEntryDisplayName = subEntry.name + (subEntry.isDirectory() ? "/" : "")
            structure.push(`${indent}${subConnector}${subEntryDisplayName}`)
            // Note: This structure rendering is currently 2 levels deep.
            // For a fully recursive structure, a helper function would be more suitable.
          })
        } catch (readError) {
          // Handle errors reading subdirectories (e.g., permission issues)
          const indent = isLastEntry ? "    " : "│   "
          structure.push(`${indent}└── [Error reading directory: ${entry.name}]`)
        }
      }
    })
  } catch (rootReadError) {
    // Handle errors reading the root project directory
    structure.push(`└── [Error reading project root: ${(rootReadError as Error).message}]`)
  }

  return structure.join("\n")
}

export function displaySummary(filePath: string, fileCount: number, totalLines: number, fileSize: number): void {
  // Explicitly void return type
  console.log(chalk.bold("\n--- Summary ---"))
  console.log(chalk.green(`✔ Processed ${chalk.bold(fileCount.toString())} files.`))
  console.log(`  Total lines written: ${chalk.bold(totalLines.toString())}`)
  console.log(`  Output file: ${chalk.cyan(path.resolve(filePath))}`) // Use path.resolve for absolute path
  console.log(`  File size: ${chalk.bold(formatFileSize(fileSize))}`)
  console.log(chalk.bold("---------------"))
}
