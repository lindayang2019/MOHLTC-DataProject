# DataProject  [![Build Status](https://travis-ci.com/LesterLyu/MOHLTC-DataProject.svg?branch=dev-lester)](https://travis-ci.com/LesterLyu/MOHLTC-DataProject)
## Live on http://ec2-3-16-106-158.us-east-2.compute.amazonaws.com/react

## Documents
> Please ignore the documents that is not listed here.
- [First Time Setup for Developers](documents/setup.md)
- [Restful API Documents (TODO)](documents/API)
- [Excel Indexed Colors](https://github.com/ClosedXML/ClosedXML/wiki/Excel-Indexed-Colors)
- [Supported excel styles to display in front-end](documents/excel-display.md)
- [Why this approach?](documents/Generic%20Data%20Project.pdf)

## Dependencies
> The libraries you need to **maintain** if you are on this project.
- [fast-formula-parser](https://github.com/LesterLyu/fast-formula-parser)
- [xlsx-populate](https://github.com/LesterLyu/xlsx-populate)
- [react-window](https://github.com/LesterLyu/react-window)
- [SSF (Spreadsheet Formatting)](https://github.com/LesterLyu/fast-formula-parser/blob/master/ssf/ssf.js)
- [Data-Project-Config](https://github.com/LesterLyu/Data-Project-Config) (permission required, this stores all secrets.)

## Purpose
This is complicated.

## Language
The logic of this application is mainly done in Javascript. Tools used:
- Server-side: *Node.js*, *Express*
  - User authentication: Passport
  - Database Driver: Mongoose
- Front-end Library: *React.js*
- Front-end Styling: [Coreui](https://github.com/coreui/coreui-react) & [Material-ui](https://github.com/mui-org/material-ui)
- Database: MongoDB
