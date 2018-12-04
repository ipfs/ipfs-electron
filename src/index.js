import { app, dialog } from 'electron'
import { store, createDaemon, genericError } from './utils'
import startupMenubar from './menubar'
import registerHooks from './hooks'

// Only one instance can run at a time
if (!app.requestSingleInstanceLock()) {
  dialog.showErrorBox(
    'Multiple instances',
    'Sorry, but there can be only one instance of IPFS Desktop running at the same time.'
  )

  // No windows were opened at this time so we don't need to do app.quit()
  process.exit(1)
}

async function run () {
  try {
    await app.whenReady()
  } catch (e) {
    dialog.showErrorBox('Electron could not start', e.stack)
    app.exit(1)
  }

  let config = store.get('config')
  let updateCfg = false

  if (config === null) {
    config = { type: 'go' }
    updateCfg = true
  }

  try {
    // Initial context object
    let ctx = {
      ipfsd: await createDaemon(config)
    }

    // createDaemon has changed the config object,
    // but didn't add the repo variable.
    if (updateCfg) {
      config.path = ctx.ipfsd.repoPath
      store.set('config', config)
    }

    // Initialize windows. These can add properties to context
    await startupMenubar(ctx)

    // Register hooks
    await registerHooks(ctx)
  } catch (e) {
    if (e.message === 'exit') {
      app.exit(1)
    } else {
      genericError(e)
    }
  }
}

run()
