// src/formatter.ts

import chalk from "chalk"
import path from "path"
import fs from "fs"
import { HARDCODED_IGNORES } from "./constants.ts"
import ignore from "ignore"

export function formatFileSize(fileSizeInBytes: number): string {
  if (fileSizeInBytes < 1024) {
    return `${fileSizeInBytes} B`
  } else if (fileSizeInBytes < 1024 * 1024) {
    return `${(fileSizeInBytes / 1024).toFixed(2)} KB`
  } else {
    return `${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

export function generateProjectStructure(rootPath: string): string {
  const structure: string[] = []
  const ig = ignore.default()

  ig.add(HARDCODED_IGNORES)

  structure.push("// Project structure")
  structure.push(`${path.basename(rootPath)}/`)

  try {
    const topLevelEntries = fs.readdirSync(rootPath, { withFileTypes: true })

    const filteredTopLevelEntries = topLevelEntries
      .filter(entry => {
        const entryRelativePath = entry.name
        const normalizedEntryRelativePath = entryRelativePath.replace(/\\/g, "/")
        return !ig.ignores(normalizedEntryRelativePath)
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
        const subDirPath = path.join(rootPath, entry.name)
        try {
          const subEntries = fs.readdirSync(subDirPath, { withFileTypes: true })

          const filteredSubEntries = subEntries
            .filter(subEntry => {
              const subEntryRelativePath = path.join(entry.name, subEntry.name)
              const normalizedSubEntryRelativePath = subEntryRelativePath.replace(/\\/g, "/")
              return !ig.ignores(normalizedSubEntryRelativePath)
            })
            .sort((a, b) => {
              if (a.isDirectory() && !b.isDirectory()) return -1
              if (!a.isDirectory() && b.isDirectory()) return 1
              return a.name.localeCompare(b.name)
            })

          filteredSubEntries.forEach((subEntry, subIndex) => {
            const isLastSubEntry = subIndex === filteredSubEntries.length - 1
            const subConnector = isLastSubEntry ? "└── " : "├── "
            const indent = isLastEntry ? "    " : "│   "
            const subEntryDisplayName = subEntry.name + (subEntry.isDirectory() ? "/" : "")
            structure.push(`${indent}${subConnector}${subEntryDisplayName}`)
          })
        } catch (readError) {
          const indent = isLastEntry ? "    " : "│   "
          structure.push(`${indent}└── [Error reading directory: ${entry.name}]`)
        }
      }
    })
  } catch (rootReadError) {
    structure.push(`└── [Error reading project root: ${(rootReadError as Error).message}]`)
  }

  return structure.join("\n")
}

export function displaySummary(filePath: string, fileCount: number, totalLines: number, fileSize: number) {
  console.log(chalk.bold("\n--- Summary ---"))
  console.log(chalk.green(`✔ Processed ${chalk.bold(fileCount.toString())} files.`))
  console.log(`  Total lines written: ${chalk.bold(totalLines.toString())}`)
  console.log(`  Output file: ${chalk.cyan(path.resolve(filePath))}`)
  console.log(`  File size: ${chalk.bold(formatFileSize(fileSize))}`)
  console.log(chalk.bold("---------------"))
}
