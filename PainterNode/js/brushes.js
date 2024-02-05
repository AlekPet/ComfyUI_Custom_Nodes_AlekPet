/*
 * Title: Brushes module
 * Author: AlekPet
 * Github: https://github.com/AlekPet
 * Github extensions ComfyUI: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */
import { fabric } from "../../lib/fabric.js";

fabric.SymmetryBrush = fabric.util.createClass(fabric.BaseBrush, {
  initialize: function (canvas) {
    this.canvas = canvas;
    this.ctx = canvas.contextTop;
    this._options = {
      // Normal
      default: { points: [], enable: true, type: "x=x,y=y" }, // x=x,y=y
      width_heigth: { points: [], enable: false, type: "x=w-x,y=h-y" }, // x=w-x,y=h-y
      width_x: { points: [], enable: true, type: "x=w-x,y=y" }, // x=w-x,y=y
      heigth_y: { points: [], enable: false, type: "x=x,y=h-y" }, // x=x,y=h-y
      // Reverse
      rev_default: { points: [], enable: false, type: "x=y,y=x" }, // x=y,y=x
      rev_width_heigth: { points: [], enable: false, type: "x=h-y,y=w-x" }, // x=h-y,y=w-x
      rev_width_x: { points: [], enable: false, type: "x=h-y,y=x" }, // x=h-y,y=x
      rev_heigth_y: { points: [], enable: false, type: "x=y,y=w-x" }, // x=y,y=w-x
    };
  },

  _updatePoints: function (options) {
    // Normal
    this._options["default"].points.push(
      new fabric.Point(options.pointer.x, options.pointer.y)
    );

    this._options["width_heigth"].points.push(
      new fabric.Point(
        this.canvas.width - options.pointer.x,
        this.canvas.height - options.pointer.y
      )
    );

    this._options["width_x"].points.push(
      new fabric.Point(this.canvas.width - options.pointer.x, options.pointer.y)
    );
    this._options["heigth_y"].points.push(
      new fabric.Point(
        options.pointer.x,
        this.canvas.height - options.pointer.y
      )
    );

    // Reverse
    this._options["rev_default"].points.push(
      new fabric.Point(options.pointer.y, options.pointer.x)
    );

    this._options["rev_width_heigth"].points.push(
      new fabric.Point(
        this.canvas.height - options.pointer.y,
        this.canvas.width - options.pointer.x
      )
    );

    this._options["rev_width_x"].points.push(
      new fabric.Point(
        this.canvas.height - options.pointer.y,
        options.pointer.x
      )
    );

    this._options["rev_heigth_y"].points.push(
      new fabric.Point(options.pointer.y, this.canvas.width - options.pointer.x)
    );
  },

  convertPointsToSVGPath: function (points) {
    var correction = this.width / 1000;
    return fabric.util.getSmoothPathFromPoints(points, correction);
  },

  _render() {},

  _drawSegment: function (mP, toP) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = this.color;
    ctx.lineCap = this.strokeLineCap;
    ctx.lineJoin = this.strokeLineJoin;
    ctx.lineWidth = this.width;
    ctx.moveTo(mP.x, mP.y);
    ctx.lineTo(toP.x, toP.y);
    ctx.stroke();
    ctx.restore();
  },

  createPath: function (pathData, shadow = false) {
    var path = new fabric.Path(pathData, {
      fill: null,
      stroke: this.color,
      strokeWidth: this.width,
      strokeLineCap: this.strokeLineCap,
      strokeMiterLimit: this.strokeMiterLimit,
      strokeLineJoin: this.strokeLineJoin,
      strokeDashArray: this.strokeDashArray,
    });
    if (this.shadow) {
      this.shadow.affectStroke = true;
      path.shadow = new fabric.Shadow(this.shadow);
    }

    return path;
  },

  onMouseDown: function (pointer, options) {
    if (!this.canvas._isMainEvent(options.e)) {
      return;
    }
    this._updatePoints(options);
  },

  onMouseMove: function (pointer, options) {
    if (!this.canvas._isMainEvent(options.e)) {
      return;
    }

    if (options.e.buttons !== 1) return;

    if (this._options["default"].points.length > 1) {
      for (let p_key in this._options) {
        const pointVal = this._options[p_key];
        if (pointVal.enable && pointVal.points.length > 0) {
          this._drawSegment(
            pointVal.points[pointVal.points.length - 2],
            pointVal.points[pointVal.points.length - 1]
          );
        }
      }
    }

    this._updatePoints(options);
    this.canvas.renderAll();
  },

  onMouseUp: function (options) {
    if (!this.canvas._isMainEvent(options.e)) {
      return true;
    }
    for (let p_key in this._options) {
      //if (p_key === "default") continue;
      const pointVal = this._options[p_key];
      if (pointVal.enable && pointVal.points.length > 0) {
        const path = this.convertPointsToSVGPath(pointVal.points);
        const offsetPath = this.createPath(path);
        this.canvas.add(offsetPath);
      }
      this._options[p_key].points = [];
    }
    return false;
  },
});

const svgSymmetryButtons = [
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-2 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="6" cy="6" r="5"/>
  <path class="cls-2" d="M17,0h1V35H17V0Z"/>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-3 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        fill: #fff;
      }

      .cls-3 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="6" cy="6" r="5"/>
  <circle class="cls-2" cx="29" cy="29" r="5"/>
  <path class="cls-3" d="M52,0h1V35H52V0Z" transform="translate(-35)"/>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-3 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        fill: #fff;
      }

      .cls-3 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="6" cy="6" r="5"/>
  <circle class="cls-2" cx="29" cy="6" r="5"/>
  <path class="cls-3" d="M87,0h1V35H87V0Z" transform="translate(-70)"/>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-3 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        fill: #fff;
      }

      .cls-3 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="6" cy="6" r="5"/>
  <circle class="cls-2" cx="6" cy="29" r="5"/>
  <path class="cls-3" d="M122,0h1V35h-1V0Z" transform="translate(-105)"/>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-3 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        fill: #fff;
      }

      .cls-3 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="6" cy="19" r="5"/>
  <circle class="cls-2" cx="6" cy="6" r="5"/>
  <path class="cls-3" d="M157,0h1V35h-1V0Z" transform="translate(-140)"/>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-3 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        fill: #fff;
      }

      .cls-3 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="28" cy="29" r="5"/>
  <circle class="cls-2" cx="5" cy="6" r="5"/>
  <path class="cls-3" d="M192,0h1V35h-1V0Z" transform="translate(-176)"/>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-3 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        fill: #fff;
      }

      .cls-3 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="28" cy="6" r="5"></circle>
  <circle class="cls-2" cx="28" cy="19" r="5"></circle>
  <path class="cls-3" d="M227,0h1V35h-1V0Z" transform="translate(-211)"></path>
</svg>`,
  `<svg xmlns="http://www.w3.org/2000/svg" width="35" height="35" viewBox="0 0 35 35">
  <defs>
    <style>
      .cls-1, .cls-3 {
        fill: none;
        stroke: #fff;
      }

      .cls-1 {
        stroke-width: 2px;
      }

      .cls-2 {
        fill: #fff;
      }

      .cls-3 {
        stroke-width: 1px;
        fill-rule: evenodd;
      }
    </style>
  </defs>
  <circle class="cls-1" cx="6" cy="29" r="5"/>
  <circle class="cls-2" cx="6" cy="6" r="5"/>
  <path class="cls-3" d="M262,0h1V35h-1V0Z" transform="translate(-245)"/>
</svg>`,
];

export default fabric.SymmetryBrush;

export { svgSymmetryButtons };
