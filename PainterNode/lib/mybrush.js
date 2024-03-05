/*
	brushlib - The MyPaint Brush Library

	Copyright (C) 2007-2011 Martin Renold <martinxyz@gmx.ch>
	
	Permission to use, copy, modify, and/or distribute this software for any
	purpose with or without fee is hereby granted, provided that the above
	copyright notice and this permission notice appear in all copies.

	THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
	WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
	MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
	ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
	WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
	ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
	OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
	
	=======================================================================
	brushlib - The MyPaint Brush Library - Javascript Version
	Ported from brushlib in mypaint 0.9.1
	http://gitorious.org/mypaint/mypaint/trees/master/brushlib
	http://wiki.mypaint.info/Brushlib
	
	Author: Yap Cheah Shen  yapcheahshen@gmail.com
	online demo: http://www.ksana.tw/mypaint/
	source code: https://github.com/yapcheahshen/brushlib.js
	
	Date:  2011/9/27
	Licence: same as original version of brushlib in C++
	
	Dependencies: Browser with HTML5 support ( tested on Chrome, Firefox and iOS safari)
	
	Notes:
	1) use bezierTo and CreateRadialGradient instead of CanvasPixelArray , for speed consideration.
	2) on modern browser , drawing speed is  about 3~5 times slower than C++.
	3) brush setting is converted to JSON format. ( see charcoal.myb.js )
	
	Todo:
	1) Read mypaint brush setting (python format?) .
	2) testing on IE9 and Android.
	3) furthur optimization on iPad.
	4) watercolor.myb is not identical with the original version yet.

*/

