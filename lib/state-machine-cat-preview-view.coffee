path = require 'path'

{Emitter, Disposable, CompositeDisposable, File} = require 'atom'
{$, $$$, ScrollView} = require 'atom-space-pen-views'
_                    = require 'underscore-plus'
fs                   = require 'fs-plus'
uuid                 = null

renderer             = null # Defer until used
errRenderer          = null # Defer until used
svgToRaster          = null # Defer until used
latestKnownEditorId  = null
svgWrapperElementId  = null

module.exports =
class SmCatPreviewView extends ScrollView
  @content: ->
    @div class: 'state-machine-cat-preview native-key-bindings', tabindex: -1

  constructor: ({@editorId, @filePath}) ->
    super
    @emitter = new Emitter
    @disposables = new CompositeDisposable
    @loaded = false
    @svg = null

  attached: ->
    return if @isAttached
    @isAttached = true

    if @editorId?
      @resolveEditor(@editorId)
    else
      if atom.workspace?
        @subscribeToFilePath(@filePath)
      else
        @disposables.add atom.packages.onDidActivateInitialPackages =>
          @subscribeToFilePath(@filePath)

  serialize: ->
    deserializer: 'SmCatPreviewView'
    filePath: @getPath() ? @filePath
    editorId: @editorId

  destroy: ->
    @disposables.dispose()

  onDidChangeTitle: (callback) ->
    @emitter.on 'did-change-title', callback

  onDidChangeModified: (callback) ->
    # No op to suppress deprecation warning
    new Disposable

  onDidChangeSMCat: (callback) ->
    @emitter.on 'did-change-smcat', callback

  subscribeToFilePath: (filePath) ->
    @file = new File(filePath)
    @emitter.emit 'did-change-title'
    @handleEvents()
    @renderSMCat()

  resolveEditor: (editorId) ->
    resolve = =>
      @editor = @editorForId(editorId)

      if @editor?
        @emitter.emit 'did-change-title' if @editor?
        @handleEvents()
        @renderSMCat()
      else
        # The editor this preview was created for has been closed so close
        # this preview since a preview cannot be rendered without an editor
        atom.workspace?.paneForItem(this)?.destroyItem(this)

    if atom.workspace?
      resolve()
    else
      @disposables.add atom.packages.onDidActivateInitialPackages(resolve)

  editorForId: (editorId) ->
    for editor in atom.workspace.getTextEditors()
      return editor if editor.id?.toString() is editorId.toString()
    null

  handleEvents: ->
    @disposables.add atom.grammars.onDidAddGrammar => _.debounce((=> @renderSMCat()), 250)
    @disposables.add atom.grammars.onDidUpdateGrammar _.debounce((=> @renderSMCat()), 250)

    atom.commands.add @element,
      'core:move-up': =>
        @scrollUp()
      'core:move-down': =>
        @scrollDown()
      'core:save-as': (event) =>
        event.stopPropagation()
        @saveAs('svg')
      'state-machine-cat-preview:save-as-png': (event) =>
        event.stopPropagation()
        @saveAs('png')
      'core:copy': (event) =>
        event.stopPropagation() if @copyToClipboard()
      'state-machine-cat-preview:zoom-in': =>
        zoomLevel = parseFloat(@css('zoom')) or 1
        @css('zoom', zoomLevel + .1)
      'state-machine-cat-preview:zoom-out': =>
        zoomLevel = parseFloat(@css('zoom')) or 1
        @css('zoom', zoomLevel - .1)
      'state-machine-cat-preview:reset-zoom': =>
        @css('zoom', 1)

    changeHandler = =>
      @renderSMCat()

      # TODO: Remove paneForURI call when ::paneForItem is released
      pane = atom.workspace.paneForItem?(this) ? atom.workspace.paneForURI(@getURI())
      if pane? and pane isnt atom.workspace.getActivePane()
        pane.activateItem(this)

    if @file?
      @disposables.add @file.onDidChange(changeHandler)
    else if @editor?
      @disposables.add @editor.getBuffer().onDidStopChanging ->
        changeHandler() if atom.config.get 'state-machine-cat-preview.liveUpdate'
      @disposables.add @editor.onDidChangePath => @emitter.emit 'did-change-title'
      @disposables.add @editor.getBuffer().onDidSave ->
        changeHandler() unless atom.config.get 'state-machine-cat-preview.liveUpdate'
      @disposables.add @editor.getBuffer().onDidReload ->
        changeHandler() unless atom.config.get 'state-machine-cat-preview.liveUpdate'

  renderSMCat: ->
    @showLoading() unless @loaded
    @getSource().then (source) => @renderSMCatText(source) if source?

  getSource: ->
    if @file?.getPath()
      @file.read()
    else if @editor?
      Promise.resolve(@editor.getText())
    else
      Promise.resolve(null)

  renderSMCatText: (text) ->
    uuid ?= require 'node-uuid'
    # should be unique within atom to prevent duplicate id's within the
    # editor (which renders the stuff into the first element only)
    #
    # should be unique altogether because upon export they might be placed on the
    # same page together, and twice the same id is bound to have undesired
    # effects
    #
    # It's good enough to do this once for each editor instance
    if !svgWrapperElementId? or latestKnownEditorId != @editorId
      svgWrapperElementId = uuid.v4()
      latestKnownEditorId = @editorId

    @svg = null # HACK
    renderer ?= require "./renderer"
    renderer.render text, (error, svg) =>
      if error
        @showError(error)
      else
        @loading = false
        @loaded = true
        @svg = svg # HACK
        @html("<div id=#{svgWrapperElementId}>#{svg}</div>")
        @emitter.emit 'did-change-smcat'
        @originalTrigger('state-machine-cat-preview:smcat-changed')

  getSVG: (callback)->
    @getSource().then (source) ->
      return unless source?

      renderer.render source, callback

  getTitle: ->
    if @file?
      "#{path.basename(@getPath())} preview"
    else if @editor?
      "#{@editor.getTitle()} preview"
    else
      "SM Cat Preview"

  getIconName: ->
    "SMCat"

  getURI: ->
    if @file?
      "state-machine-cat-preview://#{@getPath()}"
    else
      "state-machine-cat-preview://editor/#{@editorId}"

  getPath: ->
    if @file?
      @file.getPath()
    else if @editor?
      @editor.getPath()

  getGrammar: ->
    @editor?.getGrammar()

  getDocumentStyleSheets: -> # This function exists so we can stub it
    document.styleSheets

  showError: (error) ->
    errRenderer ?= require './err-renderer'

    @getSource().then (source) =>
      @html(errRenderer.renderError source, error.location, error.message) if source?

  showLoading: ->
    @loading = true
    @html $$$ ->
      @div class: 'smcat-spinner', 'Rendering state chart\u2026'

  copyToClipboard: ->
    return false if @loading or not @svg

    atom.clipboard.write(@svg)

    true

  saveAs: (pOutputType) ->
    return if @loading or not @svg

    filePath = @getPath()
    if filePath
      filePath = path.join(
        path.dirname(filePath),
        path.basename(filePath, path.extname(filePath)),
      ).concat('.').concat(pOutputType)
    else
      filePath = 'untitled.'.concat(pOutputType)
      if projectPath = atom.project.getPaths()[0]
        filePath = path.join(projectPath, filePath)

    if outputFilePath = atom.showSaveDialogSync(filePath)
      if 'png' == pOutputType
        svgToRaster ?= require './svg-to-raster'
        # fs.writeFileSync(outputFilePath, svgToRaster.transform @svg)
        svgToRaster.transform @svg, (pResult) ->
          fs.writeFileSync(outputFilePath, pResult)
          atom.workspace.open(outputFilePath)
      else
        fs.writeFileSync(outputFilePath, @svg)
        atom.workspace.open(outputFilePath)

  isEqual: (other) ->
    @[0] is other?[0] # Compare DOM elements
