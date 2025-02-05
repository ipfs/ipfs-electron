const { app } = require('electron')
const Store = require('electron-store')

const logger = require('./logger')

const { fileLogger } = logger

/**
 * @type {import('./types').DesktopPersistentStore}
 */
const defaults = {
  ipfsConfig: {
    path: '',
    flags: [
      '--agent-version-suffix=desktop',
      '--migrate',
      '--enable-gc'
    ]
  },
  language: app.getLocale(),
  experiments: {},
  binaryPath: ''
}

const migrations = {
  '>=0.11.0': store => {
    fileLogger.info('Running migration: >=0.11.0')
    store.delete('version')

    const flags = store.get('ipfsConfig.flags', [])

    if (flags.includes('--migrate=true') || flags.includes('--enable-gc=true')) {
      store.set('ipfsConfig.flags', defaults.ipfsConfig.flags)
    }
  },
  '>0.13.2': store => {
    fileLogger.info('Running migration: >0.13.2')
    const flags = store.get('ipfsConfig.flags', [])
    const automaticGC = store.get('automaticGC', false)
    // ensure checkbox follows cli flag config
    if (flags.includes('--enable-gc') && !automaticGC) {
      store.set('automaticGC', true)
    }
  },
  '>=0.17.0': store => {
    fileLogger.info('Running migration: >=0.17.0')
    let flags = store.get('ipfsConfig.flags', [])

    // make sure version suffix is always present and normalized
    const setVersionSuffix = '--agent-version-suffix=desktop'
    if (!flags.includes(setVersionSuffix)) {
      // remove any custom suffixes, if present
      flags = flags.filter(f => !f.startsWith('--agent-version-suffix='))
      // set /desktop
      flags.push('--agent-version-suffix=desktop')
      store.set('ipfsConfig.flags', flags)
    }
    // merge routing flags into one
    if (flags.includes('--routing') && flags.includes('dhtclient')) {
      flags = flags.filter(f => f !== '--routing').filter(f => f !== 'dhtclient')
      flags.push('--routing=dhtclient')
      store.set('ipfsConfig.flags', flags)
    }
  },
  '>=0.20.6': store => {
    fileLogger.info('Running migration: >=0.20.6')
    let flags = store.get('ipfsConfig.flags', [])

    // use default instead of hard-coded dhtclient
    const dhtClientFlag = '--routing=dhtclient'
    if (flags.includes(dhtClientFlag)) {
      flags = flags.filter(f => f !== dhtClientFlag)
      store.set('ipfsConfig.flags', flags)
    }
  },
  '>=0.39.1': store => {
    fileLogger.info('Running migration: >=0.39.1')
    logger.info('[store]: Migrating to use CID version 1 for files')
    const useCIDv1 = store.get('ipfsConfig.useCIDv1', null)
    if (useCIDv1 === null) {
      // if it's null, it's not set to true or false, so we set it to the new default
      store.safeSet('ipfsConfig.useCIDv1', true)
    }
    // otherwise, it's already set to true or false, so we don't need to do anything
  }
}

/**
 * @extends {Store<import('./types').DesktopPersistentStore>}
 */
class StoreWrapper extends Store {
  constructor (options) {
    super(options)

    /**
     * @template {unknown} R
     * @param {string} key
     * @param {unknown} value
     * @param {() => Promise<R>|R|void} [onSuccessFn]
     * @returns {Promise<R|void>}
     */
    this.safeSet = async function (key, value, onSuccessFn) {
      try {
        this.set(key, value)
        if (typeof onSuccessFn === 'function') {
          try {
            return await onSuccessFn()
          } catch (err) {
            logger.error(`[store.safeSet] Error calling onSuccessFn for '${key}'`, /** @type {Error} */(err))
          }
        }
      } catch (err) {
        logger.error(`[store.safeSet] Could not set store key '${key}' to '${value}'`, /** @type {Error} */(err))
      }
    }
  }
}

const store = new StoreWrapper({
  defaults,
  migrations
})

module.exports = store
