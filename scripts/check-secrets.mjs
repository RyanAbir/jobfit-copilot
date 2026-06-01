import { promises as fs } from "node:fs";
import path from "node:path";

const ROOT_DIR = process.cwd();

const EXCLUDED_DIRS = new Set([
  "node_modules",
  ".next",
  ".git",
  ".vercel",
  "coverage",
  "dist",
  "build",
]);

const EXCLUDED_FILES = new Set([
  ".env.example",
  "README.md",
  "PROJECT_STATUS.md",
  "pnpm-lock.yaml",
  ".env.local",
  "architecture.md",
  "development_tasks.md",
]);

const SECRET_PATTERNS = [
  { name: "GEMINI_API_KEY", regex: /GEMINI_API_KEY\s*=\s*[^\s"'`#][^\r\n]*/ },
  { name: "NVIDIA_API_KEY", regex: /NVIDIA_API_KEY\s*=\s*[^\s"'`#][^\r\n]*/ },
  {
    name: "OPENROUTER_API_KEY",
    regex: /OPENROUTER_API_KEY\s*=\s*[^\s"'`#][^\r\n]*/,
  },
  {
    name: "SUPABASE_SERVICE_ROLE_KEY",
    regex: /SUPABASE_SERVICE_ROLE_KEY\s*=\s*[^\s"'`#][^\r\n]*/,
  },
  { name: "nvapi", regex: /nvapi-[A-Za-z0-9_-]{10,}/ },
  { name: "sk", regex: /sk-[A-Za-z0-9_-]{10,}/ },
  { name: "eyJ", regex: /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
];

async function walk(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.has(entry.name)) {
        continue;
      }

      files.push(...(await walk(absolutePath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (EXCLUDED_FILES.has(entry.name)) {
      continue;
    }

    files.push(absolutePath);
  }

  return files;
}

function getMatchedPatternNames(content) {
  const matched = [];

  for (const pattern of SECRET_PATTERNS) {
    if (pattern.regex.test(content)) {
      matched.push(pattern.name);
    }
  }

  return matched;
}

async function main() {
  const files = await walk(ROOT_DIR);
  const findings = [];

  for (const filePath of files) {
    let content;

    try {
      content = await fs.readFile(filePath, "utf8");
    } catch {
      continue;
    }

    const matchedPatternNames = getMatchedPatternNames(content);
    if (matchedPatternNames.length === 0) {
      continue;
    }

    const relativePath = path.relative(ROOT_DIR, filePath);
    findings.push({
      file: relativePath || filePath,
      patterns: matchedPatternNames,
    });
  }

  if (findings.length > 0) {
    for (const finding of findings) {
      for (const patternName of finding.patterns) {
        console.error(`${finding.file}: ${patternName}`);
      }
    }

    process.exitCode = 1;
    return;
  }

  console.log("No potential secrets found.");
  process.exitCode = 0;
}

main().catch((error) => {
  console.error("Secret scan failed.");
  if (error instanceof Error && error.message) {
    console.error(error.message);
  }
  process.exitCode = 1;
});
