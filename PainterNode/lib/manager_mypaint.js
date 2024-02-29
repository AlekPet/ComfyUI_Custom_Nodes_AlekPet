import { makeElement, rgbToHsv, getDataJSON } from "./utils.js";

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

export { charcoal, MyPaintManager };
