'use babel'

/*
 * decaffeinate suggestions:
 * DS001: Remove Babel/TypeScript constructor workaround
 * DS102: Remove unnecessary code created because of implicit returns
 * DS103: Rewrite code to no longer use __guard__
 * DS104: Avoid inline assignments
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */
import path from 'path'
import { Emitter, Disposable, CompositeDisposable, File } from 'atom'
import { $, $$$, ScrollView } from 'atom-space-pen-views'
import _ from 'underscore-plus'
import fs from 'fs-plus'

let renderer = null // Defer until used
let errRenderer = null // Defer until used
let svgToRaster = null // Defer until used
let latestKnownEditorId = null

export default class SmCatPreviewView extends ScrollView {
  static content () {
    return this.div({ class: 'state-machine-cat-preview native-key-bindings', tabindex: -1 }, () => {
      this.div({ class: 'image-controls', outlet: 'imageControls' }, () => {
        this.div({ class: 'image-controls-group' }, () => {
          this.a({ outlet: 'whiteTransparentBackgroundButton', class: 'image-controls-color-white', value: 'white' }, () => this.text('white'))
          this.a({ outlet: 'blackTransparentBackgroundButton', class: 'image-controls-color-black', value: 'black' }, () => this.text('black'))
          this.a({ outlet: 'transparentTransparentBackgroundButton', class: 'image-controls-color-transparent', value: 'transparent' }, () => this.text('transparent'))
        })
        this.div({ class: 'image-controls-group btn-group' }, () => {
          this.button({ class: 'btn', outlet: 'zoomOutButton' }, '-')
          this.button({ class: 'btn reset-zoom-button', outlet: 'resetZoomButton' }, '100%')
          this.button({ class: 'btn', outlet: 'zoomInButton' }, '+')
        })
        this.div({ class: 'image-controls-group btn-group' }, () => this.button({ class: 'btn', outlet: 'zoomToFitButton' }, 'Zoom to fit'))
      })

      this.div({ class: 'image-container', background: 'transparent', outlet: 'imageContainer' })
    })
  }

  constructor ({ editorId, filePath }) {
    super()

    this.editorId = editorId
    this.filePath = filePath

    this.emitter = new Emitter()
    this.disposables = new CompositeDisposable()
    this.loaded = false
    this.svg = null
    this.zoomFactor = 1
    this.renderedSVG = null
    this.originalWidth = 481
    this.originalHeight = 481
    this.mode = 'zoom-manual'

    this.disposables.add(atom.tooltips.add(this.whiteTransparentBackgroundButton[0], { title: 'Use white transparent background' }))
    this.disposables.add(atom.tooltips.add(this.blackTransparentBackgroundButton[0], { title: 'Use black transparent background' }))
    this.disposables.add(atom.tooltips.add(this.transparentTransparentBackgroundButton[0], { title: 'Use transparent background' }))

    this.zoomInButton.on('click', () => this.zoomIn())
    this.zoomOutButton.on('click', () => this.zoomOut())
    this.resetZoomButton.on('click', () => this.resetZoom())
    this.zoomToFitButton.on('click', () => this.zoomToFit())
  }

  attached () {
    if (this.isAttached) {
      return
    }
    this.isAttached = true

    if (this.editorId != null) {
      this.resolveEditor(this.editorId)
    } else if (atom.workspace != null) {
      this.subscribeToFilePath(this.filePath)
    } else {
      this.disposables.add(atom.packages.onDidActivateInitialPackages(() => this.subscribeToFilePath(this.filePath))
      )
    }

    if (this.getPane()) {
      return this.imageControls.find('a').on('click', e => this.changeBackground($(e.target).attr('value')))
    }
  }

  serialize () {
    let left
    return {
      deserializer: 'deserializePreviewView',
      filePath: (left = this.getPath()) != null ? left : this.filePath,
      editorId: this.editorId
    }
  }

  destroy () {
    return this.disposables.dispose()
  }

  onDidChangeTitle (callback) {
    return this.emitter.on('did-change-title', callback)
  }

  onDidChangeModified () {
    // No op to suppress deprecation warning
    return new Disposable()
  }

  onDidChangeSMCat (callback) {
    return this.emitter.on('did-change-smcat', callback)
  }

  subscribeToFilePath (filePath) {
    this.file = new File(filePath)
    this.emitter.emit('did-change-title')
    this.handleEvents()
    return this.renderSMCat()
  }

  resolveEditor (editorId) {
    const resolve = () => {
      this.editor = this.editorForId(editorId)

      if (this.editor != null) {
        if (this.editor != null) { this.emitter.emit('did-change-title') }
        this.handleEvents()
        return this.renderSMCat()
      } else {
        // The editor this preview was created for has been closed so close
        // this preview since a preview cannot be rendered without an editor
        return __guard__(atom.workspace != null ? atom.workspace.paneForItem(this) : undefined, x => x.destroyItem(this))
      }
    }

    if (atom.workspace === null) {
      return this.disposables.add(atom.packages.onDidActivateInitialPackages(resolve))
    } else {
      return resolve()
    }
  }

