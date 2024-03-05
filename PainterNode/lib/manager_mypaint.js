import { makeElement, rgbToHsv, getDataJSON } from "./utils.js";

class MyPaintManager {
  constructor(painterNode, brushName = "charcoal") {
    if (!painterNode) return new Error("Link to PainterNode not exist!");

    this.painterNode = painterNode;

    this.basePath = "extensions/AlekPet_Nodes/assets/painternode";
    this.brushName = brushName;
    this.currentBrushSettings = null;
  }

  async createElements() {
    // Select brush
    this.labelSetBrush = makeElement("label", {
      textContent: "Brush: ",
      style:
        "display: flex;  align-items: center; font-size: 10px; margin-left: 3px",
      title: "Select Brush",
    });
    this.selectBrushElem = makeElement("select", {
      class: ["selectBrushMyPaint"],
    });
    this.labelSetBrush.append(this.selectBrushElem);
    this.selectBrushElem.addEventListener("change", this.setBrush.bind(this));

    // Mouse Pressure
    this.labelMousePressure = makeElement("label", {
      textContent: "Pressure: ",
      style:
        "display: flex;  align-items: center; font-size: 10px; margin-left: 3px",
      title: "Mouse pressure",
    });
    this.mousepressure = makeElement("input", {
      class: ["mypaint_mousepressure"],
      type: "range",
      min: 1,
      max: 100,
      value: 50,
    });
    this.mousepressure.customSize = { w: 60, h: 25, fs: 10 };
    this.labelMousePressure.append(this.mousepressure);

    const brushesData = await getDataJSON(
      `${this.basePath}/json/brushes_data.json`
    );

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

    await this.loadBrushSetting("brushes/", "charcoal");
  }

  appendElements(parent) {
    parent.append(this.labelSetBrush, this.labelMousePressure);
  }

  async loadBrushSetting(pathToBrush, brushName) {
    const pathToJsonBrush = `${this.basePath}/${pathToBrush}${brushName}`;
    this.currentBrushSettings = await getDataJSON(
      `${pathToJsonBrush}.myb.json`
    );
    this.currentBrushImg = `${pathToJsonBrush}.png`;
  }

  setColor(colorvalue) {
    const source = new fabric.Color(colorvalue);
    const [r, g, b] = source._source;
    const [h, s, v] = rgbToHsv(r, g, b);
    const bs = { ...this.currentBrushSettings };
    bs.color_h.base_value = h;
    bs.color_s.base_value = s;
    bs.color_v.base_value = v;

    this.painterNode.canvas.freeDrawingBrush.brush.readmyb_json(bs);
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
    this.currentBrushSettings = await getDataJSON(
      `${pathToJsonBrush}.myb.json`
    );
    this.currentBrushImg = `${pathToJsonBrush}.png`;

    this.painterNode.canvas.freeDrawingBrush.brush = new MypaintBrush(
      this.currentBrushSettings,
      this.painterNode.canvas.freeDrawingBrush.surface
    );
  }
}

export { MyPaintManager };
