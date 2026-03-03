/*
 * Title: Extras extension - Preview Image Size
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";
import { isValidStyle } from "./utils.js";
import { createPreiviewSize } from "./lib/extrasnode/extras_node_widgets.js";

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

// Settings set values from LS or default
let PreviewImageSize = PreviewImageSizeLS
    ? JSON.parse(PreviewImageSizeLS)
    : false,
  PreviewImageColorText =
    PreviewImageColorTextLS && PreviewImageColorTextLS.trim() !== ""
      ? PreviewImageColorTextLS
      : document.documentElement.style.getPropertyValue("--input-text") ||
        "#dddddd",
  PreviewImageColorBg = PreviewImageColorBgLS ? PreviewImageColorBgLS : "";

// -- Extension: PreviewImageSize --
app.registerExtension({
  name: `${idExt}.PreviewImageSize`,

  init() {
    // PreviewImage settings ui
    app.ui.settings.addSetting({
      id: `${idExt}.PreviewImage`,
      name: "🔸 Preview Image Size",
      defaultValue: true,
      type: (name, sett, val) => {
        const newUI = document.querySelector(".p-dialog-header");
        return $el("tr", [
          !newUI
            ? $el("td", [
                $el("label", {
                  textContent: name,
                  for: convertIdClass(`${idExt}.PreviewImage_size_checkbox`),
                }),
              ])
            : "",
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

                    localStorage.setItem(
                      `Comfy.Settings.${idExt}.PreviewImage`,
                      checked
                    );
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
    if (nodeData.name === "PreviewImage") {
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
    }
  },
});
