/*
 * Title: Extras extension - Speech And Recognition
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */
import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { comfyuiDesktopConfirm } from "./utils.js";
import { addStylesheet } from "../../scripts/utils.js";
import {
  SpeechWidget,
  speechRect,
  SpeechSynthesis,
  checkboxLSCheckedByKey,
} from "./lib/extrasnode/extras_speech_and_recognation_widget.js";
import { RecognationSpeechDialog } from "./lib/extrasnode/extras_speech_and_recognation_dialog.js";

const convertIdClass = (text) => text.replaceAll(".", "_");
const idExt = "alekpet.ExtrasNode";

// Recognation & speech localStorage settings
const SpeechAndRecognationSpeechLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.SpeechAndRecognationSpeech`
);

// Settings set values from LS or default for Speech & Recognition widget settings
// Default Off: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/issues/166#issuecomment-3107129457
let SpeechAndRecognationSpeech = SpeechAndRecognationSpeechLS
    ? JSON.parse(SpeechAndRecognationSpeechLS)
    : false,
  SpeechAndRecognationSpeechSaveAs = JSON.parse(
    localStorage.getItem(`${idExt}.SpeechAndRecognationSpeechSaveAs`),
    false
  );

// -- Extension: Speak text & Recognition speech --
app.registerExtension({
  name: `${idExt}.SpeechAndRecognationSpeech`,

  init() {
    addStylesheet(
      "css/extrasnode/extras_node_speech_recognition_style.css",
      import.meta.url
    );

    // Speech & Recognition speech settings ui
    app.ui.settings.addSetting({
      id: `${idExt}.SpeechAndRecognationSpeech`,
      name: "🔸 Speak text & Recognition speech",
      defaultValue: false,
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
            $el("a", {
              href: "https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/issues/166#issuecomment-3107129457",
              title: "Causes a bug with multiline fields",
              target: "_blank",
              textContent: "Bug with multiline fields 🐞",
              style: { textDecoration: "none" },
            }),
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
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // -- Speech & Recognition speech widget
    // If ui settings is true and SpeechSynthesis or speechRecognition is not undefined
    if (SpeechAndRecognationSpeech && (speechRect || SpeechSynthesis)) {
      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = async function () {
        const ret = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        let nodeIsMultiString = false;

        if (nodeData?.input && nodeData?.input?.required) {
          for (const inp of Object.keys(nodeData.input.required)) {
            if (
              nodeData.input.required[inp][1]?.multiline &&
              !nodeData.input.required[inp][1]?.forceInput
            ) {
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
            const isElementTextArea = this?.widgets?.some(
              (w) =>
                w?.element?.tagName === "TEXTAREA" ||
                w?.inputEl?.tagName === "TEXTAREA"
            );

            if (isElementTextArea && ["STRING"].includes(out)) {
              nodeIsMultiString = true;
              break;
            }
          }
        }

        if (!nodeIsMultiString) return ret;

        // Find all widget type customtext
        const widgetsTextMulti = this?.widgets?.filter((w) =>
          ["customtext", "converted-widget"].includes(w.type)
        );

        const isIncludesSpeech = this?.widgets?.some(
          (w) => w.type === "speak_and_recognation_type"
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
          const ids_speech_clear = this.widgets.reduce(function (arr, el, idx) {
            if (el.type === "speak_and_recognation_type") arr.push(idx);
            return arr;
          }, []);

          if (!ids_speech_clear.length) return;

          for (const id of ids_speech_clear)
            this?.widgets[id]?.callback(w.widgets_values[id]);
        }
      };
    }
    // -- end - Speech & Recognition speech widget
  },
});
