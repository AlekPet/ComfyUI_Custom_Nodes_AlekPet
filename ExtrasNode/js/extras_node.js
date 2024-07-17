import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { $el } from "../../../scripts/ui.js";
import { isValidStyle, rgbToHex } from "./utils.js";

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
      height: "20px",
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

function createPreiviewSize(node, name, options) {
  const { color } = options;

  const res = $el("div", {
    style: {
      height: "25px",
      fontSize: "0.8rem",
      color: color,
      fontFamily: "monospace",
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

  return widget;
}

const convertIdClass = (text) => text.replaceAll(".", "_");
const idExt = "alekpet.ExtrasNode";

// LocalStorage settings
const PreviewImageSizeLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.PreviewImage`
);
const PreviewImageColorTextLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.PreviewImageColorText`
);
const PreviewImageColorBgLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.PreviewImageColorBg`
);

let PreviewImageSize = PreviewImageSizeLS
    ? JSON.parse(PreviewImageSizeLS)
    : false,
  PreviewImageColorText =
    PreviewImageColorTextLS && PreviewImageColorTextLS.trim() !== ""
      ? PreviewImageColorTextLS
      : document.documentElement.style.getPropertyValue("--input-text") ||
        "#dddddd",
  PreviewImageColorBg = PreviewImageColorBgLS ? PreviewImageColorBgLS : "";

// Register Extension
app.registerExtension({
  name: idExt,
  init() {
    app.ui.settings.addSetting({
      id: `${idExt}.PreviewImage`,
      name: "🔸 Preview Image",
      defaultValue: true,
      type: (name, sett, val) => {
        return $el("tr", [
          $el("td", [
            $el("label", {
              textContent: name,
              for: convertIdClass(`${idExt}.PreviewImage_size_checkbox`),
            }),
          ]),
          $el("td", [
            $el(
              "label",
              {
                style: { display: "block" },
                textContent: "Display image size: ",
                for: convertIdClass(`${idExt}.PreviewImage_size_checkbox`),
              },
              [
                $el("input", {
                  id: convertIdClass(`${idExt}.PreviewImage_size_checkbox`),
                  type: "checkbox",
                  checked: val,
                  onchange: (e) => {
                    const checked = !!e.target.checked;
                    PreviewImageSize = checked;
                    sett(checked);
                  },
                }),
              ]
            ),
            $el(
              "label",
              {
                textContent: "Color text: ",
                style: { display: "block" },
              },
              [
                $el("input", {
                  id: convertIdClass(`${idExt}.PreviewImage_color_input`),
                  type: "color",
                  value: PreviewImageColorText,
                  onchange: (e) => {
                    const colorVal =
                      e.target.value ||
                      document.documentElement.style.getPropertyValue(
                        "--input-text"
                      ) ||
                      "#dddddd";
                    PreviewImageColorText = colorVal;
                    localStorage.setItem(
                      `Comfy.Settings.${idExt}.PreviewImageColorText`,
                      PreviewImageColorText
                    );
                  },
                }),
              ]
            ),
            $el(
              "label",
              {
                textContent: "Color background: ",
                style: { display: "block" },
              },
              [
                $el("input", {
                  id: convertIdClass(
                    `${idExt}.PreviewImage_color_background_input`
                  ),
                  type: "color",
                  value: PreviewImageColorBg,
                  onchange: (e) => {
                    const colorVal = e.target.value || "";
                    PreviewImageColorBg = colorVal;
                    localStorage.setItem(
                      `Comfy.Settings.${idExt}.PreviewImageColorBg`,
                      PreviewImageColorBg
                    );
                  },
                }),
              ]
            ),
            $el("button", {
              textContent: "Reset colors",
              onclick: () => {
                PreviewImageColorText = isValidStyle(
                  "color",
                  document.documentElement.style.getPropertyValue(
                    "--input-text"
                  ) || "#ddd"
                ).color_hex;
                PreviewImageColorBg = "";

                document.querySelector(
                  "#alekpet_ExtrasNode_PreviewImage_color_input"
                ).value = PreviewImageColorText;
                document.querySelector(
                  "#alekpet_ExtrasNode_PreviewImage_color_background_input"
                ).value = PreviewImageColorBg;

                localStorage.setItem(
                  `Comfy.Settings.${idExt}.PreviewImageColorText`,
                  PreviewImageColorText
                );
                localStorage.setItem(
                  `Comfy.Settings.${idExt}.PreviewImageColorBg`,
                  PreviewImageColorBg
                );
              },
              style: {
                display: "block",
              },
            }),
          ]),
        ]);
      },
    });
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- Preview Text Node
    switch (nodeData.name) {
      case "PreviewTextNode": {
        // Node Created
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
          const ret = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined;

          let PreviewTextNode = app.graph._nodes.filter(
              (wi) => wi.type == nodeData.name
            ),
            nodeName = `${nodeData.name}_${PreviewTextNode.length}`;

          console.log(`Create ${nodeData.name}: ${nodeName}`);

          const wi = ComfyWidgets.STRING(
            this,
            nodeName,
            [
              "STRING",
              {
                default: "",
                placeholder: "Text message output...",
                multiline: true,
              },
            ],
            app
          );
          wi.widget.inputEl.readOnly = true;

          this.setSize(this.computeSize(this.size));
          app.graph.setDirtyCanvas(true, false);

          return ret;
        };
        // Function set value
        const outSet = function (texts) {
          if (texts.length > 0) {
            let widget_id = this?.widgets.findIndex(
              (w) => w.type == "customtext"
            );

            if (Array.isArray(texts)) {
              texts = texts.map((v) =>
                typeof v === "object" ? JSON.stringify(v) : v.toString()
              );
              texts = texts
                .filter((word) => word.trim() !== "")
                .map((word) => word.trim())
                .join(" ");
            }
            this.widgets[widget_id].value = texts;
            app.graph.setDirtyCanvas(true);
          }
        };

        // onExecuted
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (texts) {
          onExecuted?.apply(this, arguments);
          outSet.call(this, texts?.string);
        };
        // onConfigure
        const onConfigure = nodeType.prototype.onConfigure;
        nodeType.prototype.onConfigure = function (w) {
          onConfigure?.apply(this, arguments);
          if (w?.widgets_values?.length) {
            outSet.call(this, w.widgets_values);
          }
        };
        break;
      }
      // --- Preview Text Node

      // -- Colors nodes
      case "ColorsCorrectNode": {
        // Node Created
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
          const ret = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined;

          let ColorsCorrectNode = app.graph._nodes.filter(
              (wi) => wi.type == nodeData.name
            ),
            nodeName = `${nodeData.name}_${ColorsCorrectNode.length}`;

          console.log(`Create ${nodeData.name}: ${nodeName}`);

          return ret;
        };
        break;
      }

      case "HexToHueNode": {
        // Node Created
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
          const ret = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined;

          let HexToHueNode = app.graph._nodes.filter(
              (wi) => wi.type == nodeData.name
            ),
            nodeName = `${nodeData.name}_${HexToHueNode.length}`;

          console.log(`Create ${nodeData.name}: ${nodeName}`);

          let widgetColor = null;
          for (let w of this.widgets) {
            if (w.name === "color_hex") {
              widgetColor = makeColorWidget(
                this,
                nodeData.name,
                nodeData?.input?.required?.color_hex,
                w
              );
            }
          }

          api.addEventListener("alekpet_get_color_hex", async ({ detail }) => {
            const { color_hex, unique_id } = detail;

            if (+unique_id !== this.id || !color_hex) {
              return;
            }

            widgetColor.widget.w_color_hex.value = color_hex;
          });

          return ret;
        };
        break;
      }
      case "PreviewImage": {
        // Node Created
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
          const ret = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined;

          if (PreviewImageSize)
            createPreiviewSize(this, nodeData.name, {
              color: PreviewImageColorText,
            });

          return ret;
        };

        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function ({ images }) {
          onExecuted?.apply(this, arguments);

          if (PreviewImageSize !== undefined) {
            let widgetRes = this?.widgets?.find(
              (w) => w.type === "show_resolution"
            );

            if (!PreviewImageSize) {
              if (widgetRes) {
                for (const w of this.widgets) {
                  if (w.type === "show_resolution") {
                    w?.onRemove();
                  }
                }
                this.widgets.length = 0;
                this.onResize(this.size);
              }
            } else {
              if (!widgetRes) {
                widgetRes = createPreiviewSize(this, nodeData.name, {
                  color: PreviewImageColorText,
                });
                this.onResize(this.size);
              } else {
                widgetRes.element.style.color = PreviewImageColorText;
              }

              if (images.length) {
                const image = new Image();
                image.onload = () => {
                  widgetRes.value = `<div style="border: solid 1px var(--border-color); border-radius: 4px; padding: 5px; ${
                    PreviewImageColorBg !== ""
                      ? "background:" + PreviewImageColorBg
                      : ""
                  }">Width: ${image.naturalWidth}, Height: ${
                    image.naturalHeight
                  }</div>`;
                };
                image.src = api.apiURL(
                  "/view?" +
                    new URLSearchParams(images[0]).toString() +
                    app.getPreviewFormatParam() +
                    app.getRandParam()
                );
              }
            }
          }
        };

        break;
      }

      default: {
        break;
      }
    }
  },
});
