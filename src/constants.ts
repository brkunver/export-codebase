const DEFAULT_OUTPUT_FILENAME = "project.txt"

const HARDCODED_IGNORES = [
  "node_modules/**",
  "node_modules",
  ".git",
  ".git/**",
  ".env",
  ".env.*",
  "!.env.example", // Keep .env.example if it exists
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
  "dist/**",
  "dist",
  "build/**",
  "build",
  "out/**",
  "out",
  "coverage/**",
  "coverage",
  "target/**", // Rust build artifacts
  "target",
  "coverage.out", // Go coverage output
  "Cargo.lock", // Rust lockfile (consistent with other lockfiles)
  "go.sum", // Go checksum file
  "*.log",
  ".DS_Store",
  "Thumbs.db",
]

const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".bmp",
  ".tiff",
  ".webp",
  ".svg",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".mp4",
  ".avi",
  ".mov",
  ".wmv",
  ".mkv",
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".zip",
  ".tar",
  ".gz",
  ".rar",
  ".7z",
  ".iso",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".app",
  ".dmg",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".eot",
  ".wasm",
  ".cur",
  ".ico",
  ".jar",
  ".bin",
  ".img",
  ".o", // Object files (C/C++/Rust)
  ".a", // Static archives (C/C++/Rust/Go)
  ".rlib", // Rust library artifacts
  ".rmeta", // Rust metadata artifacts
])

// Files larger than this (in bytes) are skipped — too large to be useful as text context.
const MAX_FILE_SIZE_BYTES = 1024 * 1024 // 1 MB

export { DEFAULT_OUTPUT_FILENAME, HARDCODED_IGNORES, BINARY_EXTENSIONS, MAX_FILE_SIZE_BYTES }
