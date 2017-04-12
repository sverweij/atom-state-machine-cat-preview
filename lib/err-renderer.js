function deHTMLize(pString) {
    return pString.replace(/</g, "&lt;");
}

function renderErrorIntro(pErrorLocation) {
    if (pErrorLocation) {
        return `error on line ${pErrorLocation.start.line}, column ${pErrorLocation.start.column}`;
    } else {
        return "error";
    }
}

function formatNumber(pNumber, pMaxWidth) {
    let lRetval = pNumber.toString();
    return lRetval = " ".repeat(pMaxWidth - lRetval.length) + lRetval + " ";
}

function underlineCol(pLine, pCol) {
    if (typeof pCol === 'undefined') {
        return deHTMLize(pLine);
    }
    let lUnderlinalized = pLine.split("").reduce(((pPrev, pChar, pIndex) => {
        if (pIndex === pCol) {
            return `${pPrev}<span style='text-decoration:underline'>${deHTMLize(pChar)}</span>`;
        } else {
            return pPrev + deHTMLize(pChar);
        }
    }), "");
    return `<mark>${lUnderlinalized}</mark>`;
}

function formatLine(pLine, pIndex, pCol) {
    return "" + (formatNumber(pIndex, 3)) + (underlineCol(pLine, pCol));
}

function renderCode (pSource, pErrorLocation) {
    if (!pSource) {
        return "";
    }
    return pSource.split('\n').reduce(((pPrev, pLine, pIndex) => {
        if (pErrorLocation && (pIndex === (pErrorLocation.start.line - 1))) {
            return pPrev + '\n' + formatLine(pLine, pIndex + 1, pErrorLocation.start.column - 1);
        } else {
            return pPrev + '\n' + formatLine(pLine, pIndex + 1);
        }
    }), "");
}

module.exports = {
    renderError: (pSource, pErrorLocation, pMessage) =>
    "<div class='error-wrap'> <div class='block error-head'> <span class='inline-block icon icon-flame highlight'>" +
    renderErrorIntro(pErrorLocation, pMessage) +
    "</span> <span class='error-text'>" +
    pMessage +
    "</span> </div> <pre class='code'>" +
    renderCode(pSource, pErrorLocation) +
    "</pre> </div>"
};