(function (window, undefined) {
  var document = window.document,
    navigator = window.navigator,
    location = window.location;

  const ACTUAL_RADIUS_MIN = 0.2;
  const ACTUAL_RADIUS_MAX = 800; // safety guard against radius like 1e20 and against rendering overload with unexpected brush dynamics
  const INPUT = {
    PRESSURE: 0,
    SPEED1: 1,
    SPEED2: 2,
    RANDOM: 3,
    STROKE: 4,
    DIRECTION: 5,
    TILT_DECLINATION: 6,
    TILT_ASCENSION: 7,
    CUSTOM: 8,
    COUNT: 9,
  };

  const BRUSH = {
    OPAQUE: 0,
    OPAQUE_MULTIPLY: 1,
    OPAQUE_LINEARIZE: 2,
    RADIUS_LOGARITHMIC: 3,
    HARDNESS: 4,
    DABS_PER_BASIC_RADIUS: 5,
    DABS_PER_ACTUAL_RADIUS: 6,
    DABS_PER_SECOND: 7,
    RADIUS_BY_RANDOM: 8,
    SPEED1_SLOWNESS: 9,
    SPEED2_SLOWNESS: 10,
    SPEED1_GAMMA: 11,
    SPEED2_GAMMA: 12,
    OFFSET_BY_RANDOM: 13,
    OFFSET_BY_SPEED: 14,
    OFFSET_BY_SPEED_SLOWNESS: 15,
    SLOW_TRACKING: 16,
    SLOW_TRACKING_PER_DAB: 17,
    TRACKING_NOISE: 18,
    COLOR_HUE: 19,
    COLOR_H: 19,
    COLOR_SATURATION: 20,
    COLOR_S: 20,
    COLOR_VALUE: 21,
    COLOR_V: 21,
    CHANGE_COLOR_H: 22,
    CHANGE_COLOR_L: 23,
    CHANGE_COLOR_HSL_S: 24,
    CHANGE_COLOR_V: 25,
    CHANGE_COLOR_HSV_S: 26,
    SMUDGE: 27,
    SMUDGE_LENGTH: 28,
    SMUDGE_RADIUS_LOG: 29,
    ERASER: 30,
    STROKE_TRESHOLD: 31, // miss spelling in .myb file
    STROKE_THRESHOLD: 31,
    STROKE_DURATION_LOGARITHMIC: 32,
    STROKE_HOLDTIME: 33,
    CUSTOM_INPUT: 34,
    CUSTOM_INPUT_SLOWNESS: 35,
    ELLIPTICAL_DAB_RATIO: 36,
    ELLIPTICAL_DAB_ANGLE: 37,
    DIRECTION_FILTER: 38,
    VERSION: 39,
    ANTI_ALIASING: 40,
    SETTINGS_COUNT: 41,

    //obsolute
    ADAPT_COLOR_FROM_IMAGE: 1000,
    CHANGE_RADIUS: 1000,
    GROUP: 1000,
  };
  const STATE = {
    X: 0,
    Y: 1,
    PRESSURE: 2,
    DIST: 3,
    ACTUAL_RADIUS: 4,
    SMUDGE_RA: 5,
    SMUDGE_GA: 6,
    SMUDGE_BA: 7,
    SMUDGE_A: 8,
    ACTUAL_X: 9,
    ACTUAL_Y: 10,
    NORM_DX_SLOW: 11,
    NORM_DY_SLOW: 12,
    NORM_SPEED1_SLOW: 13,
    NORM_SPEED2_SLOW: 14,
    STROKE: 15,
    STROKE_STARTED: 16,
    CUSTOM_INPUT: 17,
    RNG_SEED: 18,
    ACTUAL_ELLIPTICAL_DAB_RATIO: 19,
    ACTUAL_ELLIPTICAL_DAB_ANGLE: 20,
    DIRECTION_DX: 21,
    DIRECTION_DY: 22,
    DECLINATION: 23,
    ASCENSION: 24,
    COUNT: 25,
  };

  const MAX_DTIME = 100; // 5

  class AssertException {
    constructor(message) {
      this.message = message;
    }
    toString() {
      return "AssertException: " + this.message;
    }
  }

  function assert(exp, message) {
    if (!exp) {
      throw new AssertException(message);
    }
  }

  function hypotf(a, b) {
    return Math.sqrt(a * a + b * b);
  }

  function hypot(a, b) {
    return Math.sqrt(a * a + b * b);
  }

  function clamp(v, min, max) {
    if (v > max) return max;
    else if (v < min) return min;
    else return v;
  }

  function fmodf(a, b) {
    return Math.floor(((a / b) % 1.0) * b);
  }

  function rand_gauss() {
    let sum = 0.0;
    const rand1 = Math.ceil(Math.random() * 0x7ffffff);
    const rand2 = Math.ceil(Math.random() * 0x7ffffff);
    sum += rand1 & 0x7fff;
    sum += (rand1 >> 16) & 0x7fff;
    sum += rand2 & 0x7fff;
    sum += (rand2 >> 16) & 0x7fff;
    return sum * 5.28596089837e-5 - 3.46410161514;
  }

  function max3(a, b, c) {
    return a > b ? Math.max(a, c) : Math.max(b, c);
  }

  function min3(a, b, c) {
    return a < b ? Math.min(a, c) : Math.min(b, c);
  }

  class ColorRGB {
    constructor(r_, g_, b_) {
      this.r = r_;
      this.g = g_;
      this.b = b_;
      this.h = 0;
      this.s = 0;
      this.v = 0;
      this.l = 0;
    }

    rgb_to_hsv_float() {
      let max, min, delta;
      let h, s, v;

      this.r = clamp(this.r, 0.0, 1.0);
      this.g = clamp(this.g, 0.0, 1.0);
      this.b = clamp(this.b, 0.0, 1.0);

      h = this.h;
      s = this.s;
      v = this.v;

      max = max3(this.r, this.g, this.b);
      min = min3(this.r, this.g, this.b);

      v = max;
      delta = max - min;

      if (delta > 0.0001) {
        s = delta / max;

        if (this.r === max) {
          h = (this.g - this.b) / delta;
          if (h < 0.0) h += 6.0;
        } else if (this.g === max) {
          h = 2.0 + (this.b - this.r) / delta;
        } else if (this.b === max) {
          h = 4.0 + (this.r - this.g) / delta;
        }

        h /= 6.0;
      } else {
        s = 0.0;
        h = 0.0;
      }
      this.h = h;
      this.s = s;
      this.v = v;
    }

    rgb_to_hsl_float() {
      let max, min, delta;
      let h, s, l;
      let { r, g, b } = this;

      r = clamp(r, 0.0, 1.0);
      g = clamp(g, 0.0, 1.0);
      b = clamp(b, 0.0, 1.0);
      max = max3(r, g, b);
      min = min3(r, g, b);
      l = (max + min) / 2.0;
      if (max === min) {
        s = 0.0;
        h = 0.0; //GIMP_HSL_UNDEFINED;
      } else {
        if (l <= 0.5) s = (max - min) / (max + min);
        else s = (max - min) / (2.0 - max - min);
        delta = max - min;
        if (delta === 0.0) delta = 1.0;
        if (r === max) {
          h = (g - b) / delta;
        } else if (g === max) {
          h = 2.0 + (b - r) / delta;
        } else if (b === max) {
          h = 4.0 + (r - g) / delta;
        }
        h /= 6.0;
        if (h < 0.0) h += 1.0;
      }
      this.h = h;
      this.s = s;
      this.l = l;
    }
  } // end of ColorRGB

  class ColorHSV {
    constructor(h_, s_, v_) {
      this.h = h_;
      this.s = s_;
      this.v = v_;
      this.r = 0;
      this.g = 0;
      this.b = 0;
    }

    hsv_to_rgb_float() {
      let i;
      let f, w, q, t;
      let r = 0.0,
        g = 0.0,
        b = 0.0; // silence gcc warning

      let { h, s, v } = this;
      h = h - Math.floor(h);
      s = clamp(s, 0.0, 1.0);
      v = clamp(v, 0.0, 1.0);

      let hue;
      if (s === 0.0) {
        r = v;
        g = v;
        b = v;
      } else {
        hue = h;
        if (hue === 1.0) hue = 0.0;
        hue *= 6.0;
        i = Math.floor(hue);
        f = hue - i;
        w = v * (1.0 - s);
        q = v * (1.0 - s * f);
        t = v * (1.0 - s * (1.0 - f));

        switch (i) {
          case 0:
            r = v;
            g = t;
            b = w;
            break;
          case 1:
            r = q;
            g = v;
            b = w;
            break;
          case 2:
            r = w;
            g = v;
            b = t;
            break;
          case 3:
            r = w;
            g = q;
            b = v;
            break;
          case 4:
            r = t;
            g = w;
            b = v;
            break;
          case 5:
            r = v;
            g = w;
            b = q;
            break;
        }
      }

      this.r = r;
      this.g = g;
      this.b = b;
    }
  }

  function hsl_value(n1, n2, hue) {
    let val;
    if (hue > 6.0) hue -= 6.0;
    else if (hue < 0.0) hue += 6.0;
    if (hue < 1.0) val = n1 + (n2 - n1) * hue;
    else if (hue < 3.0) val = n2;
    else if (hue < 4.0) val = n1 + (n2 - n1) * (4.0 - hue);
    else val = n1;
    return val;
  }

  class ColorHSL {
    constructor(h, s, l) {
      this.h = h;
      this.s = s;
      this.l = l;
      this.r = 0;
      this.g = 0;
      this.b = 0;
    }

    hsl_to_rgb_float() {
      let r, g, b;
      let { h, s, l } = this;

      h = h - Math.floor(h);
      s = clamp(s, 0.0, 1.0);
      l = clamp(l, 0.0, 1.0);
      if (s === 0) {
        r = l;
        g = l;
        b = l;
      } else {
        let m1, m2;
        if (l <= 0.5) {
          m2 = l * (1.0 + s);
        } else {
          m2 = l + s - l * s;
        }

        m1 = 2.0 * l - m2;
        r = hsl_value(m1, m2, h * 6.0 + 2.0);
        g = hsl_value(m1, m2, h * 6.0);
        b = hsl_value(m1, m2, h * 6.0 - 2.0);
      }
      this.r = r;
      this.g = g;
      this.b = b;
    }
  } //End of ColorHSL

  class ControlPoints {
    constructor() {
      this.xvalues = new Array(8);
      this.yvalues = new Array(8);
      this.n = 0;
    }
  }

  // http://www.williammalone.com/briefs/how-to-draw-ellipse-html5-canvas/
  function drawEllipse(
    context,
    centerX,
    centerY,
    r,
    aspect_ratio,
    color_r,
    color_g,
    color_b,
    angle
  ) {}

  class MypaintSurface {
    _hardness = 0.5;
    _opaque = 1.0;

    constructor(canvas) {
      this.r = 0;
      this.g = 0;
      this.b = 0;
      this.dab_count = 0; //javascript only
      this.getcolor_count = 0;

      if (typeof canvas === "string" && canvas instanceof String) {
        this.canvas = document.getElementById(canvas);
        this.context = this.canvas.getContext("2d", {
          willReadFrequently: true,
        });
      } else if (canvas instanceof HTMLCanvasElement) {
        this.canvas = canvas;
        this.context = this.canvas.getContext("2d", {
          willReadFrequently: true,
        });
      } else if (
        typeof canvas === "object" &&
        canvas.hasOwnProperty("contextTop")
      ) {
        this.canvas = canvas;
        this.context = this.canvas.contextTop;
      }
    }

    draw_dab(
      x,
      y,
      radius,
      color_r,
      color_g,
      color_b,
      opaque,
      hardness,
      alpha_eraser,
      aspect_ratio,
      angle
    ) {
      if (opaque === 0) return;

      this.dab_count++;

      const height = (radius * 2) / aspect_ratio;
      const width = radius * 2 * 1.3;

      const rr = Math.floor(color_r * 256);
      const gg = Math.floor(color_g * 256);
      const bb = Math.floor(color_b * 256);

      this.context.beginPath();
      this.context.save();
      this.context.translate(x, y);

      let g1;
      if (hardness < 1) {
        g1 = this.context.createRadialGradient(0, 0, 0, 0, 0, radius);
        g1.addColorStop(hardness, `rgba(${rr},${gg},${bb},${opaque})`);
        g1.addColorStop(1, `rgba(${rr},${gg},${bb},0)`);
      } else {
        g1 = `rgba(${rr},${gg},${bb},${opaque})`;
      }

      this.context.rotate(90 + angle);
      this.context.moveTo(0, -height / 2); // A1
      this.context.bezierCurveTo(
        width / 2,
        -height / 2,
        width / 2,
        height / 2,
        0,
        height / 2
      ); // A2

      this.context.bezierCurveTo(
        -width / 2,
        height / 2,
        -width / 2,
        -height / 2,
        0,
        -height / 2
      );

      this.context.fillStyle = g1;
      this.context.fill();
      this.context.restore();
      this.context.closePath();
      //console.log( " x:"+x+"y:"+y+"radius:"+radius+"aratio:"+aspect_ratio+"angle:"+angl/e+"opaque:"+opaque+"hardness"+hardness);
      //console.log("r:"+color_r+".g:"+color_g+",b:"+color_b);
    }

    get_color(x, y, radius) {
      //ignore radius, otherwise it is extremely slow
      this.getcolor_count++;

      const imgd = this.context.getImageData(x, y, 1, 1);
      const pix = imgd.data;
      this.r = pix[0] / 255;
      this.g = pix[1] / 255;
      this.b = pix[2] / 255;
      this.a = pix[3] / 255;
    }

    clearCanvas(color = "rgba(255,255,255,255)") {
      this.context.fillStyle = color;
      this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  class Mapping {
    constructor(inputcount) {
      this.inputs = inputcount;
      this.inputs_used = 0; // optimization
      this.pointsList = new Array(inputcount);
      for (let i = 0; i < inputcount; i++)
        this.pointsList[i] = new ControlPoints();

      this.base_value = 0;
    }

    set_n(input, n) {
      const p = this.pointsList[input];
      if (n !== 0 && p.n === 0) inputs_used++;
      if (n === 0 && p.n !== 0) inputs_used--;
      p.n = n;
    }

    set_point(input, index, x, y) {
      const p = this.pointsList[input];

      if (index > 0) {
        assert(x >= p.xvalues[index - 1], " x must > p->xvalues[index-1]");
      }

      p.xvalues[index] = x;
      p.yvalues[index] = y;
    }

    is_constant() {
      return this.inputs_used === 0;
    }

    calculate(data) {
      let result = this.base_value;

      if (this.inputs_used === 0) return result;

      for (let j = 0; j < this.inputs; j++) {
        const p = this.pointsList[j];

        if (p.n) {
          let x, y;
          x = data[j];

          // find the segment with the slope that we need to use
          let [x0, x1] = p.xvalues;
          let [y0, y1] = p.yvalues;

          for (let i = 2; i < p.n && x > x1; i++) {
            x0 = x1;
            y0 = y1;
            x1 = p.xvalues[i];
            y1 = p.yvalues[i];
          }

          if (x0 === x1) {
            y = y0;
          } else {
            // linear interpolation
            y = (y1 * (x - x0) + y0 * (x1 - x)) / (x1 - x0);
          }

          result += y;
        }
      }
      return result;
    }

    // used in python for the global pressure mapping
    calculate_single_input(input) {
      assert(inputs === 1, "inputs must equal 1");
      return calculate(input);
    }
  }

  class MypaintBrush {
    constructor(brushsetting, surface) {
      this.states = new Array(STATE.COUNT);
      this.settings = new Array(BRUSH.SETTINGS_COUNT);
      this.settings_value = new Array(BRUSH.SETTINGS_COUNT);
      this.speed_mapping_gamma = new Array(2);
      this.speed_mapping_m = new Array(2);
      this.speed_mapping_q = new Array(2);
      this.stroke_current_idling_time = 0;
      this.stroke_total_painting_time = 0;

      this.surface = surface;

      for (let i = 0; i < BRUSH.SETTINGS_COUNT; i++) {
        this.settings[i] = new Mapping(INPUT.COUNT);
      }

      this.print_inputs = false;

      for (let i = 0; i < STATE.COUNT; i++) this.states[i] = 0;

      this.readmyb_json(brushsetting);
    }

    new_stroke(x, y) {
      for (let i = 0; i < STATE.COUNT; i++) {
        this.states[i] = 0;
        this.settings_value[i] = 0;
      }

      this.states[STATE.X] = x;
      this.states[STATE.Y] = y;
      this.states[STATE.STROKE] = 0;
      this.states[STATE.STROKE_STARTED] = 0;

      this.stroke_current_idling_time = 0;
      this.stroke_total_painting_time = 0;

      this.surface.dab_count = 0;
      this.surface.getcolor_count = 0;
      this.stroke_to(x, y, 0, 0, 0, 10);
    }

    set_base_value(id, value) {
      assert(id >= 0 && id < BRUSH.SETTINGS_COUNT, "id < BRUSH.SETTINGS_COUNT");
      this.settings[id].base_value = value;

      this.settings_base_values_have_changed();
    }

    set_mapping_n(id, input, n) {
      assert(id >= 0 && id < BRUSH.SETTINGS_COUNT, "id <BRUSH.SETTINGS_COUNT");
      this.settings[id].set_n(input, n);
    }

    set_mapping_point(id, input, index, x, y) {
      assert(id >= 0 && id < BRUSH.SETTINGS_COUNT, "id<BRUSH.SETTINGS_COUNT");
      this.settings[id].set_point(input, index, x, y);
    }

    exp_decay(T_const, t) {
      // the argument might not make mathematical sense (whatever.)
      return T_const <= 0.001 ? 0.0 : Math.exp(-t / T_const);
    }

    settings_base_values_have_changed() {
      for (let i = 0; i < 2; i++) {
        let gamma =
          i === 0
            ? this.settings[BRUSH.SPEED1_GAMMA].base_value
            : this.settings[BRUSH.SPEED2_GAMMA].base_value;

        gamma = Math.exp(gamma);

        const fix1_x = 45.0;
        const fix1_y = 0.5;
        const fix2_x = 45.0;
        const fix2_dy = 0.015;

        let m, q, c1;
        c1 = Math.log(fix1_x + gamma);
        m = fix2_dy * (fix2_x + gamma);
        q = fix1_y - m * c1;

        this.speed_mapping_gamma[i] = gamma;
        this.speed_mapping_m[i] = m;
        this.speed_mapping_q[i] = q;
      }
    }

    readmyb_json(settings) {
      for (const setting in settings) {
        const currentSetting = setting.toUpperCase();

        if (!BRUSH.hasOwnProperty(currentSetting)) {
          console.error(`Not found: ${currentSetting}`);
          continue;
        }

        const idx = BRUSH[currentSetting];
        if (idx >= BRUSH.SETTINGS_COUNT) continue; //obsolute setting name , e.g ADAPT_COLOR_FROM_IMAGE

        const m = this.settings[idx];
        m.base_value = settings[setting].base_value;
        m.inputs_used = 0;

        const settingsPointsList = settings[setting].pointsList;
        for (const prop in settingsPointsList) {
          const propidx = INPUT[prop.toUpperCase()];
          m.pointsList[propidx].n = settingsPointsList[prop].length / 2;

          for (let i = 0; i < m.pointsList[propidx].n; i++) {
            m.pointsList[propidx].xvalues[i] =
              settings[setting].pointsList[prop][i * 2];
            m.pointsList[propidx].yvalues[i] =
              settings[setting].pointsList[prop][i * 2 + 1];
          }
          m.inputs_used = 1;
        }
      }
      this.settings_base_values_have_changed();
    }

    update_states_and_setting_values(
      step_dx,
      step_dy,
      step_dpressure,
      step_declination,
      step_ascension,
      step_dtime
    ) {
      let pressure;
      let inputs = new Array(INPUT.COUNT);

      if (step_dtime < 0.0) {
        //printf("Time is running backwards!\n");
        step_dtime = 0.001;
      } else if (step_dtime === 0.0) {
        // FIXME: happens about every 10th start, workaround (against division by zero)
        step_dtime = 0.001;
      }

      this.states[STATE.X] += step_dx;
      this.states[STATE.Y] += step_dy;
      this.states[STATE.PRESSURE] += step_dpressure;

      this.states[STATE.DECLINATION] += step_declination;
      this.states[STATE.ASCENSION] += step_ascension;

      var base_radius = Math.exp(
        this.settings[BRUSH.RADIUS_LOGARITHMIC].base_value
      );

      // FIXME: does happen (interpolation problem?)
      this.states[STATE.PRESSURE] = clamp(
        this.states[STATE.PRESSURE],
        0.0,
        1.0
      );

      pressure = this.states[STATE.PRESSURE];

      {
        // start / end stroke (for "stroke" input only)
        if (!this.states[STATE.STROKE_STARTED]) {
          if (
            pressure >
            this.settings[BRUSH.STROKE_TRESHOLD].base_value + 0.0001
          ) {
            // start new stroke     //printf("stroke start %f\n", pressure);
            this.states[STATE.STROKE_STARTED] = 1;
            this.states[STATE.STROKE] = 0.0;
          }
        } else {
          if (
            pressure <=
            this.settings[BRUSH.STROKE_TRESHOLD].base_value * 0.9 + 0.0001
          ) {
            // end stroke      //printf("stroke end\n");
            this.states[STATE.STROKE_STARTED] = 0;
          }
        }
      }

      // now follows input handling
      const norm_dx = step_dx / step_dtime / base_radius;
      const norm_dy = step_dy / step_dtime / base_radius;
      const norm_speed = Math.sqrt(norm_dx * norm_dx + norm_dy * norm_dy);
      const norm_dist = norm_speed * step_dtime;

      inputs[INPUT.PRESSURE] = pressure;
      inputs[INPUT.SPEED1] =
        Math.log(
          this.speed_mapping_gamma[0] + this.states[STATE.NORM_SPEED1_SLOW]
        ) *
          this.speed_mapping_m[0] +
        this.speed_mapping_q[0];

      inputs[INPUT.SPEED2] =
        Math.log(
          this.speed_mapping_gamma[1] + this.states[STATE.NORM_SPEED2_SLOW]
        ) *
          this.speed_mapping_m[1] +
        this.speed_mapping_q[1];

      inputs[INPUT.RANDOM] = Math.random(); //g_rand_double (rng);
      inputs[INPUT.STROKE] = Math.min(this.states[STATE.STROKE], 1.0);
      inputs[INPUT.DIRECTION] = fmodf(
        (Math.atan2(
          this.states[STATE.DIRECTION_DY],
          this.states[STATE.DIRECTION_DX]
        ) /
          (2 * Math.PI)) *
          360 +
          180.0,
        180.0
      );
      inputs[INPUT.TILT_DECLINATION] = this.states[STATE.DECLINATION];
      inputs[INPUT.TILT_ASCENSION] = this.states[STATE.ASCENSION];
      inputs[INPUT.CUSTOM] = this.states[STATE.CUSTOM_INPUT];

      if (this.print_inputs) {
        //g_print("press=% 4.3f, speed1=% 4.4f\tspeed2=% 4.4f\tstroke=% 4.3f\tcustom=% 4.3f\n", (double)inputs[INPUT.PRESSURE], (double)inputs[INPUT.SPEED1], (double)inputs[INPUT.SPEED2], (double)inputs[INPUT.STROKE], (double)inputs[INPUT.CUSTOM]);
      }
      // FIXME: this one fails!!!
      //assert(inputs[INPUT.SPEED1] >= 0.0 && inputs[INPUT.SPEED1] < 1e8); // checking for inf

      let aa;
      for (let i = 0; i < BRUSH.SETTINGS_COUNT; i++) {
        if (i === BRUSH.ELLIPTICAL_DAB_RATIO) aa = 0;
        this.settings_value[i] = this.settings[i].calculate(inputs);
      }

      {
        const fac =
          1.0 -
          this.exp_decay(this.settings_value[BRUSH.SLOW_TRACKING_PER_DAB], 1.0);

        this.states[STATE.ACTUAL_X] +=
          (this.states[STATE.X] - this.states[STATE.ACTUAL_X]) * fac; // FIXME: should this depend on base radius?
        this.states[STATE.ACTUAL_Y] +=
          (this.states[STATE.Y] - this.states[STATE.ACTUAL_Y]) * fac;
      }

      {
        // slow speed
        let fac =
          1.0 -
          this.exp_decay(
            this.settings_value[BRUSH.SPEED1_SLOWNESS],
            step_dtime
          );

        this.states[STATE.NORM_SPEED1_SLOW] +=
          (norm_speed - this.states[STATE.NORM_SPEED1_SLOW]) * fac;

        fac =
          1.0 -
          this.exp_decay(
            this.settings_value[BRUSH.SPEED2_SLOWNESS],
            step_dtime
          );
        this.states[STATE.NORM_SPEED2_SLOW] +=
          (norm_speed - this.states[STATE.NORM_SPEED2_SLOW]) * fac;
      }

      {
        // slow speed, but as vector this time

        // FIXME: offset_by_speed should be removed.
        //   Is it broken, non-smooth, system-dependent math?!
        //   A replacement could be a directed random offset.

        let time_constant =
          Math.exp(this.settings_value[BRUSH.OFFSET_BY_SPEED_SLOWNESS] * 0.01) -
          1.0;
        // Workaround for a bug that happens mainly on Windows, causing
        // individual dabs to be placed far far away. Using the speed
        // with zero filtering is just asking for trouble anyway.
        if (time_constant < 0.002) time_constant = 0.002;

        const fac = 1.0 - this.exp_decay(time_constant, step_dtime);

        this.states[STATE.NORM_DX_SLOW] +=
          (norm_dx - this.states[STATE.NORM_DX_SLOW]) * fac;
        this.states[STATE.NORM_DY_SLOW] +=
          (norm_dy - this.states[STATE.NORM_DY_SLOW]) * fac;
      }

      {
        // orientation (similar lowpass filter as above, but use dabtime instead of wallclock time)
        let dx = step_dx / base_radius;
        let dy = step_dy / base_radius;

        const step_in_dabtime = hypotf(dx, dy); // FIXME: are we recalculating something here that we already have?
        const fac =
          1.0 -
          this.exp_decay(
            Math.exp(this.settings_value[BRUSH.DIRECTION_FILTER] * 0.5) - 1.0,
            step_in_dabtime
          );

        const dx_old = this.states[STATE.DIRECTION_DX];
        const dy_old = this.states[STATE.DIRECTION_DY];
        // use the opposite speed vector if it is closer (we don't care about 180 degree turns)
        if (
          Math.sqrt(dx_old - dx) + Math.sqrt(dy_old - dy) >
          Math.sqrt(dx_old - -dx) + Math.sqrt(dy_old - -dy)
        ) {
          dx = -dx;
          dy = -dy;
        }

        this.states[STATE.DIRECTION_DX] +=
          (dx - this.states[STATE.DIRECTION_DX]) * fac;
        this.states[STATE.DIRECTION_DY] +=
          (dy - this.states[STATE.DIRECTION_DY]) * fac;
      }

      {
        // custom input
        const fac =
          1.0 -
          this.exp_decay(this.settings_value[BRUSH.CUSTOM_INPUT.SLOWNESS], 0.1);

        this.states[STATE.CUSTOM_INPUT] +=
          (this.settings_value[BRUSH.CUSTOM_INPUT] -
            this.states[STATE.CUSTOM_INPUT]) *
          fac;
      }

      {
        // stroke length
        const frequency = Math.exp(
          -this.settings_value[BRUSH.STROKE_DURATION_LOGARITHMIC]
        );

        this.states[STATE.STROKE] += norm_dist * frequency;

        // can happen, probably caused by rounding
        if (this.states[STATE.STROKE] < 0) this.states[STATE.STROKE] = 0;

        const wrap = 1.0 + this.settings_value[BRUSH.STROKE_HOLDTIME];
        if (this.states[STATE.STROKE] > wrap) {
          if (wrap > 9.9 + 1.0) {
            // "inifinity", just hold stroke somewhere >= 1.0
            this.states[STATE.STROKE] = 1.0;
          } else {
            this.states[STATE.STROKE] = fmodf(this.states[STATE.STROKE], wrap);
            // just in case
            if (this.states[STATE.STROKE] < 0) this.states[STATE.STROKE] = 0;
          }
        }
      }

      // calculate final radius
      const radius_log = this.settings_value[BRUSH.RADIUS_LOGARITHMIC];

      this.states[STATE.ACTUAL_RADIUS] = Math.exp(radius_log);
      if (this.states[STATE.ACTUAL_RADIUS] < ACTUAL_RADIUS_MIN)
        this.states[STATE.ACTUAL_RADIUS] = ACTUAL_RADIUS_MIN;

      if (this.states[STATE.ACTUAL_RADIUS] > ACTUAL_RADIUS_MAX)
        this.states[STATE.ACTUAL_RADIUS] = ACTUAL_RADIUS_MAX;

      // aspect ratio (needs to be caluclated here because it can affect the dab spacing)
      this.states[STATE.ACTUAL_ELLIPTICAL_DAB_RATIO] =
        this.settings_value[BRUSH.ELLIPTICAL_DAB_RATIO];

      this.states[STATE.ACTUAL_ELLIPTICAL_DAB_ANGLE] =
        this.settings_value[BRUSH.ELLIPTICAL_DAB_ANGLE];
    }

    prepare_and_draw_dab() {
      let x, y, opaque;
      let radius;

      // ensure we don't get a positive result with two negative opaque values
      if (this.settings_value[BRUSH.OPAQUE] < 0)
        this.settings_value[BRUSH.OPAQUE] = 0;

      opaque =
        this.settings_value[BRUSH.OPAQUE] *
        this.settings_value[BRUSH.OPAQUE_MULTIPLY];
      opaque = clamp(opaque, 0.0, 1.0);

      //if (opaque === 0.0) return false; <-- cannot do that, since we need to update smudge state.
      if (this.settings_value[BRUSH.OPAQUE_LINEARIZE]) {
        // OPTIMIZE: no need to recalculate this for each dab
        let alpha, beta, alpha_dab, beta_dab;
        let dabs_per_pixel;
        // dabs_per_pixel is just estimated roughly, I didn't think hard
        // about the case when the radius changes during the stroke
        dabs_per_pixel =
          (this.settings[BRUSH.DABS_PER_ACTUAL_RADIUS].base_value +
            this.settings[BRUSH.DABS_PER_BASIC_RADIUS].base_value) *
          2.0;

        // the correction is probably not wanted if the dabs don't overlap
        if (dabs_per_pixel < 1.0) dabs_per_pixel = 1.0;

        // interpret the user-setting smoothly
        dabs_per_pixel =
          1.0 +
          this.settings[BRUSH.OPAQUE_LINEARIZE].base_value *
            (dabs_per_pixel - 1.0);

        // see doc/brushdab_saturation.png
        //      beta = beta_dab^dabs_per_pixel
        // <==> beta_dab = beta^(1/dabs_per_pixel)
        alpha = opaque;
        beta = 1.0 - alpha;
        beta_dab = Math.pow(beta, 1.0 / dabs_per_pixel);
        alpha_dab = 1.0 - beta_dab;
        opaque = alpha_dab;
      }

      x = this.states[STATE.ACTUAL_X];
      y = this.states[STATE.ACTUAL_Y];

      const base_radius = Math.exp(
        this.settings[BRUSH.RADIUS_LOGARITHMIC].base_value
      );

      if (this.settings_value[BRUSH.OFFSET_BY_SPEED]) {
        x +=
          this.states[STATE.NORM_DX_SLOW] *
          this.settings_value[BRUSH.OFFSET_BY_SPEED] *
          0.1 *
          base_radius;
        y +=
          this.states[STATE.NORM_DY_SLOW] *
          this.settings_value[BRUSH.OFFSET_BY_SPEED] *
          0.1 *
          base_radius;
      }

      if (this.settings_value[BRUSH.OFFSET_BY_RANDOM]) {
        let amp = this.settings_value[BRUSH.OFFSET_BY_RANDOM];
        if (amp < 0.0) amp = 0.0;
        x += rand_gauss() * amp * base_radius;
        y += rand_gauss() * amp * base_radius;
      }

      radius = this.states[STATE.ACTUAL_RADIUS];
      if (this.settings_value[BRUSH.RADIUS_BY_RANDOM]) {
        let radius_log, alpha_correction;

        // go back to logarithmic radius to add the noise
        radius_log = this.settings_value[BRUSH.RADIUS_LOGARITHMIC];
        radius_log +=
          rand_gauss() * this.settings_value[BRUSH.RADIUS_BY_RANDOM];

        radius = Math.exp(radius_log);
        radius = clamp(radius, ACTUAL_RADIUS_MIN, ACTUAL_RADIUS_MAX);

        alpha_correction = this.states[STATE.ACTUAL_RADIUS] / radius;
        alpha_correction = Math.sqrt(alpha_correction);

        if (alpha_correction <= 1.0) {
          opaque *= alpha_correction;
        }
      }

      // color part
      let colorhsv = new ColorHSV(
        this.settings[BRUSH.COLOR_HUE].base_value,
        this.settings[BRUSH.COLOR_SATURATION].base_value,
        this.settings[BRUSH.COLOR_VALUE].base_value
      );

      let { h: color_h, s: color_s, v: color_v } = colorhsv;
      //var color_h = this.settings[BRUSH.COLOR_HUE].base_value;
      //var color_s = this.settings[BRUSH.COLOR_SATURATION].base_value;
      //var color_v = this.settings[BRUSH.COLOR_VALUE].base_value;

      let eraser_target_alpha = 1.0;
      if (this.settings_value[BRUSH.SMUDGE] > 0.0) {
        // mix (in RGB) the smudge color with the brush color
        colorhsv.hsv_to_rgb_float();
        color_h = colorhsv.r;
        color_s = colorhsv.g;
        color_v = colorhsv.b; //after conversion, color_h,s,v is rgb

        let fac = this.settings_value[BRUSH.SMUDGE];
        if (fac > 1.0) fac = 1.0;

        // If the smudge color somewhat transparent, then the resulting
        // dab will do erasing towards that transparency level.
        // see also ../doc/smudge_math.png
        eraser_target_alpha =
          (1 - fac) * 1.0 + fac * this.states[STATE.SMUDGE_A];
        // fix rounding errors (they really seem to happen in the previous line)
        eraser_target_alpha = clamp(eraser_target_alpha, 0.0, 1.0);

        if (eraser_target_alpha > 0) {
          color_h =
            (fac * this.states[STATE.SMUDGE_RA] + (1 - fac) * color_h) /
            eraser_target_alpha;
          color_s =
            (fac * this.states[STATE.SMUDGE_GA] + (1 - fac) * color_s) /
            eraser_target_alpha;
          color_v =
            (fac * this.states[STATE.SMUDGE_BA] + (1 - fac) * color_v) /
            eraser_target_alpha;
        } else {
          // we are only erasing; the color does not matter
          color_h = 1.0;
          color_s = 0.0;
          color_v = 0.0;
        }

        const colorrgb = new ColorRGB(color_h, color_s, color_v);
        colorrgb.rgb_to_hsv_float();
        color_h = colorrgb.h;
        color_s = colorrgb.s;
        color_v = colorrgb.v;
      }

      if (
        this.settings_value[BRUSH.SMUDGE_LENGTH] < 1.0 &&
        // optimization, since normal brushes have smudge_length === 0.5 without actually smudging
        (this.settings_value[BRUSH.SMUDGE] != 0.0 ||
          !this.settings[BRUSH.SMUDGE].is_constant())
      ) {
        let smudge_radius =
          radius * Math.exp(this.settings_value[BRUSH.SMUDGE_RADIUS_LOG]);
        smudge_radius = clamp(
          smudge_radius,
          ACTUAL_RADIUS_MIN,
          ACTUAL_RADIUS_MAX
        );

        let fac = this.settings_value[BRUSH.SMUDGE_LENGTH];
        if (fac < 0.0) fac = 0;

        const px = Math.round(x);
        const py = Math.round(y);
        this.surface.get_color(px, py, smudge_radius);

        const { r, g, b, a } = this.surface;

        // updated the smudge color (stored with premultiplied alpha)
        this.states[STATE.SMUDGE_A] =
          fac * this.states[STATE.SMUDGE_A] + (1 - fac) * a;
        // fix rounding errors
        this.states[STATE.SMUDGE_A] = clamp(
          this.states[STATE.SMUDGE_A],
          0.0,
          1.0
        );

        this.states[STATE.SMUDGE_RA] =
          fac * this.states[STATE.SMUDGE_RA] + (1 - fac) * r * a;
        this.states[STATE.SMUDGE_GA] =
          fac * this.states[STATE.SMUDGE_GA] + (1 - fac) * g * a;
        this.states[STATE.SMUDGE_BA] =
          fac * this.states[STATE.SMUDGE_BA] + (1 - fac) * b * a;
      }

      // eraser
      if (this.settings_value[BRUSH.ERASER]) {
        eraser_target_alpha *= 1.0 - this.settings_value[BRUSH.ERASER];
      }

      // HSV color change
      color_h += this.settings_value[BRUSH.CHANGE_COLOR_H];
      color_s += this.settings_value[BRUSH.CHANGE_COLOR_HSV_S];
      color_v += this.settings_value[BRUSH.CHANGE_COLOR_V];

      // HSL color change
      if (
        this.settings_value[BRUSH.CHANGE_COLOR_L] ||
        this.settings_value[BRUSH.CHANGE_COLOR_HSL_S]
      ) {
        // (calculating way too much here, can be optimized if neccessary)
        // this function will CLAMP the inputs

        colorhsv = new ColorHSV(color_h, color_s, color_v);
        colorhsv.hsv_to_rgb_float();

        let colorrgb = new ColorRGB(colorhsv.r, colorhsv.g, colorhsv.b);
        colorrgb.rgb_to_hsl_float();

        colorrgb.l += this.settings_value[BRUSH.CHANGE_COLOR_L];
        colorrgb.s += this.settings_value[BRUSH.CHANGE_COLOR_HSL_S];

        const colorhsl = new ColorHSL(colorrgb.h, colorrgb.s, colorrgb.l);
        colorhsl.hsl_to_rgb_float();

        colorrgb = new ColorRGB(colorhsl.r, colorhsl.g, colorhsl.b);
        colorrgb.rgb_to_hsv_float();
        color_h = colorrgb.h;
        color_s = colorrgb.s;
        color_v = colorrgb.v;
        /*
          hsv_to_rgb_float (&color_h, &color_s, &color_v);
          rgb_to_hsl_float (&color_h, &color_s, &color_v);
          color_v += settings_value[BRUSH.CHANGE_COLOR_L];
          color_s += settings_value[BRUSH.CHANGE_COLOR_HSL_S];
          hsl_to_rgb_float (&color_h, &color_s, &color_v);
          rgb_to_hsv_float (&color_h, &color_s, &color_v);
          */
      }

      let hardness = this.settings_value[BRUSH.HARDNESS];

      // the functions below will CLAMP most inputs
      colorhsv = new ColorHSV(color_h, color_s, color_v);
      colorhsv.hsv_to_rgb_float();

      // Ant-alising
      const current_fadeout_in_pixels = radius * (1.0 - hardness);
      const min_fadeout_in_pixels = this.settings_value[BRUSH.ANTI_ALIASING];

      if (current_fadeout_in_pixels < min_fadeout_in_pixels) {
        const current_optical_radius =
          radius - ((1.0 - hardness) * radius) / 2.0;
        const hardness_new =
          (current_optical_radius - min_fadeout_in_pixels / 2.0) /
          (current_optical_radius + min_fadeout_in_pixels / 2.0);
        const radius_new = min_fadeout_in_pixels / (1.0 - hardness_new);

        hardness = hardness_new;
        radius = radius_new;
      }
      //

      return this.surface.draw_dab(
        x,
        y,
        radius,
        colorhsv.r,
        colorhsv.g,
        colorhsv.b,
        opaque,
        hardness,
        eraser_target_alpha,
        this.states[STATE.ACTUAL_ELLIPTICAL_DAB_RATIO],
        this.states[STATE.ACTUAL_ELLIPTICAL_DAB_ANGLE]
      );
    }

    // How many dabs will be drawn between the current and the next (x, y, pressure, +dt) position?
    count_dabs_to = function (x, y, pressure, dt) {
      let xx, yy, res1, res2, res3, dist;

      if (this.states[STATE.ACTUAL_RADIUS] === 0.0)
        this.states[STATE.ACTUAL_RADIUS] = Math.exp(
          this.settings[BRUSH.RADIUS_LOGARITHMIC].base_value
        );

      if (this.states[STATE.ACTUAL_RADIUS] < ACTUAL_RADIUS_MIN)
        this.states[STATE.ACTUAL_RADIUS] = ACTUAL_RADIUS_MIN;

      if (this.states[STATE.ACTUAL_RADIUS] > ACTUAL_RADIUS_MAX)
        this.states[STATE.ACTUAL_RADIUS] = ACTUAL_RADIUS_MAX;

      // OPTIMIZE: expf() called too often
      const base_radius = Math.exp(
        this.settings[BRUSH.RADIUS_LOGARITHMIC].base_value
      );

      if (base_radius < ACTUAL_RADIUS_MIN) base_radius = ACTUAL_RADIUS_MIN;
      if (base_radius > ACTUAL_RADIUS_MAX) base_radius = ACTUAL_RADIUS_MAX;
      //if (base_radius < 0.5) base_radius = 0.5;
      //if (base_radius > 500.0) base_radius = 500.0;

      xx = x - this.states[STATE.X];
      yy = y - this.states[STATE.Y];
      //dp = pressure - pressure; // Not useful?
      // TODO: control rate with pressure (dabs per pressure) (dpressure is useless)

      if (this.states[STATE.ACTUAL_ELLIPTICAL_DAB_RATIO] > 1.0) {
        // code duplication, see tiledsurface::draw_dab()
        const angle_rad =
          (this.states[STATE.ACTUAL_ELLIPTICAL_DAB_ANGLE] / 360) * 2 * Math.PI;
        const cs = Math.cos(angle_rad);
        const sn = Math.sin(angle_rad);
        const yyr =
          (yy * cs - xx * sn) * this.states[STATE.ACTUAL_ELLIPTICAL_DAB_RATIO];
        const xxr = yy * sn + xx * cs;

        dist = Math.sqrt(yyr * yyr + xxr * xxr);
      } else {
        dist = hypotf(xx, yy);
      }

      // FIXME: no need for base_value or for the range checks above IF always the interpolation
      //        function will be called before this one
      res1 =
        (dist / this.states[STATE.ACTUAL_RADIUS]) *
        this.settings[BRUSH.DABS_PER_ACTUAL_RADIUS].base_value;
      res2 =
        (dist / base_radius) *
        this.settings[BRUSH.DABS_PER_BASIC_RADIUS].base_value;
      res3 = dt * this.settings[BRUSH.DABS_PER_SECOND].base_value;

      return res1 + res2 + res3;
    };

    stroke_to(x, y, pressure, xtilt, ytilt, dtime) {
      //printf("%f %f %f %f\n", (double)dtime, (double)x, (double)y, (double)pressure);

      let tilt_ascension = 0.0;
      let tilt_declination = 90.0;

      if (xtilt !== 0 || ytilt !== 0) {
        // shield us from insane tilt input
        xtilt = clamp(xtilt, -1.0, 1.0);
        ytilt = clamp(ytilt, -1.0, 1.0);

        //assert(isfinite(xtilt) && isfinite(ytilt));
        tilt_ascension = (180.0 * Math.atan2(-xtilt, ytilt)) / Math.PI;

        let e;
        if (Math.abs(xtilt) > Math.abs(ytilt)) {
          e = Math.sqrt(1 + ytilt * ytilt);
        } else {
          e = Math.sqrt(1 + xtilt * xtilt);
        }

        const rad = hypot(xtilt, ytilt);
        let cos_alpha = rad / e;

        if (cos_alpha >= 1.0) cos_alpha = 1.0; // fix numerical inaccuracy

        tilt_declination = (180.0 * Math.acos(cos_alpha)) / Math.PI;

        //assert(isfinite(tilt_ascension));
        //assert(isfinite(tilt_declination));
      }

      // printf("xtilt %f, ytilt %f\n", (double)xtilt, (double)ytilt);
      // printf("ascension %f, declination %f\n", (double)tilt_ascension, (double)tilt_declination);

      pressure = clamp(pressure, 0.0, 1.0);
      /*
          if (!isfinite(x) || !isfinite(y) ||
              (x > 1e10 || y > 1e10 || x < -1e10 || y < -1e10)) {
            // workaround attempt for https://gna.org/bugs/?14372
            g_print("Warning: ignoring brush::stroke_to with insane inputs (x = %f, y = %f)\n", (double)x, (double)y);
            x = 0.0;
            y = 0.0;
            pressure = 0.0;
          }
          */
      // the assertion below is better than out-of-memory later at save time
      //assert(x < 1e8 && y < 1e8 && x > -1e8 && y > -1e8);

      //if (dtime < 0) g_print("Time jumped backwards by dtime=%f seconds!\n", dtime);
      if (dtime <= 0) dtime = 0.0001; // protect against possible division by zero bugs

      if (dtime > 0.1 && pressure && this.states[STATE.PRESSURE] === 0) {
        // Workaround for tablets that don't report motion events without pressure.
        // This is to avoid linear interpolation of the pressure between two events.
        this.stroke_to(x, y, 0.0, 90.0, 0.0, dtime - 0.0001);
        dtime = 0.0001;
      }

      ///g_rand_set_seed (rng, states[STATE.RNG_SEED]);

      {
        // calculate the actual "virtual" cursor position

        // noise first
        if (this.settings[BRUSH.TRACKING_NOISE].base_value) {
          // OPTIMIZE: expf() called too often
          const base_radius = Math.exp(
            this.settings[BRUSH.RADIUS_LOGARITHMIC].base_value
          );

          x +=
            rand_gauss() *
            this.settings[BRUSH.TRACKING_NOISE].base_value *
            base_radius;
          y +=
            rand_gauss() *
            this.settings[BRUSH.TRACKING_NOISE].base_value *
            base_radius;
        }

        const fac =
          1.0 -
          this.exp_decay(
            this.settings[BRUSH.SLOW_TRACKING].base_value,
            100.0 * dtime
          );
        x = this.states[STATE.X] + (x - this.states[STATE.X]) * fac;
        y = this.states[STATE.Y] + (y - this.states[STATE.Y]) * fac;
      }

      // draw many (or zero) dabs to the next position

      // see doc/stroke2dabs.png
      let dist_moved = this.states[STATE.DIST];
      let dist_todo = this.count_dabs_to(x, y, pressure, dtime);

      //if (dtime > 5 || dist_todo > 300) {

      if (dtime > MAX_DTIME) {
        /*
              TODO:
              if (dist_todo > 300) {
              // this happens quite often, eg when moving the cursor back into the window
              // FIXME: bad to hardcode a distance treshold here - might look at zoomed image
              //        better detect leaving/entering the window and reset then.
              g_print ("Warning: NOT drawing %f dabs.\n", dist_todo);
              g_print ("dtime=%f, dx=%f\n", dtime, x-states[STATE.X]);
              //must_reset = 1;
              }
            */

        //printf("Brush reset.\n");
        for (var i = 0; i < STATE.COUNT; i++) {
          this.states[i] = 0;
        }

        this.states[STATE.X] = x;
        this.states[STATE.Y] = y;
        this.states[STATE.PRESSURE] = pressure;

        // not resetting, because they will get overwritten below:
        //dx, dy, dpress, dtime

        this.states[STATE.ACTUAL_X] = this.states[STATE.X];
        this.states[STATE.ACTUAL_Y] = this.states[STATE.Y];
        this.states[STATE.STROKE] = 1.0; // start in a state as if the stroke was long finished

        return true;
      }

      //g_print("dist = %f\n", states[STATE.DIST]);
      //enum { UNKNOWN, YES, NO } painted = UNKNOWN;
      const UNKNOWN = 0;
      const YES = 1;
      const NO = 2;

      let painted = UNKNOWN;
      let dtime_left = dtime;

      let step_dx, step_dy, step_dpressure, step_dtime;
      let step_declination, step_ascension;

      while (dist_moved + dist_todo >= 1.0) {
        // there are dabs pending
        {
          // linear interpolation (nonlinear variant was too slow, see SVN log)
          var frac; // fraction of the remaining distance to move
          if (dist_moved > 0) {
            // "move" the brush exactly to the first dab (moving less than one dab)
            frac = (1.0 - dist_moved) / dist_todo;
            dist_moved = 0;
          } else {
            // "move" the brush from one dab to the next
            frac = 1.0 / dist_todo;
          }
          step_dx = frac * (x - this.states[STATE.X]);
          step_dy = frac * (y - this.states[STATE.Y]);
          step_dpressure = frac * (pressure - this.states[STATE.PRESSURE]);
          step_dtime = frac * (dtime_left - 0.0);
          step_declination =
            frac * (tilt_declination - this.states[STATE.DECLINATION]);
          step_ascension =
            frac * (tilt_ascension - this.states[STATE.ASCENSION]);
          // Though it looks different, time is interpolated exactly like x/y/pressure.
        }

        this.update_states_and_setting_values(
          step_dx,
          step_dy,
          step_dpressure,
          step_declination,
          step_ascension,
          step_dtime
        );
        var painted_now = this.prepare_and_draw_dab();
        if (painted_now) {
          painted = YES;
        } else if (painted === UNKNOWN) {
          painted = NO;
        }

        dtime_left -= step_dtime;
        dist_todo = this.count_dabs_to(x, y, pressure, dtime_left);
      }

      {
        // "move" the brush to the current time (no more dab will happen)
        // Important to do this at least once every event, because
        // brush_count_dabs_to depends on the radius and the radius can
        // depend on something that changes much faster than only every
        // dab (eg speed).

        step_dx = x - this.states[STATE.X];
        step_dy = y - this.states[STATE.Y];
        step_dpressure = pressure - this.states[STATE.PRESSURE];
        step_declination = tilt_declination - this.states[STATE.DECLINATION];
        step_ascension = tilt_ascension - this.states[STATE.ASCENSION];
        step_dtime = dtime_left;

        //dtime_left = 0; but that value is not used any more

        this.update_states_and_setting_values(
          step_dx,
          step_dy,
          step_dpressure,
          step_declination,
          step_ascension,
          step_dtime
        );
      }

      // save the fraction of a dab that is already done now
      this.states[STATE.DIST] = dist_moved + dist_todo;
      //g_print("dist_final = %f\n", states[STATE.DIST]);

      // next seed for the RNG (GRand has no get_state() and states[] must always contain our full state)
      //states[STATE.RNG_SEED] = g_rand_int(rng);

      // stroke separation logic (for undo/redo)

      if (painted === UNKNOWN) {
        if (
          this.stroke_current_idling_time > 0 ||
          this.stroke_total_painting_time === 0
        ) {
          // still idling
          painted = NO;
        } else {
          // probably still painting (we get more events than brushdabs)
          painted = YES;
          //if (pressure === 0) g_print ("info: assuming 'still painting' while there is no pressure\n");
        }
      }

      if (painted === YES) {
        //if (stroke_current_idling_time > 0) g_print ("idling ==> painting\n");
        this.stroke_total_painting_time += dtime;
        this.stroke_current_idling_time = 0;
        // force a stroke split after some time
        if (this.stroke_total_painting_time > 4 + 3 * pressure) {
          // but only if pressure is not being released
          // FIXME: use some smoothed state for dpressure, not the output of the interpolation code
          //        (which might easily wrongly give dpressure === 0)
          if (step_dpressure >= 0) {
            return true;
          }
        }
      } else if (painted === NO) {
        //if (stroke_current_idling_time == 0) g_print ("painting ==> idling\n");
        this.stroke_current_idling_time += dtime;
        if (this.stroke_total_painting_time === 0) {
          // not yet painted, start a new stroke if we have accumulated a lot of irrelevant motion events
          if (this.stroke_current_idling_time > 1.0) {
            return true;
          }
        } else {
          // Usually we have pressure===0 here. But some brushes can paint
          // nothing at full pressure (eg gappy lines, or a stroke that
          // fades out). In either case this is the prefered moment to split.
          if (
            this.stroke_total_painting_time + this.stroke_current_idling_time >
            1.2 + 5 * pressure
          ) {
            return true;
          }
        }
      }
      return false;
    }
  } //END of Brush

  window.MypaintBrush = MypaintBrush;
  window.MypaintSurface = MypaintSurface;
})(window);
