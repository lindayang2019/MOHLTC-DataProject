import axios from "axios";
import config from "./../config/config";
import {excelInstance, RichText, XlsxPopulate} from "../views/Excel/utils";
import {generateObjectId, check, axiosConfig} from './common';

/**
 * Singleton Pattern
 */
let instance = null;

class WorkbookManager {

  constructor(props) {
    if (!instance) {
      instance = this;
      // init
      this.props = props;
    }
    return instance;
  }

  getWorkbook(name, admin) {
    const url = admin ? '/api/v2/admin/workbook/' : '/api/v2/user/filled/';
    return axios.get(config.server + url + name, axiosConfig)
      .then(response => {
        console.log(response);
        if (check(response)) {
          return response;
        }
      })
  }

// methods for modifying workbook
  createWorkbookLocal() {
    return XlsxPopulate.fromBlankAsync()
  }

  async readWorkbookFromDatabase(fileName, admin = true) {
    try {
      const response = await this.getWorkbook(fileName, admin);
      const {workbook, populate = {}} = response.data;
      const {file, name} = workbook;
      const wb = await XlsxPopulate.fromDataAsync(file, {base64: true});
      if (!admin) {
        // populate data
        for (let i in populate) {
          const sheet = wb.sheets()[i];
          const rows = populate[i];
          for (let rowNum in rows) {
            rowNum = Number(rowNum);
            const cols = rows[rowNum];
            const row = sheet.row(rowNum + 1);
            for (let colNum in cols) {
              colNum = Number(colNum);
              const cell = row.cell(colNum + 1);
              // only populate the basic values (not formula nor rich text)
              if (!(cell instanceof RichText)) cell._value = cols[colNum];
            }
          }
        }
      }
      return this._readWorkbook(wb, null, name);
    } catch (err) {
      console.error(err);
      this.props.showMessage(err.stack, 'error');
    }
  }

  readWorkbookLocal(cb) {
    const input = document.createElement('input');
    input.type = 'file';

    input.onchange = e => {
      const file = e.target.files[0];
      console.log(file.name);
      XlsxPopulate.fromDataAsync(file)
        .then(workbook => this._readWorkbook(workbook, cb, file.name));
    };

    input.click();
  }

  _readWorkbook(workbook, cb, fileName) {
    excelInstance.initialFileName = fileName;
    if (cb) {
      cb(workbook);
      excelInstance.setState({fileName});
    } else {
      return {workbook, fileName};
    }
  }

  downloadWorkbook(workbook, fileName = 'out.xlsx') {
    return workbook.outputAsync()
      .then(function (blob) {
        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
          // If IE, you must uses a different method.
          window.navigator.msSaveOrOpenBlob(blob, fileName);
        } else {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          document.body.appendChild(a);
          a.href = url;
          a.download = fileName;
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      });
  }

  saveWorkbookUser(workbook) {
    this.saveWorkbookAdmin(workbook, false);
  }

  saveWorkbookAdmin(workbook, admin = true) {
    const fileName = excelInstance.state.fileName;
    workbook.outputAsync('base64')
      .then(base64 => {
        return this.testSave(workbook, fileName, base64);
      })
      .then(response => {
        this.props.showMessage(response.data.message, response.data.success ? 'success' : 'error');
      })
  }

  async testSave(workbook, fileName, base64) {
    const data = {};
    const sheets = workbook.sheets();
    const ids = await generateObjectId(sheets.length);
    data.workbook = {
      name: fileName,
      file: base64,
      sheetIds: ids,
    };
    data.sheets = [];
    data.values = {};
    sheets.forEach((sheet, sheetNo) => {
      const col2Att = {}, row2Cat = {};
      const sheetData = {
        col2Att, row2Cat, name: sheet.name(), _id: ids[sheetNo]
      };
      data.sheets.push(sheetData);
      sheet._rows.forEach((row, rowNumber) => {
        // first row, check attribute
        if (rowNumber === 1) {
          row._cells.forEach((cell, colNumber) => {
            const cellValue = cell.getValue();
            if (/^[0-9]*$/.test(cellValue)) {
              col2Att[colNumber - 1] = cellValue; // 0-based index
            }
          });
          return;
        }
        // process each row
        row._cells.forEach((cell, colNumber) => {
          // first column, check category
          if (colNumber === 1) {
            const cellValue = cell.getValue();
            if (/^[0-9]*$/.test(cellValue)) {
              row2Cat[rowNumber - 1] = cellValue;
            }
          }
          const catId = row2Cat[rowNumber - 1], attId = col2Att[colNumber - 1];
          // skip the cell that have no att or cat id.
          if (!catId || !attId) return;

          // skip empty cell, rich text,
          if (cell.value() === undefined || cell.value() === null || cell.value() instanceof XlsxPopulate.RichText) {
            return;
          }

          let atts = data.values[catId];
          if (!atts) atts = data.values[catId] = {};
          if (!atts[attId]) atts[attId] = cell.getValue();
        });
      });
      sheetData.attIds = Object.values(col2Att);
      sheetData.catIds = Object.values(row2Cat);
    });
    console.log(data);
    return await axios.post(config.server + '/api/v2/admin/workbook', data, axiosConfig);
  }
}

export default WorkbookManager;
