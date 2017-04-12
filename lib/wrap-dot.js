const spawn = require('child_process').spawn;

exports.render = (pDot, pOptions = {outputType: 'svg', engine: 'dot', exec: 'dot'}, pCallback) => {
    let dot = spawn(pOptions.exec, ["-T" + pOptions.outputType, "-K" + pOptions.engine]);
    let lData = '';
    let lError = null;

    dot.stdin.write(pDot);
    dot.stdin.end();
    dot.stdout.on('data', function(pData) {
        lData += pData;
    });
    dot.stderr.on('data', function(pError) {
        lError = pError;
    });
    dot.on('error', function(pError) {
        lError = pError;
    });
    dot.on('close', function(pCode) {
        //  0: okeleedokelee
        //  1: error in the program
        // -2: executable not found
        if (pCode === 0) {
            pCallback(null, lData);
        } else if (lError) {
            if (lError instanceof Buffer) {
                pCallback({
                    message: lError.toString('utf8')
                });
            } else {
                pCallback({
                    message: lError
                });
            }
        } else {
            pCallback({
                message: "Unexpected error occurred. Exit code " + pCode
            });
        }
    });
};
