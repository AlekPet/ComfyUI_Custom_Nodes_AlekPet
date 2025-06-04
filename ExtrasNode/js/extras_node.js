/*
 * Title: Extras extensions
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { $el } from "../../scripts/ui.js";
import { isValidStyle, comfyuiDesktopConfirm } from "./utils.js";
import { addStylesheet } from "../../scripts/utils.js";
import {
  SpeechWidget,
  makeColorWidget,
  createPreiviewSize,
  speechRect,
  SpeechSynthesis,
  checkboxLSCheckedByKey,
} from "./lib/extrasnode/extras_node_widgets.js";
import { RecognationSpeechDialog } from "./lib/extrasnode/extras_node_dialogs.js";

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

// Recognation & speech
const SpeechAndRecognationSpeechLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.SpeechAndRecognationSpeech`
);
// end - Recognation & speech

// Preview image, video and audio select list combo
const PreviewImageVideoComboLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.PreviewImageVideoCombo`
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
    : true,
  SpeechAndRecognationSpeechSaveAs = JSON.parse(
    localStorage.getItem(`${idExt}.SpeechAndRecognationSpeechSaveAs`),
    false
  ),
  // Preview image, video and audio select list combo
  PreviewImageVideoCombo = PreviewImageVideoComboLS
    ? JSON.parse(PreviewImageVideoComboLS)
    : true;

// Preview image, video and audio content loading function
const SUPPORTS_FORMAT = {
  image: ["jpg", "jpeg", "bmp", "png", "gif", "tiff", "avif"],
  video: ["mp4", "webm"],
  audio: ["ogg", "wav", "mp3", "webm"],
};

const loadingContent = (src) => {
  return new Promise((res, rej) => {
    let ext = src.slice(src.lastIndexOf(".") + 1).toLowerCase();
    ext = /\w+/.exec(ext)[0];

    if (SUPPORTS_FORMAT.image.includes(ext)) {
      const img = new Image();
      img.crossOrigin = "";
      img.onload = (e) => res({ raw: img, type: "image", src });
      img.onerror = (err) => rej(err);
      img.src = src;
    }

    if (SUPPORTS_FORMAT.video.includes(ext)) {
      const video = document.querySelector(".preview_vid");
      video.onerror = (err) => rej(err);

      video.addEventListener("canplay", (e) => {
        if (video.videoWidth !== 0) {
          res({ raw: video, type: "video", src });
        }
      });
      video.src = src;
    }

    if (SUPPORTS_FORMAT.audio.includes(ext)) {
      const audio = document.querySelector(".preview_audio");
      audio.onerror = (err) => rej(err);

      audio.addEventListener("canplaythrough", (e) => {
        res({ raw: audio, type: "audio", src });
      });
      audio.src = src;
    }
  });
};

function drawVid(raw, canvas, ctx, type) {
  ctx.drawImage(raw, 0, 0, canvas.width, canvas.height);

  canvas.requanim = requestAnimationFrame(
    drawVid.bind(this, raw, canvas, ctx, type)
  );
}
//

// Register Extension
app.registerExtension({
  name: idExt,

  init() {
    addStylesheet("css/extrasnode/extras_node_styles.css", import.meta.url);

    // -- Preview image, audio, video --

    // Close when click on item inside context menu
    function closePreviewContextClick() {
      if (this.root?.preview_content_combo) {
        this.root.preview_content_combo.remove();
        this.root.preview_content_combo = null;
      }
    }

    // Add preview element
    function addPreviewModule(params, element) {
      if (!PreviewImageVideoCombo) return;

      const [name, value, options] = params;

      if (value instanceof Object) return;

      if (!this.root?.preview_content_combo) {
        const preview_content_combo = $el(
          "div.preview_content_combo",
          {
            style: {
              position: "absolute",
              maxWidth: "160px",
              zIndex: 9999999,
            },
            parent: document.body,
          },
          [
            $el("canvas.preview_img", {
              style: { width: "100%" },
            }),
            $el("video.preview_vid", {
              style: { opacity: 0, width: 0, height: 0 },
              crossOrigin: "anonymous",
              autoplay: false,
              muted: false,
              preload: "auto",
            }),
            $el("audio.preview_audio", {
              style: { opacity: 0, position: "absolute", left: 0 },
              crossOrigin: "anonymous",
              autoplay: false,
              muted: false,
              preload: "auto",
              controls: true,
            }),
          ]
        );

        this.root.preview_content_combo = preview_content_combo;
      }

      LiteGraph.pointerListenerAdd(element, "enter", (e) => {
        if (element?.dataset?.value) {
          const body_rect = document.body.getBoundingClientRect();
          const root_rect = this.root.getBoundingClientRect();
          const { x, y } = element.getBoundingClientRect();
          //const preview_rect = this.root.preview_content_combo.getBoundingClientRect();

          //const scale = app.graph.extra.ds.scale;

          const canvas = this.root.preview_content_combo.children[0];
          const ctx = canvas.getContext("2d");

          loadingContent(
            api.apiURL(
              `/view?filename=${encodeURIComponent(
                element.dataset.value
              )}&type=input`
            )
          ).then(({ raw, type, src }) => {
            this.root.preview_content_combo.style.maxWidth =
              type === "audio" ? "300px" : "160px";

            const previewWidth = parseInt(
              this.root.preview_content_combo.style.maxWidth
            );

            // if (scale >= 1) {
            // this.root.preview_content_combo.style.top = `${
            // (y - root_rect.top) / scale
            // }px`;
            // } else {
            // this.root.preview_content_combo.style.top = `${
            // y - root_rect.top
            // }px`;
            // }

            this.root.preview_content_combo.style.top = `${y}px`;

            if (
              body_rect.width &&
              root_rect.right + previewWidth > body_rect.width
            ) {
              this.root.preview_content_combo.style.left = `${
                root_rect.left - previewWidth - 10
              }px`;
            } else {
              this.root.preview_content_combo.style.left = `${
                root_rect.left + root_rect.width + 10
              }px`;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const video = document.querySelector(".preview_vid");
            const audio = document.querySelector(".preview_audio");

            if (type === "image") {
              canvas.width = raw.naturalWidth;
              canvas.height = raw.naturalHeight;
              if (!video.paused) {
                video.pause();
                video.currentTime = 0;
              }
              cancelAnimationFrame(canvas.requanim);
            } else if (type === "video") {
              canvas.width = raw.videoWidth;
              canvas.height = raw.videoHeight;
              video.play();
            } else if (type === "audio") {
              Object.assign(audio.style, {
                opacity: 1,
                display: "",
              });
              audio.play();
            }

            if (type === "video" || type === "image") {
              Object.assign(audio.style, {
                opacity: 0,
                display: "none",
              });
              !audio.paused && audio.pause();
              ctx.drawImage(raw, 0, 0, canvas.width, canvas.height);
            }

            if (type === "video")
              canvas.requanim = requestAnimationFrame(
                drawVid.bind(this, raw, canvas, ctx, type)
              );
          });
        }
      });

      LiteGraph.pointerListenerAdd(element, "leave", (e) => {
        if (element?.dataset?.value) {
          const canvas = this.root.preview_content_combo.children[0];
          const video = document.querySelector(".preview_vid");
          if (!video.paused) {
            video.pause();
            video.currentTime = 0;
          }
          cancelAnimationFrame(canvas.requanim);
        }
      });
    }

    // AddItem
    const addItem = ContextMenu.prototype.addItem;
    ContextMenu.prototype.addItem = function () {
      const element = addItem?.apply(this, arguments);

      addPreviewModule.call(this, arguments, element);
    };

    // CloseItem
    const closeItem = ContextMenu.prototype.close;
    ContextMenu.prototype.close = function () {
      closeItem?.apply(this, arguments);

      closePreviewContextClick.call(this);
    };

    // Old verison comfyui, support context menu LiteGraph path...
    // AddItem
    const addItemLitegraph = LiteGraph.ContextMenu.prototype.addItem;
    LiteGraph.ContextMenu.prototype.addItem = function () {
      const element = addItemLitegraph?.apply(this, arguments);

      addPreviewModule.call(this, arguments, element);
    };

    // CloseItem
    const closeItemLitegraph = LiteGraph.ContextMenu.prototype.close;
    LiteGraph.ContextMenu.prototype.close = function () {
      closeItemLitegraph?.apply(this, arguments);

      closePreviewContextClick.call(this);
    };

    const originalCloseAllContextMenus = LiteGraph.closeAllContextMenus;
    LiteGraph.closeAllContextMenus = function () {
      originalCloseAllContextMenus?.apply(this, arguments);

      const previewCombo = document.querySelector(".preview_content_combo");
      if (previewCombo) {
        previewCombo.remove();
      }
    };
    // -- end - Preview image, audio, video --

    // PreviewImage settings ui
    app.ui.settings.addSetting({
      id: `${idExt}.PreviewImage`,
      name: "🔸 Preview Image",
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

    // Speech & Recognition speech settings ui
    app.ui.settings.addSetting({
      id: `${idExt}.SpeechAndRecognationSpeech`,
      name: "🔸 Speak text & Recognition speech",
      defaultValue: true,
      type: (name, sett, val) => {
        const newUI = document.querySelector(".p-dialog-header");
        return $el("tr", [
          !newUI
            ? $el("td", [
                $el("label", {
                  textContent: name,
                  for: convertIdClass(
                    `${idExt}.SpeechAndRecognationSpeech_show`
                  ),
                }),
              ])
            : "",
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
                  onchange: async (e) => {
                    const checked = !!e.target.checked;
                    SpeechAndRecognationSpeech = checked;
                    localStorage.setItem(
                      `Comfy.Settings.${idExt}.SpeechAndRecognationSpeech`,
                      checked
                    );
                    if (await comfyuiDesktopConfirm("Reload page?")) {
                      location.reload();
                    }
                    sett(checked);
                  },
                }),
                $el("span", {
                  textContent: "(Then reload the page)",
                  style: { fontSize: "0.6rem", color: "yellow" },
                }),
              ]
            ),
            $el(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "5px",
                  margin: "5px 0",
                },
                title: "Show modal window when saving recorded audio.",
              },
              [
                $el("span", { textContent: "Output Save as?" }),
                $el("input", {
                  type: "checkbox",
                  checked: SpeechAndRecognationSpeechSaveAs,
                  onchange: (e) => {
                    localStorage.setItem(
                      `${idExt}.SpeechAndRecognationSpeechSaveAs`,
                      !!e.target.checked
                    );
                    SpeechAndRecognationSpeechSaveAs = !!e.target.checked;
                    checkboxLSCheckedByKey(
                      `${idExt}.SpeechAndRecognationSpeechSaveAs`,
                      ".alekpet_extras_node_recognition_saveAs"
                    );
                  },
                }),
              ]
            ),
            $el("button", {
              textContent: "Speech settings",
              onclick: () => {
                new RecognationSpeechDialog().show();
              },
              style: {
                display: "block",
              },
            }),
          ]),
        ]);
      },
    });

    // Preview image, video and audio settings ui
    app.ui.settings.addSetting({
      id: `${idExt}.PreviewImageVideoCombo`,
      name: "🔸 Preview images and videos in the list",
      defaultValue: true,
      type: "boolean",
      onChange(value) {
        PreviewImageVideoCombo = value;
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

    // -- Speech & Recognition speech widget
    // If ui settings is true and SpeechSynthesis or speechRecognition is not undefined
    if (SpeechAndRecognationSpeech && (speechRect || SpeechSynthesis)) {
      let nodeIsMultiString = false;
      let outputNode = false;

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

      if (nodeData?.output) {
        for (const out of nodeData.output) {
          if (["STRING"].includes(out)) {
            nodeIsMultiString = true;
            outputNode = true;
            break;
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
            !outputNode
              ? ["customtext", "converted-widget"].includes(w.type)
              : ["customtext"].includes(w.type)
          );
          const isIncludesSpeech = this?.widgets?.some(
            (w) => w.type === "speak_and_recognation_type"
          );

          await new Promise((res) =>
            setTimeout(() => {
              res();
            }, 16 * this.widgets?.length ?? 1)
          );

          if (!isIncludesSpeech && widgetsTextMulti?.length) {
            widgetsTextMulti.forEach(async (w) => {
              this.addCustomWidget(
                SpeechWidget(this, "speak_and_recognation", [false, true], w)
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
              }, 16 * this.widgets?.length ?? 1)
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
  },
});
