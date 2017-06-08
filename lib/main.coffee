url      = require 'url'
fs       = require 'fs-plus'

StateMachineCatPreviewView = null # Defer until used

createStateMachineCatPreviewView = (state) ->
  StateMachineCatPreviewView ?= require './state-machine-cat-preview-view'
  new StateMachineCatPreviewView(state)

isStateMachineCatPreviewView = (object) ->
  StateMachineCatPreviewView ?= require './state-machine-cat-preview-view'
  object instanceof StateMachineCatPreviewView

module.exports =
  config: require('./config')


  deserialize: (pState) ->
    createStateMachineCatPreviewView pState

  activate: ->
    atom.deserializers.add
      name: 'StateMachineCatPreviewView'
      deserialize: (state) ->
        if state.editorId or fs.isFileSync(state.filePath)
          createStateMachineCatPreviewView(state)

    atom.commands.add 'atom-workspace',
      'state-machine-cat-preview:toggle': =>
        @toggle()

    # previewFile = @previewFile.bind(this)
    # atom.commands.add '.tree-view .file .name[data-name$=\\.smcat]', 'state-machine-cat-preview:preview-file', previewFile

    atom.workspace.addOpener (uriToOpen) ->
      try
        {protocol, host, pathname} = url.parse(uriToOpen)
      catch
        return

      return unless protocol is 'state-machine-cat-preview:'

      try
        pathname = decodeURI(pathname) if pathname
      catch
        return

      if host is 'editor'
        createStateMachineCatPreviewView(editorId: pathname.substring(1))
      else
        createStateMachineCatPreviewView(filePath: pathname)

  isActionable: ->
    if isStateMachineCatPreviewView(atom.workspace.getActivePaneItem())
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
    atom.workspace.open(uri, options).then (pStateMachineCatPreviewView) ->
      if isStateMachineCatPreviewView(pStateMachineCatPreviewView)
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
