'use babel'

const deHTMLize = pString => pString.replace(/</g, '&lt;')

const renderErrorIntro = pErrorLocation => {
  if (pErrorLocation) {
    return `error on line ${pErrorLocation.start.line}, column ${pErrorLocation.start.column}`
  } else {
    return 'error'
  }
}

const formatNumber = (pNumber, pMaxWidth) => {
  let lRetval = pNumber.toString()
  lRetval = `${' '.repeat(pMaxWidth - lRetval.length) + lRetval} `
  return lRetval
}

const underlineCol = (pLine, pCol) => {
  if (!pCol) {
    return deHTMLize(pLine)
  }
  const lUnderlinalized = pLine.split('').reduce((pPrev, pChar, pIndex) => {
    if (pIndex === pCol) {
      return `${pPrev}<span style='text-decoration:underline'>${deHTMLize(pChar)}</span>`
    } else {
      return pPrev + deHTMLize(pChar)
    }
  }, '')
  return `<mark>${lUnderlinalized}</mark>`
}

const formatLine = (pLine, pIndex, pCol) => `${formatNumber(pIndex, 3)}${underlineCol(pLine, pCol)}`

const renderCode = (pSource, pErrorLocation) => {
  if (!pSource) {
    return ''
  }
  return pSource.split('\n').reduce((pPrev, pLine, pIndex) => {
    if (pErrorLocation && (pIndex === (pErrorLocation.start.line - 1))) {
      return `${pPrev}\n${formatLine(pLine, pIndex + 1, pErrorLocation.start.column - 1)}`
    } else {
      return `${pPrev}\n${formatLine(pLine, pIndex + 1)}`
    }
  }, '')
}

export default {
  renderError (pSource, pErrorLocation, pMessage) {
    return `<div class='error-wrap'>
            <div class='block error-head'>
                <span class='inline-block icon icon-flame highlight'>${renderErrorIntro(pErrorLocation, pMessage)}</span>
                <span class='error-text'>${pMessage}</span>
            </div>
            <pre class='code'>${renderCode(pSource, pErrorLocation)}</pre>
        </div>`
  }
}
/* eslint max-len:0 */
