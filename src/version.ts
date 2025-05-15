import fs from "fs/promises"
import path from "path"
import { fileURLToPath } from "url"

// Function to load version dynamically for help message
async function getPackageVersion(): Promise<string> {
  try {
    const ownPackageJsonPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "package.json")
    const pkg = JSON.parse(await fs.readFile(ownPackageJsonPath, "utf8"))
    return pkg.version || "N/A"
  } catch (e) {
    return "N/A"
  }
}

export { getPackageVersion }
