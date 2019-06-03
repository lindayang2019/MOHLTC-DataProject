import React, {PureComponent, Component} from "react";
import {calculateRealSelections} from "../helpers";
import Cell from './Cell';

const DefaultStyle = {
  zIndex: 100000,
  position: 'absolute',
  border: '2px solid rgba(75, 135, 255, 0.95)',
  background: 'rgba(3, 169, 244, 0.05)',
  pointerEvents: 'none',
  display: 'none',
};

export default class Selections {
  constructor(props) {
    this.props = props;
    this.ref = {
      topLeft: React.createRef(),
      topRight: React.createRef(),
      bottomLeft: React.createRef(),
      bottomRight: React.createRef(),
    };
    // select first cell by default
    this._data = [1, 1, 1, 1];
  }

  /**
   * Get selections data.
   * @return {*[]}
   */
  get data() {
    return this._data;
  }

  reset = () => {
    Object.keys(this.ref).forEach(key => this.ref[key].current.reset());
  };

  setSelections = (selections) => {
    const {freezeRowCount, freezeColumnCount, sheet, gridRef} = this.props;
    selections = calculateRealSelections(sheet, ...selections);
    this._data = selections;
    let topLeft, topRight, bottomLeft, bottomRight;

    // has top left pane
    if (selections[0] <= freezeRowCount && selections[1] <= freezeColumnCount) {
      topLeft = [selections[0], selections[1], Math.min(freezeRowCount, selections[2]),
        Math.min(freezeColumnCount, selections[3])];
    }

    // has top right pane
    if (selections[0] <= freezeRowCount && selections[3] > freezeColumnCount) {
      topRight = [selections[0], selections[1] <= freezeColumnCount ? freezeColumnCount + 1 : selections[1],
        Math.min(freezeRowCount, selections[2]), selections[3]];
    }

    // has bottom left pane
    if (selections[1] <= freezeColumnCount && selections[2] > freezeRowCount) {
      bottomLeft = [selections[0] <= freezeRowCount ? freezeRowCount + 1 : selections[0], selections[1],
        selections[2], Math.min(freezeColumnCount, selections[3])];
    }
    if (selections[2] > freezeRowCount && selections[3] > freezeColumnCount) {
      bottomRight = [Math.max(freezeRowCount + 1, selections[0]),
        Math.max(freezeColumnCount + 1, selections[1]), selections[2], selections[3]];
    }
    this.setSelectionsOnPane('bottomRight', bottomRight);
    this.setSelectionsOnPane('bottomLeft', bottomLeft);
    this.setSelectionsOnPane('topLeft', topLeft);
    this.setSelectionsOnPane('topRight', topRight);
    this.updateHeaders(selections);
    return selections;
  };

  updateHeaders(selections) {
    // row headers
    for (let i = 1; i < Cell.rowHeaders.length; i++) {
      const ref = Cell.rowHeaders[i];
      if (!ref || !ref.current) continue;
      if (selections[0] <= i && i <= selections[2]) {
        ref.current.classList.add('highlight');
      } else {
        ref.current.classList.remove('highlight');
      }
    }
    // col headers
    for (let i = 0; i < Cell.colHeaders.length; i++) {
      const ref = Cell.colHeaders[i];
      if (!ref || !ref.current) continue;
      if (selections[1] <= i && i <= selections[3]) {
        ref.current.classList.add('highlight');
      } else {
        ref.current.classList.remove('highlight');
      }
    }
  }

  setSelectionsOnPane = (pane, selections) => {
    if (!selections) {
      this.ref[pane].current.reset();
      return;
    }
    const {gridRef, freezeRowCount, freezeColumnCount} = this.props;
    const grid = gridRef.current;

    const topLeftStyle = grid._getItemStyle(selections[0], selections[1]);
    const botRightStyle = grid._getItemStyle(selections[2], selections[3]);
    const style = {
      left: topLeftStyle.left,
      top: pane === 'bottomLeft' ?
        topLeftStyle.top - grid._getItemStyle(freezeRowCount + 1, freezeColumnCount + 1).top : topLeftStyle.top,
      width: botRightStyle.left - topLeftStyle.left + botRightStyle.width,
      height: botRightStyle.top - topLeftStyle.top + botRightStyle.height,
      display: null,
      zIndex: pane === 'bottomRight' ? 99999 : 100000,
    };
    this.ref[pane].current.update(style);
  };

  renderTopLeft = () => {
    return <Selection ref={this.ref.topLeft} key={'top-left-selections'}/>
  };

  renderTopRight = () => {
    return <Selection ref={this.ref.topRight} key={'top-right-selections'}/>
  };

  renderBottomLeft = () => {
    return <Selection ref={this.ref.bottomLeft} key={'bottom-left-selections'}/>
  };

  renderBottomRight = () => {
    return <Selection ref={this.ref.bottomRight} key={'bottom-right-selections'}/>
  };
}

class Selection extends Component {

  state = {style: {left: 0, top: 0, width: 0, height: 0}};

  update(style) {
    this.setState({style});
  }

  reset() {
    this.setState({style: {left: 0, top: 0, width: 0, height: 0}})
  }

  render() {
    return <div style={Object.assign({}, DefaultStyle, this.state.style)}/>
  }
}