import { api } from "../../../../scripts/api.js";
import { fabric } from "./fabric.js";
import {
  makeElement,
  createWindowModal,
  isEmptyObject,
  THEMES_MODAL_WINDOW,
} from "../../utils.js";

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
// ---

function toRGBA(hex, alpha = 1.0) {
  let array_hex = hex.match(/[^#]./g);
  if (array_hex) {
    return `rgba(${array_hex
      .map((h) => parseInt(h, 16))
      .join(", ")}, ${alpha})`;
  }
  return hex;
}

function getColorHEX(c) {
  let colorStyle = new fabric.Color(c),
    color = colorStyle.toHex(),
    alpha = colorStyle.getAlpha();
  return { color: `#${color}`, alpha: parseFloat(alpha) };
}

function rangeGradient(rangeElement, color1 = "#15539e", color2 = "#282828") {
  const valueRange =
    ((rangeElement.value - rangeElement.min) /
      (rangeElement.max - rangeElement.min)) *
    100;

  return `linear-gradient(to right, ${color1} 0%, ${color1} ${valueRange}%, ${color2} ${valueRange}%, ${color2} 100%)`;
}

function HsvToRgb(brush_settings) {
  if (
    !brush_settings?.color_h &&
    !brush_settings?.color_s &&
    !brush_settings?.color_v
  )
    return null;

  const colorhsv = new ColorHSV(
    brush_settings.color_h.base_value,
    brush_settings.color_s.base_value,
    brush_settings.color_v.base_value
  );
  colorhsv.hsv_to_rgb_float();

  let red = Math.floor(colorhsv.r * 255).toString(16);
  let green = Math.floor(colorhsv.g * 255).toString(16);
  let blue = Math.floor(colorhsv.b * 255).toString(16);

  if (red.length < 2) red = `0${red}`;
  if (green.length < 2) green = `0${green}`;
  if (blue.length < 2) blue = `0${blue}`;
  return { red, green, blue };
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// LocalStorage Init
class LS_Class {
  constructor(nodeName, painters_settings_json = false) {
    if (!nodeName || typeof nodeName !== "string" || nodeName.trim() === "") {
      throw new Error("Incorrect painter name!");
    }
    this.painters_settings_json = painters_settings_json;
    this.name = nodeName;
    this.LS_Painters = {};
  }

  getLS() {
    return this.LS_Painters;
  }

  async LS_Init(context = null) {
    // Get settings node
    if (this.painters_settings_json) {
      const parent = context.painter.canvas.wrapperEl;

      const message = createWindowModal({
        ...THEMES_MODAL_WINDOW.warning,
        textTitle: "Loading",
        textBody: [
          makeElement("div", {
            innerHTML:
              "Please wait, <span style='font-weight: bold; color: orange'>Painter node</span> settings are loading. Loading times may take a long time if large images have been added to the canvas!",
          }),
        ],
        options: {
          auto: {
            autohide: true,
            autoshow: true,
            autoremove: true,
            autoremove: true,
            timewait: 500,
            propStyles: { opacity: 0 },
            propPreStyles: { display: "flex" },
          },
          close: { showClose: false },
          parent,
        },
      });

      this.LS_Painters = await this.loadData();
    } else {
      const lsPainter = localStorage.getItem(this.name);
      this.LS_Painters = lsPainter && JSON.parse(lsPainter);

      if (!this.LS_Painters) {
        localStorage.setItem(this.name, JSON.stringify({}));
        this.LS_Painters = JSON.parse(localStorage.getItem(this.name));
      }
    }

    if (this.LS_Painters && isEmptyObject(this.LS_Painters)) {
      this.LS_Painters = {
        undo_history: [],
        redo_history: [],
        canvas_settings: { background: "#000000" },
        settings: {
          lsSavePainter: true,
          pipingSettings: {
            action: {
              name: "background",
              options: {},
            },
            pipingChangeSize: true,
            pipingUpdateImage: true,
          },
        },
      };
      this.LS_Save();
    }
  }

  async LS_Save() {
    try {
      if (this.painters_settings_json) {
        await this.saveData();
      } else {
        localStorage.setItem(this.name, JSON.stringify(this.LS_Painters));
      }
    } catch (error) {
      console.error("LS Save: ", error);
    }
  }

  // Write settings in the file json
  async saveData() {
    try {
      const formData = new FormData();
      formData.append("name", this.name);
      formData.append(
        "data",
        new Blob([JSON.stringify(this.LS_Painters)], {
          type: "application/json",
        })
      );

      const rawResponse = await fetch("/alekpet/save_node_settings", {
        method: "POST",
        body: formData,
      });
      if (rawResponse.status !== 200) {
        throw new Error(
          `Error painter save file settings ${rawResponse.statusText}`
        );
      }
    } catch (e) {
      console.log(e);
    }
  }

  // Load settings from json file
  async loadData() {
    try {
      const rawResponse = await api.fetchApi(
        `/alekpet/loading_node_settings/${this.name}`
      );
      if (rawResponse.status !== 200)
        throw new Error(
          `Error painter load file settings: ${rawResponse.statusText}`
        );

      const data = await rawResponse?.json();
      if (!data) return {};

      return data.settings_nodes;
    } catch (e) {
      console.log(e);
      return {};
    }
  }

  // Remove settings from json file
  async removeData() {
    try {
      if (this.painters_settings_json) {
        const rawResponse = await fetch("/alekpet/remove_node_settings", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: this.name }),
        });

        if (rawResponse.status !== 200)
          throw new Error(
            `Error painter remove file settings: ${rawResponse.statusText}`
          );
      } else {
        if (this.LS_Painters && !isEmptyObject(this.LS_Painters)) {
          localStorage.removeItem(this.name);
        }
      }
      console.log(`Removed PainterNode: ${this.name}`);
    } catch (e) {
      console.log(e);
    }
  }
}

export {
  rgbToHsv,
  toRGBA,
  getColorHEX,
  rangeGradient,
  HsvToRgb,
  LS_Class,
  formatBytes,
};