  editorForId (pEditorId) {
    return atom.workspace.getTextEditors()
      .filter(
        pEditor =>
          Object.prototype.hasOwnProperty.call(pEditor, 'id') &&
          pEditor.id !== null &&
          pEditor.id.toString() === pEditorId.toString()
      )[0]
  }

  handleEvents () {
    this.disposables.add(atom.grammars.onDidAddGrammar(() => _.debounce(() => this.renderSMCat(), 250)))
    this.disposables.add(atom.grammars.onDidUpdateGrammar(_.debounce(() => this.renderSMCat(), 250)))

    atom.commands.add(this.element, {
      'core:move-up': () => this.scrollUp(),
      'core:move-down': () => this.scrollDown(),
      'core:save-as': event => {
        event.stopPropagation()
        this.saveAs('svg')
      },
      'state-machine-cat-preview:save-as-png': event => {
        event.stopPropagation()
        this.saveAs('png')
      },
      'core:copy': event => {
        if (this.copyToClipboard()) {
          event.stopPropagation()
        }
      },
      'state-machine-cat-preview:zoom-in': () => this.zoomIn(),
      'state-machine-cat-preview:zoom-out': () => this.zoomOut(),
      'state-machine-cat-preview:reset-zoom': () => this.resetZoom(),
      'state-machine-cat-preview:zoom-to-fit': () => this.zoomToFit(),
      'state-machine-cat-preview:direction-top-down': () => this.setDirection('top-down'),
      'state-machine-cat-preview:direction-bottom-top': () => this.setDirection('bottom-top'),
      'state-machine-cat-preview:direction-left-right': () => this.setDirection('left-right'),
      'state-machine-cat-preview:direction-right-left': () => this.setDirection('right-left')
    })

    const changeHandler = () => {
      let left
      this.renderSMCat()

      // TODO: Remove paneForURI call when ::paneForItem is released
      const pane = (left = (typeof atom.workspace.paneForItem === 'function' ? atom.workspace.paneForItem(this) : undefined)) != null ? left : atom.workspace.paneForURI(this.getURI())
      if ((pane != null) && (pane !== atom.workspace.getActivePane())) {
        return pane.activateItem(this)
      }
    }

    if (this.file != null) {
      return this.disposables.add(this.file.onDidChange(changeHandler))
    } else if (this.editor != null) {
      this.disposables.add(this.editor.getBuffer().onDidStopChanging(() => {
        if (atom.config.get('state-machine-cat-preview.liveUpdate')) { return changeHandler() }
      })
      )
      this.disposables.add(this.editor.onDidChangePath(() => this.emitter.emit('did-change-title')))
      this.disposables.add(this.editor.getBuffer().onDidSave(() => {
        if (!atom.config.get('state-machine-cat-preview.liveUpdate')) { return changeHandler() }
      })
      )
      return this.disposables.add(this.editor.getBuffer().onDidReload(() => {
        if (!atom.config.get('state-machine-cat-preview.liveUpdate')) { return changeHandler() }
      })
      )
    }
  }

  renderSMCat () {
    if (!this.loaded) {
      this.showLoading()
    }
    return this.getSource().then(source => {
      if (source !== null) {
        return this.renderSMCatText(source)
      }
    })
  }

  getSource () {
    if ((this.file != null ? this.file.getPath() : undefined)) {
      return this.file.read()
    } else if (this.editor != null) {
      return Promise.resolve(this.editor.getText())
    } else {
      return Promise.resolve(null)
    }
  }

  renderSMCatText (text) {
    if (latestKnownEditorId !== this.editorId) {
      latestKnownEditorId = this.editorId
    }

    this.svg = null
    if (renderer === null) {
      renderer = require('./renderer')
    }
    return renderer.render(text, {}, (error, svg) => {
      if (error) {
        return this.showError(error)
      } else {
        this.loading = false
        this.loaded = true
        this.svg = svg
        this.imageContainer.html(svg)
        this.renderedSVG = this.imageContainer.find('svg')
        this.originalWidth = this.renderedSVG.attr('width')
        this.originalHeight = this.renderedSVG.attr('height')

        if (this.mode === 'zoom-to-fit') {
          this.renderedSVG.attr('width', '100%')
          this.renderedSVG.attr('height', this.renderedSVG[0].clientHeight * this.determineZoomToFitFactor())
        } else {
          this.setZoom(this.zoomFactor)
        }

        this.emitter.emit('did-change-graphviz')
        return this.originalTrigger('state-machine-cat-preview:smcat-changed')
      }
    })
  }

  getSVG (callback) {
    return this.getSource().then(source => {
      if (source !== null) {
        return renderer.render(source, callback)
      }
    })
  }

  getTitle () {
    if (this.file != null) {
      return `${path.basename(this.getPath())} preview`
    } else if (this.editor != null) {
      return `${this.editor.getTitle()} preview`
    } else {
      return 'SM Cat Preview'
    }
  }

  getIconName () {
    return 'SMCat'
  }

