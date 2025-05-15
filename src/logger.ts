import chalk from "chalk"

type Logger = {
  log: (...args: any[]) => void
  info: (message: string) => void
  warn: (message: string) => void
  error: (message: string, error?: any) => void
  success: (message: string) => void
}

function createLogger(options: { silent: boolean } = { silent: false }): Logger {
  const { silent } = options
  
  return {
    log: (...args: any[]) => {
      if (!silent) console.log(...args)
    },
    info: (message: string) => {
      if (!silent) console.log(chalk.blue(`ℹ ${message}`))
    },
    warn: (message: string) => console.warn(chalk.yellow(`⚠ ${message}`)),
    error: (message: string, error?: any) => {
      console.error(chalk.red(`✖ ${message}`))
      if (error && (error instanceof Error || typeof error === "string")) console.error(chalk.red(error.toString()))
      else if (error) console.error(chalk.red(JSON.stringify(error)))
    },
    success: (message: string) => console.log(chalk.green(`✔ ${message}`)),
  }
}

export { createLogger, type Logger }
