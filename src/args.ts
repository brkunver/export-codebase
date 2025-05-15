import minimist from "minimist"
import { DEFAULT_OUTPUT_FILENAME } from "./constants.ts"
import { displayHelp } from "./help.ts"

export type ProgramArgs = {
  outputFilename: string
  silent: boolean
  includeHidden: boolean
}

export async function parseArgs(): Promise<ProgramArgs | null> {
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
    return null
  }

  return {
    outputFilename: argv.output || DEFAULT_OUTPUT_FILENAME,
    silent: argv.silent || false,
    includeHidden: argv["include-hidden"] || false,
  }
}
