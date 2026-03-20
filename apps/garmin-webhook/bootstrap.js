require('ts-node').register({
  transpileOnly: true,
  project: 'tsconfig.json',
  compilerOptions: {
    module: 'commonjs',
    moduleResolution: 'node',
  },
})

require('tsconfig-paths/register')
require('./server.ts')
