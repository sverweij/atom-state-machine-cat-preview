'use babel'

import url from 'url'
import fs from 'fs-plus'

let StateMachineCatPreviewView = null // Defer until used

function createStateMachineCatPreviewView (state) {
  if (StateMachineCatPreviewView === null) {
    StateMachineCatPreviewView = require('./state-machine-cat-preview-view')
  }
  return new StateMachineCatPreviewView(state)
}

function isStateMachineCatPreviewView (object) {
  if (StateMachineCatPreviewView === null) {
    StateMachineCatPreviewView = require('./state-machine-cat-preview-view')
  }
  return object instanceof StateMachineCatPreviewView
}

module.exports = {
  deserialize (pState) {
    return createStateMachineCatPreviewView(pState)
  },
  activate () {
    atom.deserializers.add({
      name: 'StateMachineCatPreviewView',
      deserialize (state) {
        if (state.editorId || fs.isFileSync(state.filePath)) {
          return createStateMachineCatPreviewView(state)
        }
      }
    })
    atom.commands.add('atom-workspace', {
      'state-machine-cat-preview:toggle': () => this.toggle()
    })

    return atom.workspace.addOpener(function (uriToOpen) {
      let host, pathname, protocol
      try {
        ({ protocol, host, pathname } = new url.URL(uriToOpen))
      } catch (error) {
        return
      }
      if (protocol !== 'state-machine-cat-preview:') {
        return
      }
      try {
        if (pathname) {
          pathname = decodeURI(pathname)
        }
      } catch (error) {
        return
      }
      if (host === 'editor') {
        return createStateMachineCatPreviewView({
          editorId: pathname.substring(1)
        })
      } else {
        return createStateMachineCatPreviewView({
          filePath: pathname
        })
      }
    })
  },
  isActionable () {
    if (isStateMachineCatPreviewView(atom.workspace.getActivePaneItem())) {
      atom.workspace.destroyActivePaneItem()
      return
    }
    const editor = atom.workspace.getActiveTextEditor()
    if (editor === null) {
      return
    }
    const grammars = ['source.smcat']
    if (!grammars.includes(editor.getGrammar().scopeName)) {
      return null
    }
    return editor
  },
  toggle () {
    let editor
    if (!(editor = this.isActionable())) {
      return
    }
    if (!this.removePreviewForEditor(editor)) {
      return this.addPreviewForEditor(editor)
    }
  },
  uriForEditor (editor) {
    return `state-machine-cat-preview://editor/${editor.id}`
  },
  removePreviewForEditor (editor) {
    const uri = this.uriForEditor(editor)
    const previewPane = atom.workspace.paneForURI(uri)

    if (previewPane) {
      previewPane.destroyItem(previewPane.itemForURI(uri))
      return true
    } else {
      return false
    }
  },
  addPreviewForEditor (editor) {
    const uri = this.uriForEditor(editor)
    const previousActivePane = atom.workspace.getActivePane()
    const options = {
      searchAllPanes: true
    }

    if (atom.config.get('state-machine-cat-preview.openPreviewInSplitPane')) {
      options.split = atom.config.get('state-machine-cat-preview.directionToSplitPreviewPaneIn') || 'right'
    }
    return atom.workspace.open(uri, options).then(function (pStateMachineCatPreviewView) {
      if (isStateMachineCatPreviewView(pStateMachineCatPreviewView)) {
        previousActivePane.activate()
      }
    })
  }
}

/* global atom */
/* eslint consistent-return: 0, no-eq-null: 0, eqeqeq: 1, one-var: 0, init-declarations: 0 */
