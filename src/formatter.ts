import chalk from "chalk"
import path from "path"

export function formatFileSize(fileSizeInBytes: number): string {
  if (fileSizeInBytes < 1024) {
    return `${fileSizeInBytes} B`
  } else if (fileSizeInBytes < 1024 * 1024) {
    return `${(fileSizeInBytes / 1024).toFixed(2)} KB`
  } else {
    return `${(fileSizeInBytes / (1024 * 1024)).toFixed(2)} MB`
  }
}

export function displaySummary(
  filePath: string,
  fileCount: number,
  totalLines: number,
  fileSize: number
) {
  console.log(chalk.bold("\n--- Summary ---"))
  console.log(chalk.green(`✔ Processed ${chalk.bold(fileCount.toString())} files.`))
  console.log(`  Total lines written: ${chalk.bold(totalLines.toString())}`)
  console.log(`  Output file: ${chalk.cyan(path.resolve(filePath))}`)
  console.log(`  File size: ${chalk.bold(formatFileSize(fileSize))}`)
  console.log(chalk.bold("---------------"))
}
