/* eslint-disable no-console */
const fs = require('fs')
const path = require('path')

function walk(dir) {
  /** @type {string[]} */
  let out = []
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) out = out.concat(walk(p))
    else out.push(p)
  }
  return out
}

function hasLoggerConsoleImport(src) {
  return (
    src.includes("from '@/lib/logger-console'") ||
    src.includes('from "@/lib/logger-console"')
  )
}

function findImportInsertionIndex(lines) {
  let i = 0
  let inImport = false
  let insertAt = 0

  while (i < lines.length) {
    const trimmed = lines[i].trim()

    // Skip leading comments/blank lines before imports
    if (
      !inImport &&
      (trimmed === '' ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('/*') ||
        trimmed.startsWith('*'))
    ) {
      i++
      insertAt = i
      continue
    }

    // Start of an import declaration
    if (!inImport && /^import\s/.test(trimmed)) {
      inImport = true
    }

    if (inImport) {
      // Import declaration ends on the line that contains the module specifier
      if (
        /\bfrom\s+['"][^'"]+['"];?$/.test(trimmed) ||
        /^import\s+['"][^'"]+['"];?$/.test(trimmed)
      ) {
        inImport = false
        insertAt = i + 1
      }
      i++
      continue
    }

    // First non-import code line
    break
  }

  return insertAt
}

function ensureImport(src, names) {
  if (!names.length) return src
  if (hasLoggerConsoleImport(src)) return src

  const importLine = `import { ${names.join(', ')} } from '@/lib/logger-console'`
  const lines = src.split(/\r?\n/)
  const insertAt = findImportInsertionIndex(lines)
  lines.splice(insertAt, 0, importLine)

  return lines.join('\n')
}

function main() {
  const apiDir = path.join(process.cwd(), 'app', 'api')
  const files = walk(apiDir).filter((f) => f.endsWith('route.ts'))

  let changedFiles = 0

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8')
    if (!/\bconsole\.(log|warn|error)\(/.test(original)) continue

    const needsDebug = /\bconsole\.log\(/.test(original)
    const needsWarn = /\bconsole\.warn\(/.test(original)
    const needsError = /\bconsole\.error\(/.test(original)

    const names = []
    if (needsDebug) names.push('logDebug')
    if (needsWarn) names.push('logWarn')
    if (needsError) names.push('logError')

    let next = original
      .replace(/\bconsole\.log\(/g, 'logDebug(')
      .replace(/\bconsole\.warn\(/g, 'logWarn(')
      .replace(/\bconsole\.error\(/g, 'logError(')

    next = ensureImport(next, names)

    if (next !== original) {
      fs.writeFileSync(file, next, 'utf8')
      changedFiles++
    }
  }

  console.log(`Updated ${changedFiles} files.`)
}

main()


