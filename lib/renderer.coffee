smcat   = null
wrapDot = null

exports.render = (pScript='', pCallback) ->
  smcat ?= require 'state-machine-cat'

  lOptions =
    inputType  : 'smcat'
    outputType : 'svg'
    engine     : atom.config.get('state-machine-cat-preview.layoutEngine') or 'dot'

  if atom.config.get('state-machine-cat-preview.useGraphvizCommandLine')
    wrapDot ?= require './wrap-dot'

    lOptions.outputType = 'dot'
    smcat.render pScript, lOptions, (err, dot) ->
      if err
        pCallback err
      else
        lWrapOptions = {}
        Object.assign(lWrapOptions, lOptions)
        lWrapOptions.outputType = 'svg'

        if Boolean atom.config.get('state-machine-cat-preview.GraphvizPath')
          lWrapOptions.exec = atom.config.get('state-machine-cat-preview.GraphvizPath')

        wrapDot.render dot, pCallback, lWrapOptions
  else
    smcat.render pScript, lOptions, pCallback
