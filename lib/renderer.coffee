stategenny    = null # Defer until used

exports.render = (pScript='', pCallback) ->
  stategenny ?= require 'stategenny'

  lOptions =
    inputType  : 'stategenny'
    outputType : 'svg'

  stategenny.render pScript, lOptions, pCallback
