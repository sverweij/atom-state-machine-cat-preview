smcat = null # Defer until used

exports.render = (pScript='', pCallback) ->
  smcat ?= require 'state-machine-cat'

  lOptions =
    inputType  : 'smcat'
    outputType : 'svg'

  smcat.render pScript, lOptions, pCallback
