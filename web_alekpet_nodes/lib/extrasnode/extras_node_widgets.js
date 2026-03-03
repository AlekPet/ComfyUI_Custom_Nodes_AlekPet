/*
 * Title: Extras widgets
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { $el } from "../../../../scripts/ui.js";
import { rgbToHex, isValidStyle } from "../../utils.js";

const idExt = "alekpet.ExtrasNode";
const CONVERTED_TYPE = "converted-widget";

/* ~~~ Color Widget ~~~ */
function makeColorWidget(node, inputName, inputData, widget) {
  const color_hex = $el("input", {
    type: "color",
    value: inputData[1]?.default || "#00ff33",
    oninput: () => widget.callback?.(color_hex.value),
  });

  const color_text = $el("div", {
    title: "Click to copy color to clipboard",
    style: {
      textAlign: "center",
      fontSize: "20px",
      fontWeight: "600",
      lineHeight: 1.5,
      background: "var(--comfy-menu-bg)",
      border: "dotted 2px white",
      fontFamily: "sans-serif",
      letterSpacing: "0.5rem",
      borderRadius: "8px",
      textShadow: "0 0 4px #fff",
      cursor: "pointer",
    },
    onclick: () => navigator.clipboard.writeText(color_hex.value),
  });

  const w_color_hex = node.addDOMWidget(inputName, "color_hex", color_hex, {
    getValue() {
      color_text.style.color = color_hex.value;
      color_text.textContent = color_hex.value;
      return color_hex.value;
    },
    setValue(v) {
      widget.value = v;
      color_hex.value = v;
    },
  });

  widget.callback = (v) => {
    let color = isValidStyle("color", v).result ? v : "#00ff33";
    if (color.includes("#") && color.length === 4) {
      const opt_color = new Option().style;
      opt_color["color"] = color;
      color = rgbToHex(opt_color["color"]);
    }

    color_hex.value = color;
    widget.value = color;
  };

  const w_color_text = node.addDOMWidget(
    inputName + "_box",
    "color_hex_box",
    color_text
  );

  w_color_hex.color_hex = color_hex;

  widget.w_color_hex = w_color_hex;
  widget.w_color_text = w_color_text;

  return { widget };
}
/* ~~~ end - Color Widget ~~~ */

/* ~~~ Preview Image Size Widget ~~~ */
function createPreiviewSize(node, name, options) {
  const { color } = options;

  const res = $el("div", {
    style: {
      fontSize: "0.8rem",
      color: color,
      fontFamily: "monospace",
      textAlign: "center",
      padding: 0,
      margin: 0,
      outline: 0,
    },
  });

  const widget = node.addDOMWidget(name, "show_resolution", res, {
    getValue() {
      return res.innerHTML;
    },
    setValue(v) {
      res.innerHTML = v;
    },
  });

  widget.computeSize = () => [node.size[0], 40];

  return widget;
}
/* ~~~ end - Preview Image Size Widget ~~~ */

export { makeColorWidget, createPreiviewSize };
