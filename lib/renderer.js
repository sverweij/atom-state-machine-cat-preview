'use babel'

let smcat = null
let renderGraphVizWithCLI = null

export function render (pScript, pCallback) {
  if (pScript === null) {
    pScript = ''
  }
  if (smcat === null) {
    smcat = require('state-machine-cat')
  }
  const lOptions = {
    inputType: 'smcat',
    outputType: 'svg',
    engine: atom.config.get('state-machine-cat-preview.layoutEngine') || 'dot',
    direction: atom.config.get('state-machine-cat-preview.direction') || 'top-down'
  }
  if (atom.config.get('state-machine-cat-preview.useGraphvizCommandLine')) {
    if (renderGraphVizWithCLI === null) {
      renderGraphVizWithCLI = require('./renderGraphVizWithCLI')
    }
    lOptions.outputType = 'dot'
    try {
      const lDot = smcat.render(pScript, lOptions)
      /* eslint prefer-const:0 */
      let lWrapOptions = {}

      Object.assign(lWrapOptions, lOptions)
      lWrapOptions.outputType = 'svg'
      if ((atom.config.get('state-machine-cat-preview.GraphvizPath'))) {
        lWrapOptions.exec = atom.config.get('state-machine-cat-preview.GraphvizPath')
      }
      renderGraphVizWithCLI(lDot, pCallback, lWrapOptions)
    } catch (pError) {
      pCallback(pError)
    }
  } else {
    try {
      const lSVG = smcat.render(pScript, lOptions)
      pCallback(null, lSVG)
    } catch (pError) {
      pCallback(pError)
    }
  }
}
/* global atom */
