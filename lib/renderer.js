"use babel";

let smcat = null;
let renderGraphVizWithCLI = null;

export function render(pScript, pCallback) {
    if (pScript === null) {
        pScript = '';
    }
    if (smcat === null) {
        smcat = require('state-machine-cat');
    }
    const lOptions = {
        inputType: 'smcat',
        outputType: 'svg',
        engine: atom.config.get('state-machine-cat-preview.layoutEngine') || 'dot'
    };
    if (atom.config.get('state-machine-cat-preview.useGraphvizCommandLine')) {
        if (renderGraphVizWithCLI === null) {
            renderGraphVizWithCLI = require('./renderGraphVizWithCLI');
        }
        lOptions.outputType = 'dot';
        smcat.render(pScript, lOptions, (err, dot) => {
            if (err) {
                pCallback(err);
            } else {
                const lWrapOptions = {};
                Object.assign(lWrapOptions, lOptions);
                lWrapOptions.outputType = 'svg';
                if (Boolean(atom.config.get('state-machine-cat-preview.GraphvizPath'))) {
                    lWrapOptions.exec = atom.config.get('state-machine-cat-preview.GraphvizPath');
                }
                renderGraphVizWithCLI(dot, pCallback, lWrapOptions);
            }
        });
    } else {
        smcat.render(pScript, lOptions, pCallback);
    }
}
/* global atom */
