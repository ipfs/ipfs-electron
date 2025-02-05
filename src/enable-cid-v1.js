const store = require('./common/store')
const getCtx = require('./context')
const logger = require('./common/logger')

module.exports = async function () {
  const shouldUseCIDv1 = store.get('ipfsConfig.useCIDv1', true)

  if (shouldUseCIDv1) {
    logger.info('[enable-cid-v1]: Attempting to enable CID version 1 for files')
    const ctx = getCtx()
    const getIpfsd = await ctx.getProp('getIpfsd')
    /** @type {import('ipfsd-ctl').Controller|null} */
    const ipfsd = await getIpfsd()
    if (!ipfsd) {
      logger.error('[enable-cid-v1]: Could not get IPFS daemon controller')
      return
    }
    logger.info('[enable-cid-v1]: Enabling CID version 1 for files')
    try {
      // @ts-expect-error - ipfsd.api is not typed properly
      await ipfsd.api.files.chcid('/', { cidVersion: 1 })
      logger.info('[enable-cid-v1]: CID version 1 enabled for files')
    } catch (e) {
      logger.error('[enable-cid-v1]: Failed to enable CID version 1 for files', e)
    }
  }
}
