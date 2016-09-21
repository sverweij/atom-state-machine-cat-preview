url      = require 'url'
fs       = require 'fs-plus'
path     = require 'path'
renderer = null

SmCatPreviewView = null # Defer until used

createSmCatPreviewView = (state) ->
  SmCatPreviewView ?= require './state-machine-cat-preview-view'
  new SmCatPreviewView(state)

isSmCatPreviewView = (object) ->
  SmCatPreviewView ?= require './state-machine-cat-preview-view'
  object instanceof SmCatPreviewView

module.exports =
  config:
    liveUpdate:
      type: 'boolean'
      default: true
      order: 1
      description: 'Re-render the preview as the contents of the source changes, without requiring the source buffer to be saved. If disabled, the preview is re-rendered only when the buffer is saved to disk.'
    openPreviewInSplitPane:
      type: 'boolean'
      default: true
      order: 2
      description: 'Open the preview in a split pane. If disabled, the preview is opened in a new tab in the same pane.'
    layoutEngine:
      type: 'string'
      default: 'dot'
      order: 3
      description:
        """
          The engine smcat uses to layout the diagram. **dot** delivers the
          best results.

          In some edge cases other engines perform better. Note that
          only _dot_, _fdp_ and _osage_ understand composite state machines.
        """
      # declared localy instead of from smcat.getAllowedValues to prevent a startup time penalty
      enum: ['dot', 'circo', 'fdp', 'neato', 'osage', 'twopi']

  activate: ->
    atom.deserializers.add
      name: 'SmCatPreviewView'
      deserialize: (state) ->
        if state.editorId or fs.isFileSync(state.filePath)
          createSmCatPreviewView(state)

    atom.commands.add 'atom-workspace',
      'state-machine-cat-preview:toggle': =>
        @toggle()

    # previewFile = @previewFile.bind(this)
    # atom.commands.add '.tree-view .file .name[data-name$=\\.smcat]', 'state-machine-cat-preview:preview-file', previewFile

    atom.workspace.addOpener (uriToOpen) ->
      try
        {protocol, host, pathname} = url.parse(uriToOpen)
      catch error
        return

      return unless protocol is 'state-machine-cat-preview:'

      try
        pathname = decodeURI(pathname) if pathname
      catch error
        return

      if host is 'editor'
        createSmCatPreviewView(editorId: pathname.substring(1))
      else
        createSmCatPreviewView(filePath: pathname)

  isActionable: ->
    if isSmCatPreviewView(atom.workspace.getActivePaneItem())
      atom.workspace.destroyActivePaneItem()
      return

    editor = atom.workspace.getActiveTextEditor()
    return unless editor?

    grammars = [
      'source.smcat'
    ]
    return unless editor.getGrammar().scopeName in grammars

    return editor

  toggle: ->
    return unless editor = @isActionable()
    @addPreviewForEditor(editor) unless @removePreviewForEditor(editor)

  uriForEditor: (editor) ->
    "state-machine-cat-preview://editor/#{editor.id}"

  removePreviewForEditor: (editor) ->
    uri = @uriForEditor(editor)
    previewPane = atom.workspace.paneForURI(uri)
    if previewPane?
      previewPane.destroyItem(previewPane.itemForURI(uri))
      true
    else
      false

  addPreviewForEditor: (editor) ->
    uri = @uriForEditor(editor)
    previousActivePane = atom.workspace.getActivePane()
    options =
      searchAllPanes: true
    if atom.config.get('state-machine-cat-preview.openPreviewInSplitPane')
      options.split = 'right'
    atom.workspace.open(uri, options).then (SMCatPreviewView) ->
      if isSmCatPreviewView(SMCatPreviewView)
        previousActivePane.activate()

  # previewFile: ({target}) ->
  #   filePath = target.dataset.path
  #   return unless filePath
  #
  #   for editor in atom.workspace.getTextEditors() when editor.getPath() is filePath
  #     @addPreviewForEditor(editor)
  #     return
  #
  #   atom.workspace.open "state-machine-cat-preview://#{encodeURI(filePath)}", searchAllPanes: true
