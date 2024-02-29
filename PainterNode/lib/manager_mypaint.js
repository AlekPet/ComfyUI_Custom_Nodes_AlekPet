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

function makeElement(tag, attrs = {}) {
  if (!tag) tag = "div";
  const element = document.createElement(tag);
  Object.keys(attrs).forEach((key) => {
    const currValue = attrs[key];
    if (key === "class") {
      if (Array.isArray(currValue)) {
        element.classList.add(...currValue);
      } else if (currValue instanceof String && typeof currValue === "string") {
        element.className = currValue;
      }
    } else if (key === "dataset") {
      try {
        if (Array.isArray(currValue)) {
          currValue.forEach((datasetArr) => {
            const [prop, propval] = Object.entries(datasetArr)[0];
            element.dataset[prop] = propval;
          });
        } else {
          const [prop, propval] = Object.entries(currValue)[0];
          element.dataset[prop] = propval;
        }
      } catch (err) {
        console.log(err);
      }
    } else {
      element[key] = currValue;
    }
  });
  return element;
}

// MyPaint
async function getDataJSON(url) {
  try {
    const response = await fetch(url);
    const jsonData = await response.json();
    return jsonData;
  } catch (err) {
    return new Error(err);
  }
}

class MyPaintManager {
  constructor(painterNode, brushName = "charcoal") {
    if (!painterNode) return new Error("Link to PainterNode not exist!");

    this.painterNode = painterNode;

    this.basePath = "extensions/AlekPet_Nodes/assets/painternode";
    this.brushName = brushName;
    this.currentSettingBrush = null;
    this.getBrushData();
  }

  async getBrushData() {
    const brushesData = await getDataJSON(
      `${this.basePath}/json/brushes_data.json`
    );

    this.selectBrushElem = makeElement("select", {
      class: ["selectBrushMyPaint"],
    });

    let currentDir = null;
    Object.keys(brushesData).forEach((dir) => {
      const currentDirVals = brushesData[dir];
      if (!currentDir) currentDir = dir;

      if (currentDir !== dir) {
        const option = makeElement("option", {
          value: "separator",
          textContent: `-------------- ${dir} --------------`,
        });
        currentDir = dir;
        this.selectBrushElem.append(option);
      }

      currentDirVals.forEach((brushData) => {
        const { filename, path } = brushData;
        const option = makeElement("option", {
          value: filename,
          textContent: filename[0].toUpperCase() + filename.slice(1),
          dataset: { path: `brushes/${path}` },
        });

        if (filename === "charcoal") option.selected = true;

        this.selectBrushElem.append(option);
        currentDir = dir;
      });
    });

    this.selectBrushElem.addEventListener("change", this.setBrush.bind(this));
    this.painterNode.property_brushesSecondBox.append(this.selectBrushElem);
  }

  async setBrush() {
    const {
      value: brushName,
      dataset: { path: pathToBrush },
    } = this.selectBrushElem.options[this.selectBrushElem.selectedIndex];
    if (brushName === "separator" || !pathToBrush) {
      return new Error("No exist path in dataset or brush name incorrect!");
    }

    this.brushName = brushName;
    const pathToJsonBrush = `${this.basePath}/${pathToBrush}${this.brushName}`;
    this.currentSettingBrush = await getDataJSON(`${pathToJsonBrush}.myb.json`);
    this.currentBrushImg = `${pathToJsonBrush}.png`;

    this.painterNode.canvas.freeDrawingBrush.brush = new MypaintBrush(
      this.currentSettingBrush,
      this.painterNode.canvas.freeDrawingBrush.surface
    );

    this.brush_img = `${pathToJsonBrush}.png`;
  }
}

export { makeElement, charcoal, rgbToHsv, MyPaintManager, getDataJSON };
