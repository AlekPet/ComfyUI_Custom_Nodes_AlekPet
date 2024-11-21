/*
 * Title: Extras widgets
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { app } from "../../../../scripts/app.js";
import { $el } from "../../../../scripts/ui.js";
import { rgbToHex, isValidStyle } from "../../utils.js";
import { RecognationSpeechDialog } from "./extras_node_dialogs.js";

const CONVERTED_TYPE = "converted-widget";

/* ~~~ Speech & Recognition speech Widget ~~~ */
const spRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechSynthesis = window.speechSynthesis;

let speechRect;
if (spRecognition) {
  speechRect = new spRecognition();
  speechRect.elements = null;

  speechRect.addEventListener("result", (event) => {
    const results = event?.results[0][0]?.transcript;
    if (results && speechRect?.elements?.length) {
      const clear_text = speechRect.elements[0].querySelector(
        ".alekpet_extras_node_recognition_clear"
      );

      if (clear_text.checked) {
        speechRect.elements[1].value = results;
      } else {
        speechRect.elements[1].value += " " + results;
      }
    }
  });

  const resetSpeechRecognition = () => {
    if (speechRect?.elements?.length) {
      const info = speechRect.elements[0].querySelector(
        ".alekpet_extras_node_info span"
      );
      const icon_rec = speechRect.elements[0].querySelector(
        ".alekpet_extras_node_recognition_icon"
      );

      info.textContent = "";
      icon_rec.classList.remove("alekpet_extras_node_recognition_icon_active");

      speechRect.elements = null;
    }
  };

  speechRect.addEventListener("speechend", () => {
    resetSpeechRecognition();
    speechRect.stop();
  });

  speechRect.addEventListener("error", (event) => {
    resetSpeechRecognition();
    console.log(">> Error recognition: " + event.error);
  });
} else {
  console.warn(
    "Your browser does not support: SpeechRecognition.\nIf Firefox: go to about:config > media.webspeech.recognition.enable and media.webspeech.recognition.force_enable > set true"
  );
}

if (!SpeechSynthesis) {
  console.warn("Your browser does not support: speechSynthesis");
}

// Get position speech SpeechRecognition widget
function getPostition(ctx, w_width, y, n_height, wInput) {
  const MARGIN = 10;

  const rect = ctx.canvas.getBoundingClientRect();
  const transform = new DOMMatrix()
    .scaleSelf(rect.width / ctx.canvas.width, rect.height / ctx.canvas.height)
    .multiplySelf(ctx.getTransform())
    .translateSelf(MARGIN, MARGIN);
  const scale = new DOMMatrix().scaleSelf(transform.a, transform.d);

  return {
    transformOrigin: "0 0",
    transform: scale,
    transform: transform,
    left: `${transform.a * w_width - 70 * scale.a + rect.left}px`,
    top: `${(wInput.last_y - 15) * scale.d + scale.f + rect.top}px`,
    maxWidth: `${w_width - MARGIN * 2}px`,
    maxHeight: `${n_height - MARGIN * 2}px`,
    zIndex: wInput?.inputEl?.style?.zIndex
      ? +wInput?.inputEl.style.zIndex + 1
      : 20,
  };
}

function getVoiceAndSettings() {
  const voices = speechSynthesis.getVoices();

  const { voice, volume, pitch, rate } =
    RecognationSpeechDialog.getSettingsRecSpeechLS();
  const voiceSelected = voices.filter((v) => v.name === voice);

  return {
    voice: voiceSelected.length ? voiceSelected[0] : null,
    volume,
    pitch,
    rate,
  };
}

// Function return utterance
function speakSynthesisUtterance(text, options = {}) {
  const utterance = new SpeechSynthesisUtterance(text);

  Object.assign(utterance, { ...options, ...getVoiceAndSettings() });
  return utterance;
}

// Check premissions
async function checkPremissions(
  device = { name: "microphone" },
  update = null
) {
  return navigator.permissions.query(device).then((result) => {
    const state = result.state;
    if (state == "granted") {
      return { device, state, status: true };
    } else if (state == "prompt") {
      return { device, state, status: false };
    } else if (state == "denied") {
      return { device, state, status: false };
    }
    result.onchange = update;
  });
}

