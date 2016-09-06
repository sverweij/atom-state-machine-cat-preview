path              = require 'path'
fs                = require 'fs-plus'
temp              = require 'temp'
wrench            = require 'wrench'
StateGennyPreviewView = require '../lib/stategenny-preview-view'
{$}               = require 'atom-space-pen-views'

describe "StateGenny preview package", ->
  [workspaceElement, preview] = []

  beforeEach ->
    fixturesPath = path.join(__dirname, 'fixtures')
    tempPath = temp.mkdirSync('atom')
    wrench.copyDirSyncRecursive(fixturesPath, tempPath, forceDelete: true)
    atom.project.setPaths([tempPath])

    jasmine.useRealClock()

    workspaceElement = atom.views.getView(atom.workspace)
    jasmine.attachToDOM(workspaceElement)

    waitsForPromise ->
      atom.packages.activatePackage("stategenny-preview")

    # TODO works well. But not when it's also in the program under test.
    # So now instead wer're having the language-stategenny snippets & grammars
    # included in the package.
    # waitsForPromise ->
    #   require('atom-package-deps').install(require('../package.json').name)

    # waitsForPromise ->
    #   atom.packages.activatePackage('language-stategenny')

  expectPreviewInSplitPane = ->
    runs ->
      expect(atom.workspace.getPanes()).toHaveLength 2

    waitsFor "stategenny preview to be created", ->
      preview = atom.workspace.getPanes()[1].getActiveItem()

    runs ->
      expect(preview).toBeInstanceOf(StateGennyPreviewView)
      expect(preview.getPath()).toBe atom.workspace.getActivePaneItem().getPath()

  describe "when a preview has not been created for the file", ->
    it "displays a stategenny preview in a split pane", ->
      waitsForPromise -> atom.workspace.open("subdir/demo.stategenny")
      runs -> atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'
      expectPreviewInSplitPane()

      runs ->
        [editorPane] = atom.workspace.getPanes()
        expect(editorPane.getItems()).toHaveLength 1
        expect(editorPane.isActive()).toBe true

    describe "when the editor's path does not exist", ->
      it "splits the current pane to the right with a stategenny preview for the file", ->
        waitsForPromise -> atom.workspace.open("new.stategenny")
        runs -> atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'
        expectPreviewInSplitPane()

    describe "when the path contains a space", ->
      it "renders the preview", ->
        waitsForPromise -> atom.workspace.open("subdir/a test with filename spaces.stategenny")
        runs -> atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'
        expectPreviewInSplitPane()

    describe "when the path contains non-ASCII characters", ->
      it "renders the preview", ->
        waitsForPromise -> atom.workspace.open("subdir/序列圖.stategenny")
        runs -> atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'
        expectPreviewInSplitPane()

  describe "when a preview has been created for the file", ->
    beforeEach ->
      waitsForPromise -> atom.workspace.open("subdir/a test with filename spaces.stategenny")
      runs -> atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'
      expectPreviewInSplitPane()

    it "closes the existing preview when toggle is triggered a second time on the editor", ->
      atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'

      [editorPane, previewPane] = atom.workspace.getPanes()
      expect(editorPane.isActive()).toBe true
      expect(previewPane.getActiveItem()).toBeUndefined()

    it "closes the existing preview when toggle is triggered on it and it has focus", ->
      [editorPane, previewPane] = atom.workspace.getPanes()
      previewPane.activate()

      atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'
      expect(previewPane.getActiveItem()).toBeUndefined()

    describe "when the editor is modified", ->
      it "re-renders the preview", ->
        spyOn(preview, 'showLoading')

        mscEditor = atom.workspace.getActiveTextEditor()
        mscEditor.setText "a note a: made in Holland;"

        waitsFor ->
          preview.text().indexOf("a note a: made in Holland;") >= 0

        runs ->
          expect(preview.showLoading).not.toHaveBeenCalled()

      xit "invokes ::onDidChangeMsc listeners", ->
        mscEditor = atom.workspace.getActiveTextEditor()
        preview.onDidChangeMsc(listener = jasmine.createSpy('didChangeMscListener'))

        runs ->
          mscEditor.setText("a note a: made in Holland;")

        waitsFor "::onDidChangeMsc handler to be called", ->
          listener.callCount > 0

      describe "when the preview is in the active pane but is not the active item", ->
        it "re-renders the preview but does not make it active", ->
          mscEditor = atom.workspace.getActiveTextEditor()
          previewPane = atom.workspace.getPanes()[1]
          previewPane.activate()

          waitsForPromise ->
            atom.workspace.open()

          runs ->
            mscEditor.setText("a note a: made in Holland;")

          waitsFor ->
            preview.text().indexOf("a note a: made in Holland;") >= 0

          runs ->
            expect(previewPane.isActive()).toBe true
            expect(previewPane.getActiveItem()).not.toBe preview

      describe "when the preview is not the active item and not in the active pane", ->
        it "re-renders the preview and makes it active", ->
          mscEditor = atom.workspace.getActiveTextEditor()
          [editorPane, previewPane] = atom.workspace.getPanes()
          previewPane.splitRight(copyActiveItem: true)
          previewPane.activate()

          waitsForPromise ->
            atom.workspace.open()

          runs ->
            editorPane.activate()
            mscEditor.setText("a note a: made in Holland;")

          waitsFor ->
            preview.text().indexOf("a note a: made in Holland;") >= 0

          runs ->
            expect(editorPane.isActive()).toBe true
            expect(previewPane.getActiveItem()).toBe preview

      describe "when the liveUpdate config is set to false", ->
        it "only re-renders the stategenny when the editor is saved, not when the contents are modified", ->
          atom.config.set 'stategenny-preview.liveUpdate', false

          didStopChangingHandler = jasmine.createSpy('didStopChangingHandler')
          atom.workspace.getActiveTextEditor().getBuffer().onDidStopChanging didStopChangingHandler
          atom.workspace.getActiveTextEditor().setText('ch ch changes')

          waitsFor ->
            didStopChangingHandler.callCount > 0

          runs ->
            expect(preview.text()).not.toContain("ch ch changes")
            atom.workspace.getActiveTextEditor().save()

          waitsFor ->
            preview.text().indexOf("ch ch changes") >= 0

  describe "when the stategenny preview view is requested by file URI", ->
    it "opens a preview editor and watches the file for changes", ->
      waitsForPromise "atom.workspace.open promise to be resolved", ->
        atom.workspace.open("stategenny-preview://#{atom.project.getDirectories()[0].resolve('subdir/atest.stategenny')}")

      runs ->
        preview = atom.workspace.getActivePaneItem()
        expect(preview).toBeInstanceOf(StateGennyPreviewView)

        spyOn(preview, 'renderMscText')
        preview.file.emitter.emit('did-change')

      waitsFor "stategenny to be re-rendered after file changed", ->
        preview.renderMscText.callCount > 0

  describe "when the editor's path changes on #win32 and #darwin", ->
    it "updates the preview's title", ->
      titleChangedCallback = jasmine.createSpy('titleChangedCallback')

      waitsForPromise -> atom.workspace.open("subdir/atest.stategenny")
      runs -> atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'

      expectPreviewInSplitPane()

      runs ->
        expect(preview.getTitle()).toBe 'atest.stategenny Preview'
        preview.onDidChangeTitle(titleChangedCallback)
        fs.renameSync(atom.workspace.getActiveTextEditor().getPath(), path.join(path.dirname(atom.workspace.getActiveTextEditor().getPath()), 'atest2.stategenny'))

      waitsFor ->
        preview.getTitle() is "atest2.stategenny Preview"

      runs ->
        expect(titleChangedCallback).toHaveBeenCalled()

  describe "when the URI opened does not have a stategenny-preview protocol", ->
    it "does not throw an error trying to decode the URI (regression)", ->
      waitsForPromise ->
        atom.workspace.open('%')

      runs ->
        expect(atom.workspace.getActiveTextEditor()).toBeTruthy()

  describe "sanitization", ->
    it "removes script tags and attributes that commonly contain inline scripts", ->
      waitsForPromise -> atom.workspace.open("subdir/puthaken.stategenny")
      runs -> atom.commands.dispatch workspaceElement, 'stategenny-preview:toggle'
      expectPreviewInSplitPane()

      runs ->
        expect(preview[0].innerHTML).toContain """<span style="text-decoration:underline">&lt;</span>puthaken&gt;spul&lt;/puthaken&gt;"""
        expect(preview[0].innerHTML).toContain """error on line 1, column 1"""
