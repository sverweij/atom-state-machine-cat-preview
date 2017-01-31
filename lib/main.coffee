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
    useGraphvizCommandLine:
      type: 'boolean'
      default: false
      order: 3
      description: '**Experimental** Keep unchecked when in doubt.<br><br>- Checked: state-machine-cat-preview will use the command line version of GraphViz dot. For this to work GraphViz has to be installed on your machine, and it has to be on your path.<br>- Unchecked: state-machine-cat-preview will use viz.js for rendering.'
    GraphvizPath:
      type: 'string'
      default: ''
      order: 4
      description: '**Experimental** If you use the command line version of GraphViz, and GraphViz is not on your _path_, you can use this to specify where to find the executable (including the name of the executable e.g. `/Users/superman/bin/dot`).<br><br>Leave empty when it\'s on your path.'
    layoutEngine:
      type: 'string'
      default: 'dot'
      order: 5
      description:
        """
          The engine smcat uses to layout the diagram. **dot** delivers the
          best results.

          In some edge cases other engines perform better. Note that
          only _dot_, _fdp_ and _osage_ understand composite state machines.
        """
      # declared localy instead of from smcat.getAllowedValues to prevent a startup time penalty
      enum: ['dot', 'circo', 'fdp', 'neato', 'osage', 'twopi']

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
