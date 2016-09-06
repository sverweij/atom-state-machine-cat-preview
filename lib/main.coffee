url      = require 'url'
fs       = require 'fs-plus'
path     = require 'path'
renderer = null

StateGennyPreviewView = null # Defer until used

createStateGennyPreviewView = (state) ->
  StateGennyPreviewView ?= require './stategenny-preview-view'
  new StateGennyPreviewView(state)

isStateGennyPreviewView = (object) ->
  StateGennyPreviewView ?= require './stategenny-preview-view'
  object instanceof StateGennyPreviewView

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

  activate: ->
    atom.deserializers.add
      name: 'StateGennyPreviewView'
      deserialize: (state) ->
        if state.editorId or fs.isFileSync(state.filePath)
          createStateGennyPreviewView(state)

    atom.commands.add 'atom-workspace',
      'stategenny-preview:toggle': =>
        @toggle()

    # previewFile = @previewFile.bind(this)
    # atom.commands.add '.tree-view .file .name[data-name$=\\.mscgen]', 'stategenny-preview:preview-file', previewFile

    atom.workspace.addOpener (uriToOpen) ->
      try
        {protocol, host, pathname} = url.parse(uriToOpen)
      catch error
        return

      return unless protocol is 'stategenny-preview:'

      try
        pathname = decodeURI(pathname) if pathname
      catch error
        return

      if host is 'editor'
        createStateGennyPreviewView(editorId: pathname.substring(1))
      else
        createStateGennyPreviewView(filePath: pathname)

  isActionable: ->
    if isStateGennyPreviewView(atom.workspace.getActivePaneItem())
      atom.workspace.destroyActivePaneItem()
      return

    editor = atom.workspace.getActiveTextEditor()
    return unless editor?

    grammars = [
      'source.stategenny'
    ]
    return unless editor.getGrammar().scopeName in grammars

    return editor

  toggle: ->
    return unless editor = @isActionable()
    @addPreviewForEditor(editor) unless @removePreviewForEditor(editor)

  uriForEditor: (editor) ->
    "stategenny-preview://editor/#{editor.id}"

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
    if atom.config.get('stategenny-preview.openPreviewInSplitPane')
      options.split = 'right'
    atom.workspace.open(uri, options).then (mscgenPreviewView) ->
      if isStateGennyPreviewView(mscgenPreviewView)
        previousActivePane.activate()

  # previewFile: ({target}) ->
  #   filePath = target.dataset.path
  #   return unless filePath
  #
  #   for editor in atom.workspace.getTextEditors() when editor.getPath() is filePath
  #     @addPreviewForEditor(editor)
  #     return
  #
  #   atom.workspace.open "stategenny-preview://#{encodeURI(filePath)}", searchAllPanes: true
