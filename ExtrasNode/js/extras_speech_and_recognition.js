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
let SpeechAndRecognationSpeech = SpeechAndRecognationSpeechLS
    ? JSON.parse(SpeechAndRecognationSpeechLS)
    : true,
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
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
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
