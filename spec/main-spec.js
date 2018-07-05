"use babel";
/* global atom */
import path from 'path';
import fs from 'fs-plus';
import temp from 'temp';
import StateMachineCatPreviewView from '../lib/state-machine-cat-preview-view';

describe("smcat preview package", function() {
    let [workspaceElement, preview] = [];

    beforeEach(function() {
        const fixturesPath = path.join(__dirname, 'fixtures');
        const tempPath = temp.mkdirSync('atom');
        fs.copySync(fixturesPath, tempPath);
        atom.project.setPaths([tempPath]);

        jasmine.useRealClock();

        workspaceElement = atom.views.getView(atom.workspace);
        jasmine.attachToDOM(workspaceElement);

        return waitsForPromise(() => atom.packages.activatePackage("state-machine-cat-preview"));
    });

    function expectPreviewInSplitPane() {
        runs(() => expect(atom.workspace.getPanes().length).toBeGreaterThan(1)); // 2 for atom < 1.9; 4 for >= 1.9

        waitsFor("smcat preview to be created", () => preview = atom.workspace.getPanes()[1].getActiveItem());

        return runs(function() {
            expect(preview).toBeInstanceOf(StateMachineCatPreviewView);
            return expect(preview.getPath()).toBe(atom.workspace.getActivePaneItem().getPath());
        });
    }

    describe("when a preview has not been created for the file", function() {
        it("displays a smcat preview in a split pane", function() {
            waitsForPromise(() => atom.workspace.open("subdir/demo.smcat"));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
            expectPreviewInSplitPane();

            return runs(function() {
                const [editorPane] = atom.workspace.getPanes();
                expect(editorPane.getItems()).toHaveLength(1);
                return expect(editorPane.isActive()).toBe(true);
            });
        });

        describe("when the editor's path does not exist", () =>
            it("splits the current pane to the right with a smcat preview for the file", function() {
                waitsForPromise(() => atom.workspace.open("new.smcat"));
                runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
                return expectPreviewInSplitPane();
            })
        );

        describe("when the path contains a space", () =>
            it("renders the preview", function() {
                waitsForPromise(() => atom.workspace.open("subdir/a test with filename spaces.smcat"));
                runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
                return expectPreviewInSplitPane();
            })
        );

        return describe("when the path contains non-ASCII characters", () =>
            it("renders the preview", function() {
                waitsForPromise(() => atom.workspace.open("subdir/序列圖.smcat"));
                runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
                return expectPreviewInSplitPane();
            })
        );
    });

    describe("when a preview has been created for the file", function() {
        beforeEach(function() {
            waitsForPromise(() => atom.workspace.open("subdir/a test with filename spaces.smcat"));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
            return expectPreviewInSplitPane();
        });

        it("closes the existing preview when toggle is triggered a second time on the editor", function() {
            atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle');

            const [editorPane, previewPane] = atom.workspace.getPanes();
            expect(editorPane.isActive()).toBe(true);
            return expect(previewPane.getActiveItem()).toBeUndefined();
        });

        it("closes the existing preview when toggle is triggered on it and it has focus", function() {
            const previewPane = atom.workspace.getPanes()[1];
            previewPane.activate();

            atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle');
            return expect(previewPane.getActiveItem()).toBeUndefined();
        });

        return describe("when the editor is modified", function() {
            it("re-renders the preview", function() {
                spyOn(preview, 'showLoading');

                const mscEditor = atom.workspace.getActiveTextEditor();
                mscEditor.setText("a note a: made in Holland;");

                waitsFor(() => preview.text().indexOf("a note a: made in Holland;") >= 0);

                return runs(() => expect(preview.showLoading).not.toHaveBeenCalled());
            });

            xit("invokes ::onDidChangeMsc listeners", function() {
                let listener = {};
                const mscEditor = atom.workspace.getActiveTextEditor();
                preview.onDidChangeMsc(listener = jasmine.createSpy('didChangeMscListener'));

                runs(() => mscEditor.setText("a note a: made in Holland;"));

                return waitsFor("::onDidChangeMsc handler to be called", () => listener.callCount > 0);
            });

            describe("when the preview is in the active pane but is not the active item", () =>
                it("re-renders the preview but does not make it active", function() {
                    const mscEditor = atom.workspace.getActiveTextEditor();
                    const previewPane = atom.workspace.getPanes()[1];
                    previewPane.activate();

                    waitsForPromise(() => atom.workspace.open());

                    runs(() => mscEditor.setText("a note a: made in Holland;"));

                    waitsFor(() => preview.text().indexOf("a note a: made in Holland;") >= 0);

                    return runs(function() {
                        expect(previewPane.isActive()).toBe(true);
                        return expect(previewPane.getActiveItem()).not.toBe(preview);
                    });
                })
            );

            describe("when the preview is not the active item and not in the active pane", () =>
                it("re-renders the preview and makes it active", function() {
                    const mscEditor = atom.workspace.getActiveTextEditor();
                    const [editorPane, previewPane] = atom.workspace.getPanes();
                    previewPane.splitRight({copyActiveItem: true});
                    previewPane.activate();

                    waitsForPromise(() => atom.workspace.open());

                    runs(function() {
                        editorPane.activate();
                        return mscEditor.setText("a note a: made in Holland;");
                    });

                    waitsFor(() => preview.text().indexOf("a note a: made in Holland;") >= 0);

                    return runs(function() {
                        expect(editorPane.isActive()).toBe(true);
                        return expect(previewPane.getActiveItem()).toBe(preview);
                    });
                })
            );

            return describe("when the liveUpdate config is set to false", () =>
                it("only re-renders the smcat when the editor is saved, not when the contents are modified", () => {
                    atom.config.set('state-machine-cat-preview.liveUpdate', false);

                    const didStopChangingHandler = jasmine.createSpy('didStopChangingHandler');
                    atom.workspace.getActiveTextEditor().getBuffer().onDidStopChanging(didStopChangingHandler);
                    atom.workspace.getActiveTextEditor().setText('ch ch changes');

                    waitsFor(() => didStopChangingHandler.callCount > 0);

                    runs(function() {
                        expect(preview.text()).not.toContain("ch ch changes");
                        return atom.workspace.getActiveTextEditor().save();
                    });

                    return waitsFor(() => preview.text().indexOf("ch ch changes") >= 0);
                })
            );
        });
    });

    describe("when the smcat preview view is requested by file URI", () =>
        it("opens a preview editor and watches the file for changes", function() {
            waitsForPromise(
                "atom.workspace.open promise to be resolved",
                () => atom.workspace.open(
                    `state-machine-cat-preview://${atom.project.getDirectories()[0].resolve('subdir/atest.smcat')}`
                )
            );

            runs(function() {
                preview = atom.workspace.getActivePaneItem();
                expect(preview).toBeInstanceOf(StateMachineCatPreviewView);

                spyOn(preview, 'renderSMCatText');
                return preview.file.emitter.emit('did-change');
            });

            return waitsFor(
                "smcat to be re-rendered after file changed",
                () => preview.renderSMCatText.callCount > 0
            );
        })
    );

    describe("when the editor's path changes on #win32 and #darwin", () =>
        it("updates the preview's title", function() {
            const titleChangedCallback = jasmine.createSpy('titleChangedCallback');

            waitsForPromise(() => atom.workspace.open("subdir/atest.smcat"));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));

            expectPreviewInSplitPane();

            runs(function() {
                expect(preview.getTitle()).toBe('atest.smcat preview');
                preview.onDidChangeTitle(titleChangedCallback);
                return fs.renameSync(
                    atom.workspace.getActiveTextEditor().getPath(),
                    path.join(path.dirname(atom.workspace.getActiveTextEditor().getPath()), 'atest2.smcat')
                );
            });

            waitsFor(() => preview.getTitle() === "atest2.smcat preview");

            return runs(() => expect(titleChangedCallback).toHaveBeenCalled());
        })
    );

    describe("when the URI opened does not have a state-machine-cat-preview protocol", () =>
        it("does not throw an error trying to decode the URI (regression)", function() {
            waitsForPromise(() => atom.workspace.open('%'));

            return runs(() => expect(atom.workspace.getActiveTextEditor()).toBeTruthy());
        })
    );

    return describe("sanitization", () =>
        it("removes script tags and attributes that commonly contain inline scripts", function() {
            waitsForPromise(() => atom.workspace.open("subdir/puthaken.smcat"));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
            expectPreviewInSplitPane();

            return runs(function() {
                expect(preview[0].innerHTML).toContain("puthaken&gt;spul&lt;/puthaken&gt;");
                return expect(preview[0].innerHTML).toContain("error on line 1, column 1");
            });
        })
    );
});
