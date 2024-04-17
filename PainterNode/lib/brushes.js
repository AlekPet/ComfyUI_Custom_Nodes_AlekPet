/*
 * Title: Brushes module
 * Author: AlekPet
 * Github: https://github.com/AlekPet
 * Github extensions ComfyUI: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */
import { fabric } from "./fabric.js";
import { rangeGradient } from "./helpers.js";

// Brush symmetry fabricjs
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
      const pointVal = this._options[p_key];
      if (pointVal.enable && pointVal.points.length > 1) {
        const path = this.convertPointsToSVGPath(pointVal.points);
        const offsetPath = this.createPath(path);
        this.canvas.add(offsetPath);
      }
      this._options[p_key].points = [];
    }
    return false;
  },
});

// MyPaintBrush symmetry
fabric.MyBrushPaintSymmetry = fabric.util.createClass(fabric.SymmetryBrush, {
  initialize: function (
    canvas,
    range_brush_pressure = null,
    brushSettings = null
  ) {
    this.callSuper("initialize", canvas);

    if (!brushSettings) {
      throw new Error("Not valid brush settings!");
    }

    this.brushSettings = brushSettings;
    this._options.width_x.enable = false;
    this.surface = new MypaintSurface(this.canvas);
    this.brush = new MypaintBrush(this.brushSettings, this.surface);
    this.range_brush_pressure = range_brush_pressure;

    this.newGroup();
  },

  newGroup: function () {
    this.group = new fabric.Group();
    Object.assign(this.group, {
      width: this.canvas.width,
      height: this.canvas.height,
      strokeWidth: 0,
      mypaintlib: true,
    });

    this.canvas.add(this.group);
  },

  onMouseDown: function (pointer, options) {
    if (!this.canvas._isMainEvent(options.e)) {
      return;
    }

    if (!this.canvas.getObjects().length) {
      this.newGroup();
    }

    this._updatePoints(options);

    this.t1 = new Date().getTime();
    this.brush.new_stroke(pointer.x, pointer.y);
  },

  onMouseMove: function (pointer, options) {
    if (!this.canvas._isMainEvent(options.e)) {
      return;
    }

    if (options.e.buttons !== 1) return;

    let pressure;

    let { pressure: pressurePointer, pointerType } = options.e;

    // Pen
    if (pointerType === "pen") {
      // Pointer pressure
      if (!pressure) pressure = pressurePointer;

      if ((!pressure && !pressurePointer) || pressure === 0)
        pressure = parseFloat(this.range_brush_pressure.value);
    }

    // Mouse
    if (pointerType === "mouse" || pointerType === "touch") {
      if (pressure === undefined || pressure === 0) {
        pressure = parseFloat(this.range_brush_pressure.value);
      }
    }

    this.range_brush_pressure.nextElementSibling.textContent =
      pressure.toFixed(2);
    this.range_brush_pressure.style.background = rangeGradient(
      this.range_brush_pressure
    );

    const time = (new Date().getTime() - this.t1) / 1000;

    if (this._options["default"].points.length > 1) {
      for (let p_key in this._options) {
        const pointVal = this._options[p_key];
        if (pointVal.enable && pointVal.points.length > 1) {
          this.brush.states[0] = pointVal.points[pointVal.points.length - 2].x;
          this.brush.states[1] = pointVal.points[pointVal.points.length - 2].y;

          this.brush.stroke_to(
            pointVal.points[pointVal.points.length - 1].x,
            pointVal.points[pointVal.points.length - 1].y,
            pressure,
            90,
            0,
            time
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

    const canvasToImage = this.canvas.upperCanvasEl.toDataURL();
    fabric.Image.fromURL(canvasToImage, (myImg) => {
      const imageCanv = myImg.set({
        left: this.group.left - this.group.width / 2,
        top: this.group.top - this.group.height / 2,
        originX: "left",
        originY: "top",
        width: myImg.width,
        height: myImg.height,
        mypaintlib: true,
      });
      this.canvas.clearContext(this.ctx);
      this.group.add(imageCanv);
      this.canvas.add(new fabric.Image("")); // empty object, hook
      this.canvas.requestRenderAll();
    });

    Object.keys(this._options).forEach(
      (p_key) => (this._options[p_key].points = [])
    );

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

export { svgSymmetryButtons };
