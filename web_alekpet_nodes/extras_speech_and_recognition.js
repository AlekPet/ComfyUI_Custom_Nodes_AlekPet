/*
 * Title: Extras extension - Speech And Recognition
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */
import { app } from "../../scripts/app.js";
import { placeSettingRow } from "./utils.js";
import { addStylesheet } from "../../scripts/utils.js";
import {
  SpeechAndRecognation,
  speechRect,
  SpeechSynthesis,
  checkboxLSCheckedByKey,
  getSettingBool,
  setSettingBool,
  KEY_ENABLED,
  KEY_SAVEAS,
} from "./lib/extrasnode/extras_speech_and_recognation_widget.js";
import { RecognationSpeechDialog } from "./lib/extrasnode/extras_speech_and_recognation_dialog.js";

const { $el } = window.comfyAPI.ui;
const convertIdClass = (text) => text.replaceAll(".", "_");
const idExt = "alekpet.ExtrasNode";
const SAVEAS_SELECTOR = ".alekpet_extras_node_recognition_saveAs";

let SpeechAndRecognationSpeech = false;

const toggleBoxes = () =>
  document
    .querySelectorAll(".alekpet_extras_node_speechrecognition_box")
    .forEach((el) => (el.style.display = SpeechAndRecognationSpeech ? "flex" : "none"));

export const syncSaveAsCheckboxes = () => {
  const v = getSaveAs();
  document
    .querySelectorAll(".alekpet_extras_node_recognition_saveAs")
    .forEach((el) => (el.checked = v));
};

const tracked = new Map();

function bind(node, w, ta) {
  const parent = ta.parentElement;
  if (!parent) return;

  let c = tracked.get(ta);
  if (c) {
    c.node = node;
    c.w = w;
    c.speech_recognation.setTarget(node, w);
    const el = c.speech_recognation.element;
    if (el && el.parentElement !== parent) parent.appendChild(el);
    return;
  }

  const speech_recognation = new SpeechAndRecognation(node, w);
  parent.appendChild(speech_recognation.createLayout());
  tracked.set(ta, { node, w, speech_recognation });
}

function walk(graph, seen = new Set()) {
  if (!graph || seen.has(graph)) return;
  seen.add(graph);
  for (const node of graph._nodes ?? graph.nodes ?? []) {
    for (const w of node.widgets ?? []) {
      try {
        const ta = w.element ?? w.inputEl;
        if (ta instanceof HTMLTextAreaElement) bind(node, w, ta);
      } catch (e) {
        console.warn("[Speech] bind error", node?.id, w?.name, e);
      }
    }
    if (node.subgraph) walk(node.subgraph, seen);
  }
}

const scan = () => {
  walk(app.graph);
  walk(app.canvas?.graph);
};

let t;
const scanSoon = () => {
  if (SpeechAndRecognationSpeech && (speechRect || SpeechSynthesis)) {
    clearTimeout(t);
    t = setTimeout(scan, 100);
  }
};

function tick() {
  for (const [ta, c] of tracked) {
    if (!ta.isConnected) {
      tracked.delete(ta);
      continue;
    }
  }
  requestAnimationFrame(tick);
}
//

// -- Extension: Speak text & Recognition speech --
app.registerExtension({
  name: `${idExt}.SpeechAndRecognationSpeech`,
  init() {
    addStylesheet(
      "css/extrasnode/extras_node_speech_recognition_style.css",
      import.meta.url
    );

    let dialogSpeechRecogn = null;

    // Speech & Recognition speech settings ui
    app.ui.settings.addSetting({
      id: KEY_ENABLED,
      name: "🔸 Speak text & Recognition speech",
      defaultValue: false,
      onChange: (v) => {
        SpeechAndRecognationSpeech = !!v;
        toggleBoxes();
        if (SpeechAndRecognationSpeech) scanSoon();
      },
      type: (name, sett, val) => {
        const newUI = document.querySelector(".p-dialog-header");
        const idShow = convertIdClass(`${KEY_ENABLED}_show`);
        return placeSettingRow($el("tr", [
          !newUI
            ? $el("td", [
              $el("label", {
                textContent: name,
                for: convertIdClass(
                  idShow
                ),
              }),
            ])
            : "",
          $el("td", [
            $el(
              "label",
              {
                style: {
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "end",
                },
                textContent: "Enabled: ",
                for: convertIdClass(`${idExt}.SpeechAndRecognationSpeech_show`),
              },
              [
                $el("input", {
                  id: convertIdClass(
                    idShow
                  ),
                  type: "checkbox",
                  checked: !!val,
                  onchange: (e) => sett(!!e.target.checked),
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
                  checked: getSettingBool(KEY_SAVEAS),
                  onchange: (e) => setSettingBool(KEY_SAVEAS, e.target.checked),
                }),
              ]
            ),
            $el("button", {
              textContent: "Speech settings",
              onclick: () => {
                if (dialogSpeechRecogn?.element?.isConnected) return;
                dialogSpeechRecogn = new RecognationSpeechDialog();
                dialogSpeechRecogn.show();
              },
              style: {
                display: "block",
              },
            }),
          ]),
        ]));
      },
    });

    app.ui.settings.addSetting({
      id: KEY_SAVEAS,
      name: "Output Save as?",
      type: "hidden",
      defaultValue: false,
      onChange: () => checkboxLSCheckedByKey(KEY_SAVEAS, SAVEAS_SELECTOR),
    });

  },
  setup() {
    try {
      const legacy = localStorage.getItem(`${idExt}.SpeechAndRecognationSpeechSaveAs`);
      if (legacy !== null) {
        setSettingBool(KEY_SAVEAS, JSON.parse(legacy) === true);
        localStorage.removeItem(`${idExt}.SpeechAndRecognationSpeechSaveAs`);
      }
      localStorage.removeItem(`Comfy.Settings.${idExt}.SpeechAndRecognationSpeech`);
    } catch { }

    new MutationObserver(scanSoon).observe(document.body, {
      childList: true,
      subtree: true,
    });
    requestAnimationFrame(tick);
  },
  nodeCreated: scanSoon,
  loadedGraphNode: scanSoon,
  afterConfigureGraph: scanSoon,
});
