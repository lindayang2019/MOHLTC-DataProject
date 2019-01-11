import pako from 'pako';
import colCache from './col-cache';
import Parser from './formulaParser';
import CalculationChain from './calculation-chain';

export {Parser, CalculationChain, colCache};

let excelInstance;

export function init(instance) {
  excelInstance = instance;
}

export function unzip(binary) {
  return JSON.parse(pako.inflate(binary, {to: 'string'}));
}

export function preProcess(workbookRawData, workbookRawExtra) {
  const global = {
    workbookData: {
      sheets: {}
    },
    dataValidations: {},
    definedNames: workbookRawExtra ? workbookRawExtra.definedNames : {},
    hyperlinks: {},
    sheetNames: [],
  };
  excelInstance.currentSheetName = workbookRawData[0].name;

  for (let orderNo in workbookRawData) {
    global.sheetNames.push(workbookRawData[orderNo].name);
  }
  excelInstance.setState({completed: 70, global: Object.assign(excelInstance.state.global, global)}, () => {
    excelInstance.calculationChain.initParser();

    for (let orderNo in workbookRawData) {
      excelInstance.setState((prevState) => {
        return {completed: prevState.completed + 2}
      });
      const wsData = global.workbookData.sheets[orderNo] = {};
      const data = workbookRawData[orderNo];
      wsData.data = [];
      wsData.name = data.name;


      // cell data
      for (let rowNumber = 0; rowNumber < data.dimension[0]; rowNumber++) {
        wsData.data.push([]);
        for (let colNumber = 0; colNumber < data.dimension[1]; colNumber++) {
          if (data && data[rowNumber] && data[rowNumber][colNumber] !== undefined) {
            const cellData = data[rowNumber][colNumber];
            wsData.data[rowNumber].push(cellData);
            if (cellData && typeof cellData === 'object' && 'formula' in cellData) {
              setTimeout(() => {
                /*eslint no-loop-func: "off"*/
                excelInstance.calculationChain.addCell(orderNo, rowNumber, colNumber, cellData.formula)
              }, 0);
            }
            // delete data[rowNumber][colNumber];
          }
          else {
            wsData.data[rowNumber].push('');
          }
        }
        // delete data[rowNumber];
      }

      // if has extra
      if (workbookRawExtra) {
        const extra = workbookRawExtra.sheets[orderNo];
        wsData.col = {};
        wsData.col.hidden = extra.col.hidden;
        wsData.col.style = extra.col.style;
        wsData.col.width = dictToList(extra.col.width, data.dimension[1], 23, extra.col.hidden);
        wsData.row = {};
        wsData.row.hidden = extra.row.hidden;
        wsData.row.style = extra.row.style;
        wsData.row.height = dictToList(extra.row.height, data.dimension[0], extra.defaultRowHeight, extra.row.hidden);
        wsData.dataValidations = extra.dataValidations;
        wsData.state = extra.state;
        wsData.tabColor = extra.tabColor;
        wsData.style = extra.style;
        wsData.hyperlinks = extra.hyperlinks;
        wsData.views = extra.views;

        // transform mergeCells
        const merges = wsData.merges = [];
        for (let position in extra.merges) {
          if (extra.merges.hasOwnProperty(position)) {
            const model = extra.merges[position].model;
            merges.push({
              row: model.top - 1,
              col: model.left - 1,
              rowspan: model.bottom - model.top + 1,
              colspan: model.right - model.left + 1
            })
          }
        }

        // pre-process hyperlinks
        let hyperlinks = global.hyperlinks[orderNo] = {};
        for (let key in extra.hyperlinks) {
          if (extra.hyperlinks.hasOwnProperty(key)) {
            const hyperlink = extra.hyperlinks[key];
            let addressSplited = splitAddress(key);
            // address possible bug: e.g. when there exists 'A1' and 'A1:C1' as targets,
            // the hyperlink in 'A1:C1' should override the hyperlink in 'A1'.
            if (addressSplited.length === 1 && addressSplited[0] in hyperlinks) {
              continue;
            }

            let data = {mode: hyperlink.mode, target: hyperlink.target};

            if (hyperlink.mode === 'internal') {
              // find sheet name and cell position
              let targetNoQuote = hyperlink.target.replace(/['"]+/g, '');
              const index = targetNoQuote.indexOf('!');
              if (index !== -1) {
                data.sheetName = targetNoQuote.slice(0, index);
                data.cell = targetNoQuote.slice(index + 1);
              }
            }

            hyperlinks[addressSplited[0]] = data;

            // link other hyperlinks to the first one
            for (let i = 1; i < addressSplited.length; i++) {
              hyperlinks[addressSplited[i]] = hyperlinks[addressSplited[0]];
            }
          }
        }
      }


    }
  });


  // store to excelInstance for further steps
  excelInstance.setState({
    global: Object.assign(excelInstance.state.global, global),
    loadingMessage: 'Loading data validations...'
  });

  for (let i = 0; i < Object.keys(workbookRawExtra.sheets).length; i++) {
    const orderNo = Object.keys(workbookRawExtra.sheets)[i];
    const dataValidations = workbookRawExtra.sheets[orderNo].dataValidations;
    // pre-process data validation
    global.dataValidations[orderNo] = {
      dropDownAddresses: [],
      dropDownData: {}
    };
    // console.log(dataValidations)
    for (let key in dataValidations) {
      if (dataValidations.hasOwnProperty(key)) {
        // set index temporarily for evaluating formulas
        excelInstance.state.global.currentSheetIdx = orderNo;

        const dataValidation = dataValidations[key];
        if (dataValidation.type !== 'list') {
          console.error('Unsupported data validation type: ' + dataValidation.type);
          continue;
        }
        let addressSplited = splitAddress(key);

        for (let i = 0; i < addressSplited.length; i++) {
          global.dataValidations[orderNo].dropDownAddresses.push(addressSplited[i]);

          // get data
          // situation 1: e.g. formulae: [""1,2,3,4""]
          const formulae = dataValidation.formulae[0];
          if (formulae[0] === '"' && formulae[formulae.length - 1] === '"') {
            let data = formulae.slice(1, formulae.length - 1).split(',');
            const dataTrimmed = data.map(x => x.trim());
            global.dataValidations[orderNo].dropDownData[addressSplited[i]] = dataTrimmed;
          }
          // situation 2: e.g. formulae: ["$B$5:$K$5"]
          else if (formulae.indexOf(':') > 0) {
            const parsed = excelInstance.parser.parse(formulae).result;
            // concat 2d array to 1d array
            let newArr = [];
            for (let i = 0; i < parsed.length; i++) {
              newArr = newArr.concat(parsed[i]);
            }
            global.dataValidations[orderNo].dropDownData[addressSplited[i]] = newArr;
          }
          // situation 3: e.g. formulae: ["definedName"]
          else if (formulae in global.definedNames) {
            global.dataValidations[orderNo].dropDownData[addressSplited[i]] = excelInstance.getDefinedName(formulae);
          }
          else {
            console.error('Unknown dataValidation formulae situation: ' + formulae);
          }
        }
      }
    }

  }
  // rest index back
  excelInstance.state.global.currentSheetIdx = 0;
  return global;
}


/**
 * Internal functions
 */

function splitAddress(address) {
  const addresses = address.split(' ');
  let addressSplited = [];
  for (let i = 0; i < addresses.length; i++) {
    //  {top: 1, left: 1, bottom: 5, right: 1, tl: "A1", …}
    const decoded = colCache.decode(addresses[i]);
    if ('top' in decoded) {
      for (let row = decoded.top; row < decoded.bottom + 1; row++) {
        for (let col = decoded.left; col < decoded.right + 1; col++) {
          addressSplited.push(colCache.encode(row, col));
        }
      }
    }
    // {address: "A1", col: 1, row: 1, $col$row: "$A$1"}
    else if ('row' in decoded) {
      addressSplited.push(addresses[i]);
    }
  }
  return addressSplited;
}

function dictToList(dict, length, defVal = null, hidden = []) {
  let ret = [];
  // set hidden row/col height/width to 0.1
  for (let i = 0; i < length; i++) {
    if (hidden.includes(i)) {
      ret.push(0.1);
    }
    else if (dict[i] !== undefined) {
      ret.push(dict[i]);
    }
    else {
      ret.push(defVal);
    }
  }
  return ret;
}


export function argbToRgb(color) {
  if (color === undefined || color.argb === undefined)
    return undefined;
  return color.argb.substring(2);
}