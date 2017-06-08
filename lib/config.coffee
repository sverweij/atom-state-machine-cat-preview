module.exports =
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
      description: 'Keep unchecked when in doubt.<ul><li>Checked:<br>state-machine-cat-preview will use the command line version of GraphViz dot. For this to work GraphViz has to be installed on your machine, and it has to be on your path.<li>Unchecked:<br>state-machine-cat-preview will use viz.js for rendering.</ul>'
    GraphvizPath:
      type: 'string'
      default: ''
      order: 4
      description: 'If you use the command line version of GraphViz, and GraphViz is not on your _path_, you can use this to specify where to find the executable (including the name of the executable e.g. `/Users/superman/bin/dot`).<br><br>Leave empty when it\'s on your path.'
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
