/*
 * Title: Brushes module
 * Author: AlekPet
 * Github: https://github.com/AlekPet
 * Github extensions ComfyUI: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */
import { fabric } from "./fabric.js";

// RGB, HSV, and HSL color conversion algorithms in JavaScript https://gist.github.com/mjackson/5311256
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  let max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    h,
    s,
    v = max,
    d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h, s, v];
}

const charcoal = {
  opaque: {
    base_value: 0.4,
    pointsList: { pressure: [0.0, 0.0, 1.0, 0.4] },
  },
  opaque_multiply: {
    base_value: 0.0,
    pointsList: { pressure: [0.0, 0.0, 1.0, 1.0] },
  },
  opaque_linearize: { base_value: 0.0 },
  radius_logarithmic: { base_value: 0.7 },
  hardness: { base_value: 0.2 },
  dabs_per_basic_radius: { base_value: 0.0 },
  dabs_per_actual_radius: { base_value: 5.0 },
  dabs_per_second: { base_value: 0.0 },
  radius_by_random: { base_value: 0.0 },
  speed1_slowness: { base_value: 0.04 },
  speed2_slowness: { base_value: 0.8 },
  speed1_gamma: { base_value: 4.0 },
  speed2_gamma: { base_value: 4.0 },
  offset_by_random: {
    base_value: 1.6,
    pointsList: { pressure: [0.0, 0.0, 1.0, -1.4] },
  },
  offset_by_speed: { base_value: 0.0 },
  offset_by_speed_slowness: { base_value: 1.0 },
  slow_tracking: { base_value: 2.0 },
  slow_tracking_per_dab: { base_value: 0.0 },
  tracking_noise: { base_value: 0.0 },
  color_h: { base_value: 0.0 },
  color_s: { base_value: 0.0 },
  color_v: { base_value: 0.0 },
  change_color_h: { base_value: 0.0 },
  change_color_l: { base_value: 0.0 },
  change_color_hsl_s: { base_value: 0.0 },
  change_color_v: { base_value: 0.0 },
  change_color_hsv_s: { base_value: 0.0 },
  smudge: { base_value: 0.0 },
  smudge_length: { base_value: 0.5 },
  smudge_radius_log: { base_value: 0.0 },
  eraser: { base_value: 0.0 },
  stroke_threshold: { base_value: 0.0 },
  stroke_duration_logarithmic: { base_value: 4.0 },
  stroke_holdtime: { base_value: 0.0 },
  custom_input: { base_value: 0.0 },
  custom_input_slowness: { base_value: 0.0 },
  elliptical_dab_ratio: { base_value: 1.0 },
  elliptical_dab_angle: { base_value: 90.0 },
  direction_filter: { base_value: 2.0 },
  version: { base_value: 2.0 },
};

// Brush symmetry
fabric.SymmetryBrushAndBrushMyPaint = fabric.util.createClass(
  fabric.BaseBrush,
  {
    initialize: function (canvas, libmypaint = false) {
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

      this.libmypaint = libmypaint;

      if (this.libmypaint) {
        this._options.width_x.enable = false;
        this.surface = new MypaintSurface(this.canvas);
        this.brush = new MypaintBrush(charcoal, this.surface);
        this.mousepressure = 45; // document.getElementById("mousepressure");
      }
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
        new fabric.Point(
          this.canvas.width - options.pointer.x,
          options.pointer.y
        )
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
        new fabric.Point(
          options.pointer.y,
          this.canvas.width - options.pointer.x
        )
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
      let styleSetting = {
        fill: null,
        stroke: this.color,
        strokeWidth: this.width,
        strokeLineCap: this.strokeLineCap,
        strokeMiterLimit: this.strokeMiterLimit,
        strokeLineJoin: this.strokeLineJoin,
        strokeDashArray: this.strokeDashArray,
      };

      if (this.libmypaint)
        styleSetting = {
          fill: null,
        };

      var path = new fabric.Path(pathData, styleSetting);
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

      if (this.libmypaint) {
        this.t1 = new Date().getTime();
        this.brush.new_stroke(pointer.x, pointer.y);
      }
    },

    onMouseMove: function (pointer, options) {
      if (!this.canvas._isMainEvent(options.e)) {
        return;
      }

      if (options.e.buttons !== 1) return;

      let pressure = 0.5;
      if (this.libmypaint) {
        let { pressure: pressurePointer, pointerType } = options.e;

        let pressure;

        // Pen
        if (pointerType === "pen") {
          // Pointer pressure
          if (!pressure) pressure = pressurePointer;

          if ((!pressure && !pressurePointer) || pressure === 0)
            pressure = this.mousepressure / 100;
        }

        // Mouse
        if (pointerType === "mouse" || pointerType === "touch") {
          if (pressure === undefined || pressure === 0) {
            pressure = this.mousepressure / 100;
          }
        }
      }

      if (this._options["default"].points.length > 1) {
        for (let p_key in this._options) {
          const pointVal = this._options[p_key];
          if (pointVal.enable && pointVal.points.length > 0) {
            // libmypaint
            if (this.libmypaint) {
              const time = (new Date().getTime() - this.t1) / 1000;

              this.brush.states[0] =
                pointVal.points[pointVal.points.length - 2].x;
              this.brush.states[1] =
                pointVal.points[pointVal.points.length - 2].y;

              this.brush.stroke_to(
                this.surface,
                pointVal.points[pointVal.points.length - 1].x,
                pointVal.points[pointVal.points.length - 1].y,
                pressure,
                90,
                0,
                time
              );
            } else {
              // default fabricjs draw
              this._drawSegment(
                pointVal.points[pointVal.points.length - 2],
                pointVal.points[pointVal.points.length - 1]
              );
            }
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
  }
);

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

export default fabric.SymmetryBrushAndBrushMyPaint;

export { svgSymmetryButtons };