  getURI () {
    if (this.file != null) {
      return `state-machine-cat-preview://${this.getPath()}`
    } else {
      return `state-machine-cat-preview://editor/${this.editorId}`
    }
  }

  getPath () {
    if (this.file != null) {
      return this.file.getPath()
    } else if (this.editor != null) {
      return this.editor.getPath()
    }
  }

  getGrammar () {
    return (this.editor != null ? this.editor.getGrammar() : undefined)
  }

  getDocumentStyleSheets () { // This function exists so we can stub it
    return document.styleSheets
  }

  showError (error) {
    if (errRenderer === null) {
      errRenderer = require('./err-renderer')
    }

    return this.getSource().then(source => {
      if (source != null) {
        return this.imageContainer.html(
          errRenderer.renderError(source, error.location, error.message)
        )
      }
    })
  }

  showLoading () {
    this.loading = true
    this.imageContainer.html($$$(function () {
      this.div({ class: 'smcat-spinner' }, 'Rendering state chart\u2026')
    })
    )
  }

  copyToClipboard () {
    if (this.loading || !this.svg) {
      return false
    }

    atom.clipboard.write(this.svg)

    return true
  }

  getFilePath (pOutputType) {
    let filePath = this.getPath()
    if (filePath) {
      filePath = path.join(
        path.dirname(filePath.toString()),
        path.basename(filePath, path.extname(filePath))
      ).concat('.').concat(pOutputType)
    } else {
      filePath = 'untitled.'.concat(pOutputType)
      const projectPath = atom.project.getPaths()[0]
      if (projectPath) {
        filePath = path.join(projectPath, filePath)
      }
    }
    return filePath
  }

  saveAs (pOutputType) {
    if (this.loading || !this.svg) {
      return
    }
    const outputFilePath = atom.applicationDelegate.showSaveDialog(
      this.getFilePath(pOutputType)
    )
    if (outputFilePath) {
      if (pOutputType === 'png') {
        if (svgToRaster === null) {
          svgToRaster = require('./svgToRaster')
        }

        svgToRaster(this.svg, pResult => {
          fs.writeFileSync(outputFilePath, pResult)
          atom.workspace.open(outputFilePath)
        })
      } else {
        fs.writeFileSync(outputFilePath, this.svg)
        atom.workspace.open(outputFilePath)
      }
    }
  }

  // image control functions
  // Retrieves this view's pane.
  //
  // Returns a {Pane}.
  getPane () {
    return this.parents('.pane')[0]
  }

  zoomOut () {
    return this.adjustZoom(-0.1)
  }

  zoomIn () {
    return this.adjustZoom(0.1)
  }

  adjustZoom (delta) {
    const zoomLevel = parseFloat(this.renderedSVG.css('zoom')) || 1
    if ((zoomLevel + delta) > 0) {
      this.setZoom((zoomLevel + delta))
    }
  }

  setZoom (factor) {
    if (!this.loaded || !this.isVisible()) {
      return
    }

    if (factor === null) {
      factor = 1
    }

    if (this.mode === 'zoom-to-fit') {
      this.mode = 'zoom-manual'
      this.zoomToFitButton.removeClass('selected')
    } else if (this.mode === 'reset-zoom') {
      this.mode = 'zoom-manual'
    }

    this.renderedSVG.attr('width', this.originalWidth)
    this.renderedSVG.attr('height', this.originalHeight)
    this.renderedSVG.css('zoom', factor)
    this.resetZoomButton.text(`${Math.round((factor) * 100)}%`)
    this.zoomFactor = factor
  }

  // Zooms the image to its normal width and height.
  resetZoom () {
    if (!this.loaded || !this.isVisible()) {
      return
    }

    this.mode = 'reset-zoom'
    this.zoomToFitButton.removeClass('selected')
    this.setZoom(1)
    this.resetZoomButton.text('100%')
  }

  determineZoomToFitFactor () {
    const scaleFactor = Math.min(
      this.imageContainer.context.clientWidth / this.renderedSVG[0].clientWidth,
      this.imageContainer.context.clientHeight / this.renderedSVG[0].clientHeight
    )
    return Math.min(scaleFactor, 1)
  }

  // Zooms to fit the image
  zoomToFit () {
    if (!this.loaded || !this.isVisible()) {
      return
    }

    this.setZoom(1)
    this.mode = 'zoom-to-fit'
    this.zoomToFitButton.addClass('selected')
    this.renderedSVG.attr('width', '100%')
    this.renderedSVG.attr('height', this.renderedSVG[0].clientHeight * this.determineZoomToFitFactor())
    this.resetZoomButton.text('Auto')
  }

  // Changes the background color of the image view.
  //
  // color - A {String} that gets used as class name.
  changeBackground (color) {
    if (!this.loaded || !this.isVisible() || !color) {
      return
    }
    this.imageContainer.attr('background', color)
  }

  setDirection (direction) {
    atom.config.set('state-machine-cat-preview.direction', direction)
    this.renderSMCat()
  }
}

function __guard__ (value, transform) {
  return (typeof value !== 'undefined' && value !== null) ? transform(value) : undefined
}

/* global atom */
