/*
 * Title: Extras extensions
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { $el } from "../../scripts/ui.js";
import { isValidStyle } from "./utils.js";
import { addStylesheet } from "../../scripts/utils.js";
import {
  SpeechWidget,
  makeColorWidget,
  createPreiviewSize,
  speechRect,
  SpeechSynthesis,
} from "./lib/extrasnode/extras_node_widgets.js";

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

const SpeechAndRecognationSpeechLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.SpeechAndRecognationSpeech`
);

// Settings set values from LS or default
let PreviewImageSize = PreviewImageSizeLS
    ? JSON.parse(PreviewImageSizeLS)
    : false,
  PreviewImageColorText =
    PreviewImageColorTextLS && PreviewImageColorTextLS.trim() !== ""
      ? PreviewImageColorTextLS
      : document.documentElement.style.getPropertyValue("--input-text") ||
        "#dddddd",
  PreviewImageColorBg = PreviewImageColorBgLS ? PreviewImageColorBgLS : "",
  // Speech & Recognition widget settings
  SpeechAndRecognationSpeech = SpeechAndRecognationSpeechLS
    ? JSON.parse(SpeechAndRecognationSpeechLS)
    : true;

// Register Extension
app.registerExtension({
  name: idExt,
  init() {
    addStylesheet("css/extrasnode/extras_node_styles.css", import.meta.url);

    // PreviewImage settings ui
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

    // Speech & Recognition speech settings ui
    app.ui.settings.addSetting({
      id: `${idExt}.SpeechAndRecognationSpeech`,
      name: "🔸 Speak text & Recognition speech",
      defaultValue: true,
      type: (name, sett, val) => {
        return $el("tr", [
          $el("td", [
            $el("label", {
              textContent: name,
              for: convertIdClass(`${idExt}.SpeechAndRecognationSpeech_show`),
            }),
          ]),
          $el("td", [
            $el(
              "label",
              {
                style: { display: "flex", alignItems: "center" },
                textContent: "Enabled: ",
                for: convertIdClass(`${idExt}.SpeechAndRecognationSpeech_show`),
              },
              [
                $el("input", {
                  id: convertIdClass(
                    `${idExt}.SpeechAndRecognationSpeech_show`
                  ),
                  type: "checkbox",
                  checked: val,
                  onchange: (e) => {
                    const checked = !!e.target.checked;
                    SpeechAndRecognationSpeech = checked;
                    sett(checked);
                  },
                }),
                $el("span", {
                  textContent: "(Then reload the page)",
                  style: { fontSize: "0.6rem", color: "yellow" },
                }),
              ]
            ),
            // $el("button", {
            //   textContent: "Default reset",
            //   onclick: () => {},
            //   style: {
            //     display: "block",
            //   },
            // }),
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
        // -- Speech & Recognition speech widget
        // If ui settings is true and SpeechSynthesis or speechRecognition is not undefined
        if (SpeechAndRecognationSpeech && (speechRect || SpeechSynthesis)) {
          let nodeIsMultiString = false;

          if (nodeData?.input && nodeData?.input?.required) {
            for (const inp of Object.keys(nodeData.input.required)) {
              if (nodeData.input.required[inp][1]?.multiline) {
                const type = nodeData.input.required[inp][0];

                if (["STRING"].includes(type)) {
                  nodeIsMultiString = true;
                  break;
                }
              }
            }
          }

          if (nodeIsMultiString) {
            // Node Created
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = async function () {
              const ret = onNodeCreated
                ? onNodeCreated.apply(this, arguments)
                : undefined;

              // Find all widget type customtext
              const widgetsTextMulti = this?.widgets?.filter((w) =>
                ["customtext", "converted-widget"].includes(w.type)
              );

              await new Promise((res) =>
                setTimeout(() => {
                  res();
                }, 16 * this.widgets.length)
              );

              if (widgetsTextMulti.length) {
                widgetsTextMulti.forEach(async (w) => {
                  this.addCustomWidget(
                    SpeechWidget(this, "speak_and_recognation", true, w)
                  );
                });
              }

              return ret;
            };

            // onConfigure
            const onConfigure = nodeType.prototype.onConfigure;
            nodeType.prototype.onConfigure = async function (w) {
              onConfigure?.apply(this, arguments);
              if (w?.widgets_values?.length) {
                await new Promise((res) =>
                  setTimeout(() => {
                    res();
                  }, 16 * this.widgets.length)
                );

                const ids_speech_clear = this.widgets.reduce(function (
                  arr,
                  el,
                  idx
                ) {
                  if (el.type === "speak_and_recognation_type") arr.push(idx);
                  return arr;
                },
                []);

                for (const id of ids_speech_clear)
                  this?.widgets[id]?.callback(w.widgets_values[id]);
              }
            };
          }
        }
        // -- end - Speech & Recognition speech widget

        break;
      }
    }
  },
});
