/*
 * Title: Extras extension - Speech And Recognition
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */
import { app } from "../../scripts/app.js";
import { comfyuiDesktopConfirm } from "./utils.js";
import { addStylesheet } from "../../scripts/utils.js";
import { ComfyWidgets } from "../../../scripts/widgets.js";
import {
  SpeechAndRecognation,
  speechRect,
  SpeechSynthesis,
  checkboxLSCheckedByKey,
} from "./lib/extrasnode/extras_speech_and_recognation_widget.js";
import { RecognationSpeechDialog } from "./lib/extrasnode/extras_speech_and_recognation_dialog.js";

const { $el } = window.comfyAPI.ui;
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

const tracked = new Map();

function bind(node, w, ta) {
  let c = tracked.get(ta);
  if (c) {
    c.node = node;
    c.w = w;
    c.speech_recognation.setTarget(node, w);
    return;
  }

  const speech_recognation = new SpeechAndRecognation(node, w);
  w.element.parentElement.appendChild(speech_recognation.createLayout());

  c = { node, w, speech_recognation };
  tracked.set(ta, c);
}

function walk(graph, seen = new Set()) {
  if (!graph || seen.has(graph)) return;
  seen.add(graph);
  for (const node of graph._nodes ?? graph.nodes ?? []) {
    for (const w of node.widgets ?? []) {
      const ta = w.element ?? w.inputEl;
      if (ta instanceof HTMLTextAreaElement) bind(node, w, ta);
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
                    `${idExt}.SpeechAndRecognationSpeech_show`
                  ),
                  type: "checkbox",
                  checked: val,
                  onchange: (e) => {
                    const checked = !!e.target.checked;
                    SpeechAndRecognationSpeech = checked;
                    localStorage.setItem(
                      `Comfy.Settings.${idExt}.SpeechAndRecognationSpeech`,
                      checked
                    );

                    document
                      .querySelectorAll(
                        ".alekpet_extras_node_speechrecognition_box"
                      )
                      .forEach((el) => {
                        el.style.display = checked ? "flex" : "none";
                      });
                    sett(checked);
                  },
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
  setup() {
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
