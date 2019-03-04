import React from 'react';
import Excel from './CreateExcel';
import {mount, shallow} from "enzyme/build";
import sinon from 'sinon';
import {
  FormatBold, FormatColorFill, SaveAlt, CloudUploadOutlined, WrapText,
  FormatItalic, FormatUnderlined, FormatStrikethrough, FormatColorText,
  FormatAlignCenter, FormatAlignLeft, FormatAlignRight, FormatAlignJustify,
  VerticalAlignBottom, VerticalAlignCenter, VerticalAlignTop,
  BorderTop, BorderRight, BorderBottom, BorderLeft, BorderClear, BorderAll, //BorderColor,ZoomIn, ZoomOut,
} from "@material-ui/icons";
import ExcelToolBar from './components/ExcelToolBar';
import {
  AppBar,
  Button,
  Grid,
  withStyles,
  Popover,
} from "@material-ui/core";

describe('<Excel />', () => {
  let wrapper, excel, toolbar;

  beforeAll(async () => {
    wrapper = mount(shallow(<Excel/>).get(0));

    excel = wrapper.instance();
    // wait for async functions
    await excel.workbookManager.createWorkbookLocal();
    console.log(wrapper.children())
  });

  it('should load an empty workbook', () => {
    expect(excel.workbook).not.toBe(undefined);
  });

  it('set cell A1 bold', () => {
    excel.hotInstance.selectCell(0, 0);

    // console.log(wrapper.children())
    // boldButton.simulate('click');

  });


});


// it('simulates click events', () => {
//   const onButtonClick = sinon.spy();
//   const wrapper = shallow(<Foo onButtonClick={onButtonClick} />);
//   wrapper.find('button').simulate('click');
//   expect(onButtonClick).to.have.property('callCount', 1);
// });
