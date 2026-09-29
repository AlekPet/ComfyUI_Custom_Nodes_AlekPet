import { fabric } from "./fabric.js";

function createPainterAssetId() {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }

  // Fallback for older embedded browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

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

function formatBytes(bytes) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  return `${(bytes / 1024 ** i).toFixed(i ? 1 : 0)} ${units[i]}`;
}

// LocalStorage Init
class StorageClass {
  constructor(node, debug = false) {
    if (
      !node.name ||
      typeof node.name !== "string" ||
      node.name.trim() === ""
    ) {
      throw new Error("Incorrect painter name!");
    }

    this.node = node;
    this.name = node.name;

    this.settings_painter_node_default = {
      undo_history: [],
      redo_history: [],
      canvas_settings: { background: "#000000" },
      settings: {
        saveImage: true,
        pipingSettings: {
          action: {
            name: "background",
            options: {
              sendToBack: true,
              scale: 1.0,
            },
          },
          pipingChangeSize: true,
          pipingUpdateImage: true,
        },
        currentCanvasSize: {
          width: 512,
          height: 512,
        },
        mypaint_settings: {
          preset_brush_size: true,
          preset_brush_color: false,
        },
      },
    };

    this.settings_painter_node = JSON.parse(
      JSON.stringify(this.settings_painter_node_default)
    );
  }
}

export {
  rgbToHsv,
  toRGBA,
  getColorHEX,
  rangeGradient,
  HsvToRgb,
  StorageClass,
  formatBytes,
  createPainterAssetId,
};
