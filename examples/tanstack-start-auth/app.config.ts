import { createApp } from 'vinxi'

export default createApp({
  routers: [
    {
      name: 'public',
      type: 'static',
      dir: './public',
    },
    {
      name: 'client',
      type: 'client',
      handler: './app/client.tsx',
      target: 'browser',
      base: '/_build',
    },
    {
      name: 'server',
      type: 'http',
      handler: './app/server.tsx',
      target: 'server',
    },
  ],
})
