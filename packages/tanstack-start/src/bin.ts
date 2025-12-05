#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import {
  SERVER_TEMPLATE,
  CLIENT_TEMPLATE,
  SESSION_TEMPLATE,
  MIDDLEWARE_TEMPLATE,
  TYPES_TEMPLATE,
  CONFIG_TEMPLATE,
} from './cli/templates'

const args = process.argv.slice(2)
const outputDir = args[0] || 'src/auth'

const files = [
  { name: 'server.ts', content: SERVER_TEMPLATE },
  { name: 'client.tsx', content: CLIENT_TEMPLATE },
  { name: 'session.ts', content: SESSION_TEMPLATE },
  { name: 'middleware.ts', content: MIDDLEWARE_TEMPLATE },
  { name: 'types.ts', content: TYPES_TEMPLATE },
  { name: 'config.ts', content: CONFIG_TEMPLATE },
]

async function generate() {
  const targetDir = path.resolve(process.cwd(), outputDir)

  console.log(`Generating auth files in ${targetDir}...`)

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
  }

  for (const file of files) {
    const filePath = path.join(targetDir, file.name)
    fs.writeFileSync(filePath, file.content)
    console.log(`✓ Created ${file.name}`)
  }

  console.log('\nSuccess! Auth files generated.')
  console.log('\nNext steps:')
  console.log('1. Install dependencies:')
  console.log('   npm install @nightmar3/uauth-core')
  console.log('2. Configure auth in your app entry point (e.g. src/app.tsx or src/router.tsx):')
  console.log(`   import { configureAuth } from './${outputDir}/config'`)
  console.log('   configureAuth({ baseURL: "YOUR_AUTH_API_URL", sessionSecret: "YOUR_SECRET" })')
}

generate().catch((err) => {
  console.error('Error generating files:', err)
  process.exit(1)
})
