#!/usr/bin/env node
const { execSync } = require('child_process')

function gitOutput(command) {
  try {
    return execSync(command, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
      shell: true,
    }).trim()
  } catch {
    return null
  }
}

function main(env = process.env) {
  const currentCommit = env.GIT_COMMIT_SHA || gitOutput('git rev-parse HEAD') || '-'
  const deploymentUrl = env.VERCEL_DEPLOYMENT_URL || env.TRAINOMICS_QA_BASE_URL || 'https://your-deployment-url.vercel.app'

  console.log('Hockey pilot deployment commit helper')
  console.log(`Current evidence commit: ${currentCommit}`)
  console.log(`Deployment URL: ${deploymentUrl}`)
  console.log('')
  console.log('Use the Vercel deployment details page to confirm the deployment commit.')
  console.log('You can also inspect the deployment with:')
  console.log(`vercel inspect ${deploymentUrl}`)
  console.log('')
  console.log('Then run invite evidence with:')
  console.log(`HOCKEY_PILOT_TARGET_COMMIT_SHA="${currentCommit}"`)
}

if (require.main === module) {
  main()
}

module.exports = {
  main,
}
