"use babel";
/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
/* global atom */
import path from 'path';
import fs from 'fs-plus';
import temp from 'temp';
import SmCatPreviewView from '../lib/state-machine-cat-preview-view';

describe("SmCatPreviewView", function() {
    let [preview, workspaceElement] = [];

    beforeEach(function() {
        const filePath = atom.project.getDirectories()[0].resolve('subdir/asample.smcat');
        preview = new SmCatPreviewView({filePath});
        jasmine.attachToDOM(preview.element);

        return waitsForPromise(() => atom.packages.activatePackage("state-machine-cat-preview"));
    });

    afterEach(() => preview.destroy());

    describe("::constructor", () =>
        it("shows a loading spinner and renders the smcat", function() {
            preview.showLoading();
            expect(preview.find('.smcat-spinner')).toExist();

            return waitsForPromise(() => preview.renderSMCat());
        })
    );

    describe("serialization", function() {
        let newPreview = null;

        afterEach(() => {
            if (newPreview !== null) {
                newPreview.destroy();
            }
        });

        it("recreates the preview when serialized/deserialized", function() {
            newPreview = atom.deserializers.deserialize(preview.serialize());
            jasmine.attachToDOM(newPreview.element);
            return expect(newPreview.getPath()).toBe(preview.getPath());
        });

        return it("serializes the editor id when opened for an editor", function() {
            preview.destroy();

            waitsForPromise(() => atom.workspace.open('new.smcat'));

            return runs(function() {
                preview = new SmCatPreviewView({editorId: atom.workspace.getActiveTextEditor().id});

                jasmine.attachToDOM(preview.element);
                expect(preview.getPath()).toBe(atom.workspace.getActiveTextEditor().getPath());

                newPreview = atom.deserializers.deserialize(preview.serialize());
                jasmine.attachToDOM(newPreview.element);
                return expect(newPreview.getPath()).toBe(preview.getPath());
            });
        });
    });

    describe("when core:copy is triggered", function() {
        beforeEach(function() {
            const fixturesPath = path.join(__dirname, 'fixtures');
            const tempPath = temp.mkdirSync('atom');
            fs.copySync(fixturesPath, tempPath);
            atom.project.setPaths([tempPath]);

            jasmine.useRealClock();

            workspaceElement = atom.views.getView(atom.workspace);
            jasmine.attachToDOM(workspaceElement);
            return atom.clipboard.write("initial clipboard content");
        });

        return it("writes the rendered SVG to the clipboard", function() {
            let previewPaneItem = null;

            waitsForPromise(() => atom.workspace.open('subdir/序列圖.smcat'));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
            waitsFor(() => previewPaneItem = atom.workspace.getPanes()[1].getActiveItem());
            runs(() => atom.commands.dispatch(previewPaneItem.element, 'core:copy'));
            waitsFor(() => atom.clipboard.read() !== "initial clipboard content");

            return runs(() => expect(atom.clipboard.read()).toContain("<svg "));
        });
    });

    describe("zoom functions", function() {
        let previewPaneItem = null;

        beforeEach(function() {
            const fixturesPath = path.join(__dirname, 'fixtures');
            const tempPath = temp.mkdirSync('atom');
            fs.copySync(fixturesPath, tempPath);
            atom.project.setPaths([tempPath]);

            jasmine.useRealClock();

            workspaceElement = atom.views.getView(atom.workspace);
            jasmine.attachToDOM(workspaceElement);

            waitsForPromise(() => atom.workspace.open('subdir/序列圖.smcat'));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
            return waitsFor(() => previewPaneItem = atom.workspace.getPanes()[1].getActiveItem());
        });

        it("3x state-machine-cat-preview:zoom-in increases the image size by 30%", function() {
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-in');
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-in');
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-in');
            const lSvg = previewPaneItem.imageContainer.find('svg')[0];
            return expect(lSvg.style.zoom).toBe('1.3');
        });

        it("2x state-machine-cat-preview:zoom-out decreases the image size by 20%", function() {
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-out');
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-out');
            const lSvg = previewPaneItem.imageContainer.find('svg')[0];
            return expect(lSvg.style.zoom).toBe('0.8');
        });

        it("state-machine-cat-preview:reset-zoom resets zoom after size change", function() {
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-out');
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:reset-zoom');
            const lSvg = previewPaneItem.imageContainer.find('svg')[0];
            return expect(lSvg.style.zoom).toBe('1');
        });

        it("state-machine-cat-preview:reset-zoom resets zoom after zoom-to-fit", function() {
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-to-fit');
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:reset-zoom');
            const lSvg = previewPaneItem.imageContainer.find('svg')[0];
            expect(lSvg.style.zoom).toBe('1');
            return expect(lSvg.getAttribute('width')).toBe('249pt');
        });

        return it("state-machine-cat-preview:zoom-to-fit zooms to fit", function() {
            atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:zoom-to-fit');
            const lSvg = previewPaneItem.imageContainer.find('svg')[0];

            expect(lSvg.style.zoom).toBe('1');
            return expect(lSvg.getAttribute('width')).toBe('100%');
        });
    });

    return describe("when core:save-as is triggered", function() {
        beforeEach(function() {
            const fixturesPath = path.join(__dirname, 'fixtures');
            const tempPath = temp.mkdirSync('atom');
            fs.copySync(fixturesPath, tempPath);
            atom.project.setPaths([tempPath]);

            jasmine.useRealClock();

            workspaceElement = atom.views.getView(atom.workspace);
            return jasmine.attachToDOM(workspaceElement);
        });

        it("saves an SVG and opens it", function() {
            const outputPath = `${temp.path()}subdir/序列圖.svg`;
            let previewPaneItem = null;

            waitsForPromise(() => atom.workspace.open('subdir/序列圖.smcat'));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
            waitsFor(() => previewPaneItem = atom.workspace.getPanes()[1].getActiveItem());
            runs(function() {
                spyOn(atom.applicationDelegate, 'showSaveDialog').andReturn(outputPath);
                return atom.commands.dispatch(previewPaneItem.element, 'core:save-as');
            });
            waitsFor(() => fs.existsSync(outputPath));

            return runs(function() {
                expect(fs.isFileSync(outputPath)).toBe(true);
                const writtenFile = fs.readFileSync(outputPath);
                return expect(writtenFile).toContain("<svg ");
            });
        });

        return it("saves a PNG and opens it", function() {
            const outputPath = `${temp.path()}subdir/序列圖.png`;
            let previewPaneItem = null;

            waitsForPromise(() => atom.workspace.open('subdir/序列圖.smcat'));
            runs(() => atom.commands.dispatch(workspaceElement, 'state-machine-cat-preview:toggle'));
            waitsFor(() => previewPaneItem = atom.workspace.getPanes()[1].getActiveItem());
            runs(function() {
                spyOn(atom.applicationDelegate, 'showSaveDialog').andReturn(outputPath);
                return atom.commands.dispatch(previewPaneItem.element, 'state-machine-cat-preview:save-as-png');
            });
            waitsFor(() => fs.existsSync(outputPath));

            return runs(function() {
                expect(fs.isFileSync(outputPath)).toBe(true);
                const writtenFile = fs.readFileSync(outputPath);
                return expect(writtenFile).toContain("PNG");
            });
        });
    });
});