function SpeechWidget(node, inputName, inputData, widgetsText) {
  const widget = {
    type: "speak_and_recognation_type",
    name: inputName,
    value: inputData,
    size: [22, 1],
    options: { hideOnZoom: true },
    text_element: widgetsText?.inputEl,
    draw(ctx, node, widget_width, y, widget_height) {
      const hidden = widgetsText?.element?.hidden;

      widget.element.dataset.shouldHide = hidden ? "true" : "false";
      const isInVisibleNodes =
        widget.element.dataset.isInVisibleNodes === "true";
      const isCollapsed = widget.element.dataset.collapsed === "true";
      const actualHidden = hidden || !isInVisibleNodes || isCollapsed;
      const wasHidden = widget.element.hidden;
      widget.element.hidden = actualHidden;
      widget.element.style.display = actualHidden ? "none" : "flex";
      if (actualHidden && !wasHidden) {
        widget.options.onHide?.(widget);
      }

      if (hidden) {
        return;
      }

      Object.assign(
        widget.element.style,
        getPostition(ctx, widget_width, y, node.size[1], widgetsText)
      );
    },
    computeSize(...args) {
      return [22, 1];
    },
    async callback(v) {
      if (widgetsText?.element?.hasAttribute("readonly")) return;

      widget.value = v ?? inputData ?? [false, true];
      const checkboxSave = widget.element.querySelector(
        ".alekpet_extras_node_recognition_save"
      );
      const checkboxClear = widget.element.querySelector(
        ".alekpet_extras_node_recognition_clear"
      );

      checkboxClear.checked = widget.value[1] ?? false;

      const isCheckedSave = widget.value[1] ?? true;

      if (isCheckedSave) {
        const premission = await checkPremissions();
        checkboxSave.checked = premission.status ?? false;
      }
    },
    onRemove() {
      widget.element?.remove();
    },
  };

  const buttons = [];

  if (speechRect && !widgetsText?.element?.hasAttribute("readonly")) {
    buttons.push(
      $el("div.alekpet_extras_node_recognition_icon_box", [
        $el("span.alekpet_extras_node_recognition_icon", {
          title: "Speech recognition",
          onclick: function () {
            const info = widget.element.querySelector(
              ".alekpet_extras_node_info span"
            );

            if (!speechRect.elements) {
              speechRect.elements = [widget.element, widgetsText.inputEl];
              info.textContent = "recognition";
              this.classList.add("alekpet_extras_node_recognition_icon_active");
              speechRect.start();
            } else {
              speechRect.abort();
              info.textContent = "aborted";
              speechRect.elements = null;
              this.classList.remove(
                "alekpet_extras_node_recognition_icon_active"
              );
              setTimeout(() => (info.textContent = ""), 2000);
            }
          },
        }),
        $el(
          "input.alekpet_extras_node_speech_recognition_checkbox.alekpet_extras_node_recognition_save",
          {
            type: "checkbox",
            checked: widget.value[0] ?? false,
            title: "Save in audio file after recognition",
            onchange: async (e) => {
              const checkValue = !!e.target.checked;
              const premission = await checkPremissions();
              if (!premission?.status && premission.state != "prompt") {
                alert(
                  `Access to the device "${premission.device.name}" is denied!\nAllow access to the device!`
                );
              }

              checkValue &&
                navigator.mediaDevices
                  .getUserMedia({ audio: true })
                  .then(() => widget?.callback([checkValue, widget.value[1]]))
                  .catch((e) => {
                    alert(
                      `Access to the device "${premission.device.name}" is denied!\nAllow access to the device!`
                    );
                    widget?.callback([false, widget.value[1]]);
                  });
            },
          }
        ),
        $el("label.alekpet_extras_node_recognition_clear_label", [
          $el(
            "input.alekpet_extras_node_speech_recognition_checkbox.alekpet_extras_node_recognition_clear",
            {
              type: "checkbox",
              checked: widget.value[1] ?? true,
              title: "Clear text after recognition",
              onchange: (e) => {
                widget?.callback([widget.value[0], !!e.target.checked]);
              },
            }
          ),
        ]),
      ])
    );
  }

  if (SpeechSynthesis && speechSynthesis) {
    function buttonsStyles(
      speechesButtons,
      action = "add",
      className = "alekpet_extras_node_speech_icon_playing"
    ) {
      speechesButtons?.forEach((speechButton) =>
        speechButton?.classList[action](className)
      );

      const settingTestSpeech = document.querySelector(
        ".panel_settings_recognation_speech_voice_test"
      );
      if (settingTestSpeech) {
        if (action === "add") {
          settingTestSpeech.style.opacity = 0.7;
          settingTestSpeech.style.color = "var(--error-text)";
          settingTestSpeech.title = "Cancel test speech";
          settingTestSpeech.textContent = "Cancel test";
        } else {
          settingTestSpeech.style.opacity = 1;
          settingTestSpeech.title = "Run test speech";
          settingTestSpeech.textContent = "Test speech";
          settingTestSpeech.style.color = "limegreen";
        }
      }
    }

    buttons.push(
      $el("span.alekpet_extras_node_speech_icon", {
        onclick: function () {
          try {
            const info = widget.element.querySelector(
              ".alekpet_extras_node_info span"
            );

            const speechesButtons = Array.from(
              document.querySelectorAll(".alekpet_extras_node_speech_icon")
            );

            // Already playing
            if (speechSynthesis.speaking) {
              SpeechSynthesis.cancel();

              info.textContent = "canceled";
              this.title = "Speak text";

              buttonsStyles(speechesButtons, "remove");
              setTimeout(() => (info.textContent = ""), 2000);
              return;
            }

            // Start playing text
            const text = widgetsText?.element?.value;
            if (text.trim() !== "") {
              const utterance = speakSynthesisUtterance(text, {
                onend: (e) => {
                  this.title = "Speak text";
                  info.textContent = "";

                  buttonsStyles(speechesButtons, "remove");
                },
              });

              if (utterance) {
                this.title = "Cancel speech";
                info.textContent = "saying now";

                buttonsStyles(speechesButtons);
                SpeechSynthesis.speak(utterance);
              }
            } else {
              const utterance = speakSynthesisUtterance(
                `${widgetsText?.name || "This"}}, field is empty!`,
                {
                  onend: (e) => {
                    this.title = "Speak text";
                    info.textContent = "";

                    buttonsStyles(speechesButtons, "remove");
                  },
                }
              );

              if (utterance) {
                this.title = "Cancel speech";
                info.textContent = "empty text!";
                buttonsStyles(speechesButtons);
                SpeechSynthesis.speak(utterance);
              }
            }
          } catch (err) {
            console.log(err);
          }
        },
        textContent: "🔊",
        title: "Speak text",
      })
    );
  }

  widget.element = $el(
    "div.alekpet_extras_node_speechrecognition_box",
    { hidden: true, style: { display: "none" } },
    [
      $el("div.alekpet_extras_node_speechrecognition_row", [...buttons]),
      $el("div.alekpet_extras_node_info", [
        $el("span", {
          textContent: "",
          style: { fontSize: "0.4em" },
        }),
      ]),
    ]
  );

  const collapse = node.collapse;
  node.collapse = function () {
    collapse.apply(this, arguments);
    if (this.flags?.collapsed) {
      widget.element.hidden = true;
      widget.element.style.display = "none";
    }
    widget.element.dataset.collapsed = this.flags?.collapsed ? "true" : "false";
  };

  const onRemovedOrig = node.onRemoved;
  node.onRemoved = function () {
    node?.widgets?.forEach((w) => {
      if (w.type === "speak_and_recognation_type") {
        w?.onRemove();
      }
    });
    onRemovedOrig?.apply(node, arguments);
  };

  document.body.appendChild(widget.element);

  return widget;
}
/* ~~~ end - Speech & Recognition speech Widget ~~~ */

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
/* ~~~ end - Color Widget ~~~ */

/* ~~~ Preview Image Size Widget ~~~ */
function createPreiviewSize(node, name, options) {
  const { color } = options;

  const res = $el("div", {
    style: {
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

  widget.computeSize = () => [node.size[0], 40];

  return widget;
}
/* ~~~ end - Preview Image Size Widget ~~~ */

export {
  SpeechWidget,
  makeColorWidget,
  createPreiviewSize,
  speechRect,
  SpeechSynthesis,
  speakSynthesisUtterance,
};
