import {clipboard, ipcMain, globalShortcut} from 'electron'
import { store, logger } from '../../utils'

const settingsOption = 'screenshotShortcut'
const shortcut = 'CommandOrControl+Alt+S'

function makeScreenshotDir (opts) {
  const {ipfs} = opts

  return new Promise((resolve, reject) => {
    ipfs().files.stat('/screenshots')
      .then(resolve)
      .catch(() => {
        ipfs().files.mkdir('/screenshots')
          .then(resolve)
          .catch(reject)
      })
  })
}

function handleScreenshot (opts) {
  let {ipfs, send} = opts

  return (event, image) => {
    let base64Data = image.replace(/^data:image\/png;base64,/, '')

    logger.info('Screenshot taken')

    if (!ipfs()) {
      logger.info('Daemon not running. Aborting screenshot upload.')
      return
    }

    const path = `/screenshots/${new Date().toISOString()}.png`
    const content = Buffer.from(base64Data, 'base64')

    makeScreenshotDir(opts)
      .then(() => ipfs().files.write(path, content, {create: true}))
      .then(() => ipfs().files.stat(path))
      .then((res) => {
        const url = `https://ipfs.io/ipfs/${res.hash}`
        clipboard.writeText(url)
        send('files-updated')
        logger.info('Screenshot uploaded', {path: path})
      })
      .catch(e => { logger.error(e.stack) })
  }
}

export default function (opts) {
  let {send} = opts

  let activate = (value, oldValue) => {
    if (value === oldValue) return

    if (value === true) {
      globalShortcut.register(shortcut, () => {
        logger.info('Taking Screenshot')
        send('screenshot')
      })
      logger.info('Screenshot shortcut enabled')
    } else {
      globalShortcut.unregister(shortcut)
      logger.info('Screenshot shortcut disabled')
    }
  }

  activate(store.get(settingsOption))
  store.onDidChange(settingsOption, activate)
  ipcMain.on('screenshot', handleScreenshot(opts))
}
