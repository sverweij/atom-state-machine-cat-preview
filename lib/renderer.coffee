smcat = null # Defer until used

exports.render = (pScript='', pCallback) ->
  smcat ?= require 'state-machine-cat'

  lOptions =
    inputType  : 'smcat'
    outputType : 'svg'
    engine     : atom.config.get('state-machine-cat-preview.layoutEngine') or 'dot'

  smcat.render pScript, lOptions, pCallback
