import React from 'react'
import { connect } from 'redux-bundler-react'
import Header from './header/Header'

// TODO: show errors
// TODO: home icon is ugh https://github.com/ipfs-shipyard/ipfs-css/pull/28
// TODO: choose conn when disconnected
// TODO: add loading/thinkking state

class Menubar extends React.Component {
  componentDidMount () {
    this.props.doIpfsStartListening()
    this.props.doSettingsStartListening()

    // ipcRenderer.on('peersCount', (_, count) => this.setState({ peers: count }))
  }

  render () {
    const { route: Page } = this.props

    return (
      <div className='flex flex-column h-100 overflow-hidden sans-serif'>
        <Header />

        <div className='overflow-auto'>
          <Page />
        </div>
      </div>
    )
  }
}

export default connect(
  'selectRoute',
  'doIpfsStartListening',
  'doSettingsStartListening',
  Menubar
)
