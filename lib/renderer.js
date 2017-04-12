let smcat = null;
let wrapDot = null;

exports.render = function(pScript = '', pCallback) {
    if (smcat === null) {
        smcat = require('state-machine-cat');
    }
    let lOptions = {
        inputType: 'smcat',
        outputType: 'svg',
        engine: atom.config.get('state-machine-cat-preview.layoutEngine') || 'dot'
    };

    if (atom.config.get('state-machine-cat-preview.useGraphvizCommandLine')) {
        if (wrapDot === null) {
            wrapDot = require('./wrap-dot');
        }
        lOptions.outputType = 'dot';
        smcat.render(pScript, lOptions, (err, dot) => {
            if (err) {
                pCallback(err);
            } else {
                let lWrapOptions = Object.assign(lWrapOptions, lOptions);

                lWrapOptions.outputType = 'svg';

                if (Boolean(atom.config.get('state-machine-cat-preview.GraphvizPath'))) {
                    lWrapOptions.exec = atom.config.get('state-machine-cat-preview.GraphvizPath');
                }
                wrapDot.render(dot, lWrapOptions, pCallback);
            }
        });
    } else {
        smcat.render(pScript, lOptions, pCallback);
    }
};
/* global atom */
