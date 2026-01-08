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

function rel(p) {
  return p.split(path.sep).join('/')
}

const AUTH_RE =
  /(getCurrentUser\(|requireAuth\(|requireCoachAuth\(|requireAthleteAuth\(|requireCoach\(|requireAthlete\(|requireAdmin\(|requireRole\(|supabase\.auth\.getUser\(|createClient\()/
const CAN_ACCESS_RE = /\bcanAccess[A-Za-z0-9_]*\(/g
const ID_WHERE_RE = /where:\s*\{\s*id\s*[,}]/g

function main() {
  const apiDir = path.join(process.cwd(), 'app', 'api')
  const files = walk(apiDir).filter((f) => f.endsWith('route.ts'))
  const dynamic = files.filter((f) => f.includes('['))

  /** @type {string[]} */
  const dynamicNoAuth = []

  /** @type {string[]} */
  const suspicious = []

  for (const file of dynamic) {
    const src = fs.readFileSync(file, 'utf8')
    const hasAuth = AUTH_RE.test(src)
    const hasCanAccess = CAN_ACCESS_RE.test(src)
    const hasIdWhere = ID_WHERE_RE.test(src)

    // reset global regex state
    CAN_ACCESS_RE.lastIndex = 0
    ID_WHERE_RE.lastIndex = 0

    if (!hasAuth) {
      dynamicNoAuth.push(rel(path.relative(process.cwd(), file)))
      continue
    }

    // Heuristic: if it filters by id and never mentions user.id/coachId or athleteAccount.clientId,
    // it's worth manually reviewing for IDOR risk.
    const mentionsUserId = src.includes('user.id') || src.includes('coachId: user.id') || src.includes('testerId: user.id')
    const mentionsAthleteClientId = src.includes('athleteAccount.clientId') || src.includes('athleteClientId')
    const mentionsCanAccess = hasCanAccess

    if (hasIdWhere && !mentionsCanAccess && !mentionsUserId && !mentionsAthleteClientId) {
      suspicious.push(rel(path.relative(process.cwd(), file)))
    }
  }

  console.log('DYNAMIC_ROUTE_COUNT', dynamic.length)
  console.log('DYNAMIC_NO_AUTH_COUNT', dynamicNoAuth.length)
  if (dynamicNoAuth.length) {
    console.log('\nDYNAMIC_NO_AUTH_FILES')
    console.log(dynamicNoAuth.join('\n'))
  }
  console.log('\nSUSPICIOUS_COUNT', suspicious.length)
  if (suspicious.length) {
    console.log('\nSUSPICIOUS_FILES')
    console.log(suspicious.join('\n'))
  }
}

main()


