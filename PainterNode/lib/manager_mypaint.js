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
      class: ["mypaint_selectbrushmypaint"],
    });

    this.selectBrushElem.addEventListener("change", this.setBrush.bind(this));
    this.labelSetBrush.append(this.selectBrushElem);

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

    this.labelMousePressure.append(
      this.mousepressure,
      makeElement("span", { textContent: this.mousepressure.value / 100 })
    );

    // Load size for settings brush
    this.labelCheckboxDefSize = makeElement("label", {
      textContent: "Default Size: ",
      style:
        "display: flex;  align-items: center; font-size: 10px; margin-left: 3px",
      title: "Apply size from brush settings",
    });

    this.CheckboxDefSize = makeElement("input", {
      type: "checkbox",
      class: ["mypaint_checkboxDefSize"],
      checked:
        window.LS_Painters[this.painterNode.node.name].settings
          ?.mypaint_settings?.preset_brush_size ?? true,
    });

    this.CheckboxDefSize.customSize = { w: 15, h: 15, fs: 10 };

    this.CheckboxDefSize.addEventListener("change", () => {
      const lsPainter = window.LS_Painters[this.painterNode.node.name].settings;
      if (!lsPainter.hasOwnProperty("mypaint_settings"))
        window.LS_Painters[
          this.painterNode.node.name
        ].settings.mypaint_settings = {};

      window.LS_Painters[
        this.painterNode.node.name
      ].settings.mypaint_settings.preset_brush_size =
        this.CheckboxDefSize.checked;

      // Save to localStorage
      localStorage.setItem(
        "ComfyUI_Painter",
        JSON.stringify(window.LS_Painters)
      );
    });

    this.labelCheckboxDefSize.append(this.CheckboxDefSize);

    // Select brush items
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
    const separator = makeElement("div", { class: ["separator"] });

    parent.append(
      this.labelSetBrush,
      separator,
      this.labelMousePressure,
      separator.cloneNode(true),
      this.labelCheckboxDefSize
    );
    this.setPropertyBrush();
  }

  async loadBrushSetting(pathToBrush, brushName) {
    const pathToJsonBrush = `${this.basePath}/${pathToBrush}${brushName}`;
    this.currentBrushSettings = await getDataJSON(
      `${pathToJsonBrush}.myb.json`
    );
    this.currentBrushImg = `${pathToJsonBrush}.png`;
  }

  setColorBrush(colorvalue) {
    const source = new fabric.Color(colorvalue);
    const [r, g, b] = source._source;
    const [h, s, v] = rgbToHsv(r, g, b);
    const bs = this.currentBrushSettings;
    bs.color_h.base_value = h;
    bs.color_s.base_value = s;
    bs.color_v.base_value = v;

    this.painterNode.canvas.freeDrawingBrush.brush.readmyb_json(bs);
  }

  setSizeBrush(sizevalue) {
    this.currentBrushSettings.radius_logarithmic.base_value =
      parseFloat(sizevalue);
    this.painterNode.canvas.freeDrawingBrush.brush.readmyb_json(
      this.currentBrushSettings
    );
  }

  setPropertyBrush() {
    // Set brush property: color, width
    this.painterNode.strokeWidth.max = 7;
    this.painterNode.strokeWidth.min = 0.2;
    this.painterNode.strokeWidth.step = 0.01;

    if (this.CheckboxDefSize.checked)
      this.painterNode.strokeWidth.value =
        this.currentBrushSettings.radius_logarithmic.base_value;

    this.painterNode.changePropertyBrush(this.painterNode.type);
  }

  async setBrush() {
    const {
      value: brushName,
      dataset: { path: pathToBrush },
    } = this.selectBrushElem.options[this.selectBrushElem.selectedIndex];

    if (brushName === "separator") return;

    if (!pathToBrush) {
      return new Error("No exist path in dataset!");
    }

    this.brushName = brushName;
    await this.loadBrushSetting(pathToBrush, brushName);

    this.painterNode.canvas.freeDrawingBrush.brush = new MypaintBrush(
      this.currentBrushSettings,
      this.painterNode.canvas.freeDrawingBrush.surface
    );
    this.setPropertyBrush();
  }
}

export { MyPaintManager };
