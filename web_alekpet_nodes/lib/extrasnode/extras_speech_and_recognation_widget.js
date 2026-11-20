/*
 * Title: Extras Speech And Recognation Widget
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { api } from "../../../../scripts/api.js";
import { app } from "../../../../scripts/app.js";
import {
  createWindowModal,
  animateClick,
  comfyuiDesktopAlert,
} from "../../utils.js";
import { RecognationSpeechDialog } from "./extras_speech_and_recognation_dialog.js";

const { $el } = window.comfyAPI.ui;
const idExt = "alekpet.ExtrasNode";

// Recognation & speech settings
export const KEY_ENABLED = `${idExt}.SpeechAndRecognationSpeech`;
export const KEY_SAVEAS = `${idExt}.SpeechAndRecognationSpeechSaveAs`;

export const getSettingBool = (id, def = false) => {
  try {
    return !!app.ui.settings.getSettingValue(id, def);
  } catch {
    return def;
  }
};

export const setSettingBool = (id, v) => {
  try {
    app.ui.settings.setSettingValue(id, !!v);
  } catch (e) {
    console.warn("[Speech] setting error", id, e);
  }
};

/* ~~~ Speech & Recognition ~~~ */
const spRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const SpeechSynthesis = window.speechSynthesis;

const regExpFileName = /[^\p{L}\d]+/gu;
const maxLenAudioFileName = 50;

let speechRect;
let mediaRecorder = null;
let audioChunks = [];

if (spRecognition) {
  speechRect = new spRecognition();
  speechRect.elements = null;
  speechRect.isRecognition = false;
  speechRect.isRecognitionAbort = false;
  speechRect.lastText = "";

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

      speechRect.elements[0].querySelector(
        ".alekpet_extras_node_recognition_aborted"
      ).style.display = "none";

      icon_rec.classList.remove("alekpet_extras_node_recognition_icon_active");
      setTimeout(() => (info.textContent = ""), 1000);
    }

    setStylesAllElements(".alekpet_extras_node_recognition_icon", null, {
      display: "inline-block",
    });

    if (mediaRecorder) {
      speechRect.lastText = speechRect?.elements[1].value;
      mediaRecorder.stop();
    } else {
      speechRect.lastText = "";
      speechRect.isRecognitionAbort = false;
    }

    mediaRecorder = null;
    audioChunks = [];
    speechRect.isRecognition = false;

    speechRect.elements = null;
  };

  speechRect.addEventListener("audiostart", (e) => {
    speechRect.isRecognition = true;
  });

  speechRect.addEventListener("end", () => {
    resetSpeechRecognition();
    speechRect.stop();
  });

  speechRect.addEventListener("speechend", () => {
    resetSpeechRecognition();
    speechRect.stop();
  });

  speechRect.addEventListener("error", (event) => {
    if (speechRect?.elements?.length) {
      const info = speechRect.elements[0].querySelector(
        ".alekpet_extras_node_info span"
      );
      info.textContent = event.error;
    }
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
  return navigator.permissions
    .query(device)
    .then((result) => {
      const state = result.state;
      if (state == "granted") {
        return { device, state, status: true };
      } else if (state == "prompt") {
        return { device, state, status: false };
      } else if (state == "denied") {
        return { device, state, status: false };
      }
      result.onchange = update;
    })
    .catch((e) => ({ device, state: "error", status: false }));
}

// Check checkbox
function checkboxLSCheckedByKey(settingId, selector, defaultVal = false) {
  const v = getSettingBool(settingId, defaultVal);
  document.querySelectorAll(selector).forEach((el) => (el.checked = v));
}

// Set styles
const setStylesAllElements = (selector, exclude = null, styles = {}) => {
  let elements = Array.from(document.querySelectorAll(selector));
  if (exclude) elements = elements.filter((r) => r !== exclude);
  elements = elements.map((r) => Object.assign(r.style, styles));
};

// Class SpeechAndRecognation
class SpeechAndRecognation {
  constructor(node, widgetsText) {
    this.node = node;
    this.widgetsText = widgetsText;
    this.element = null;
  }

  widgetHide() {
    const hidden = this.widgetsText?.element?.hidden || this.widgetsText.hidden;

    this.element.style.display =
      hidden || app.canvas.ds.scale < 0.6 ? "none" : "flex";
    return hidden;
  }

  cfg() {
    const name = this.widgetsText?.name;
    const def = () => ({ clear_text: true, save_record: false });
    if (!name) return def();

    this.node.properties ??= {};
    const all = (this.node.properties.alekpet_speech_and_recognation_settings ??= {});

    if ("save_record" in all || "clear_text" in all) {
      const old = {
        clear_text: all.clear_text ?? true,
        save_record: all.save_record ?? false,
      };
      delete all.clear_text;
      delete all.save_record;
      all[name] ??= old;
    }
    return (all[name] ??= def());
  }

  setTarget(node, w) {
    this.node = node;
    this.widgetsText = w;
    this.refresh();
  }

  refresh() {
    if (!this.element) return;
    const cfg = this.cfg();
    const save = this.element.querySelector(".alekpet_extras_node_recognition_save");
    const clear = this.element.querySelector(".alekpet_extras_node_recognition_clear");
    if (save) save.checked = !!cfg.save_record;
    if (clear) clear.checked = !!cfg.clear_text;
  }

  createLayout() {
    const buttons = [];

    if (speechRect && !this.widgetsText?.element?.hasAttribute("readonly")) {
      buttons.push(
        $el("div.alekpet_extras_node_recognition_icon_box", [
          $el("span.alekpet_extras_node_recognition_aborted", {
            title: "Speech recognition abort",
            textContent: "✖",
            style: { display: "none" },
            onclick: async (e) => {
              const info = this.element.querySelector(
                ".alekpet_extras_node_info span"
              );

              if (speechRect.isRecognition) {
                e.target.style.display = "none";
                speechRect.isRecognitionAbort = true;
                speechRect.abort();
                info.textContent = "aborted";
                e.target.classList.remove(
                  "alekpet_extras_node_recognition_icon_active"
                );
                setTimeout(() => (info.textContent = ""), 2000);
              }
            },
          }),
          $el("span.alekpet_extras_node_recognition_icon", {
            title: "Speech recognition",
            onclick: async (e) => {
              const info = this.element.querySelector(
                ".alekpet_extras_node_info span"
              );
              const abort = this.element.querySelector(
                ".alekpet_extras_node_recognition_aborted"
              );
              const checkboxSave = this.element.querySelector(
                ".alekpet_extras_node_recognition_save"
              );

              // Hide other recognitions buttons
              setStylesAllElements(
                ".alekpet_extras_node_recognition_icon",
                e.target,
                {
                  display: "none",
                }
              );

              // Recognition
              if (speechRect.elements === null) {
                // Record audio
                if (checkboxSave.checked) {
                  try {
                    const stream = await navigator.mediaDevices.getUserMedia({
                      audio: true,
                    });

                    mediaRecorder = new MediaRecorder(stream);

                    mediaRecorder.ondataavailable = (event) => {
                      audioChunks.push(event.data);
                    };

                    mediaRecorder.onstop = async () => {
                      if (speechRect.isRecognitionAbort) {
                        speechRect.lastText = "";
                        speechRect.isRecognitionAbort = false;
                        return;
                      }

                      const saveAsWindow = getSettingBool(KEY_SAVEAS);

                      // Filename
                      let nameFile = "recording.webm";
                      if (speechRect?.lastText?.length) {
                        nameFile = `${speechRect.lastText
                          .slice(0, maxLenAudioFileName)
                          .replaceAll(regExpFileName, "_")}.webm`;
                      }

                      // Get audio
                      const audioBlob = new Blob(audioChunks, {
                        type: "audio/webm",
                      });

                      if (!saveAsWindow) {
                        const body = new FormData();
                        body.append("image", audioBlob, nameFile);
                        body.append("overwrite", "true");
                        const resp = await api.fetchApi("/upload/image", {
                          method: "POST",
                          body,
                        });

                        if (resp.status !== 200) {
                          console.error(
                            "[ExtrasNode] Recording audio not saved!"
                          );
                          return;
                        }

                        console.log(
                          `[ExtrasNode] Recording audio "${nameFile}" saved successfully!`
                        );
                      } else {
                        const audioUrl = URL.createObjectURL(audioBlob);
                        const linkDown = document.createElement("a");
                        linkDown.href = audioUrl;
                        linkDown.download = nameFile;
                        linkDown.click();
                      }

                      speechRect.lastText = "";
                    };
                  } catch (err) {
                    comfyuiDesktopAlert(
                      `Device "Microphone" - ${err.message}!\n\nCheck device or allow access!`
                    );
                  }
                }
                // end - Record audio

                speechRect.elements = [
                  this.element,
                  this.widgetsText.element ?? this.widgetsText.inputEl,
                ];
                info.textContent = "recognition";
                console.log(e);
                e.target.classList.add(
                  "alekpet_extras_node_recognition_icon_active"
                );
                speechRect.start();
                mediaRecorder && mediaRecorder.start();
                abort.style.display = "inline-block";
              } else {
                speechRect.stop();
                abort.style.display = "none";
                info.textContent = "stoped";
                e.target.classList.remove(
                  "alekpet_extras_node_recognition_icon_active"
                );
                setTimeout(() => (info.textContent = ""), 2000);
              }
            },
          }),
          // Settings elements
          $el("div.alekpet_extras_node_speech_recognition_settings", [
            $el(
              "div.alekpet_extras_node_speech_recognition_settings_button.pi.pi-cog",
              {
                title: "Settings",
                onclick: (e) => {
                  Promise.resolve()
                    .then(() => {
                      const wrappers = document.querySelectorAll(
                        ".alekpet__wrapper__window"
                      );
                      wrappers.forEach((wrapper) => {
                        wrapper.style.display = "none";
                        const preParent = wrapper.closest(
                          ".alekpet_extras_node_speechrecognition_box"
                        );

                        if (preParent)
                          preParent.parentElement.classList.remove(
                            "alekpet_extras_node_speech_recognition_settings_parent_active"
                          );
                      });
                      this.element.parentElement.classList.add(
                        "alekpet_extras_node_speech_recognition_settings_parent_active"
                      );
                    })
                    .then(() => {
                      checkboxLSCheckedByKey(KEY_SAVEAS, ".alekpet_extras_node_recognition_saveAs");
                      animateClick(e.currentTarget.nextElementSibling);
                    });
                },
              }
            ),
            createWindowModal({
              textTitle: null,
              stylesClose: {
                top: "-4px",
                right: "4px",
                width: "auto",
                height: "auto",
                padding: "2px",
                fontSize: "0.4rem",
                lineHeight: 1,
              },
              stylesBox: {
                background: "transparent",
                border: 0,
                padding: 0,
                boxShadow: "none",
              },
              stylesBody: {
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: "3px",
                textWrap: "wrap",
                background: "rgb(131, 131, 131)",
                color: "white",
                padding: "2px",
                marginTop: "2px",
                borderRadius: "6px",
                fontSize: "0.4rem",
                minWidth: "85px",
              },
              stylesWrapper: {
                minWidth: "100px",
                transform: "translate(0%, 0%)",
              },
              textBody: [
                $el(
                  "label.alekpet_extras_node_speech_recognition_settings_props_label",
                  [
                    $el(
                      "span.alekpet_extras_node_speech_recognition_settings_props_name",
                      {
                        textContent: "Recoding audio",
                        title: "Save in audio file after recognition",
                      }
                    ),
                    $el(
                      "input.alekpet_extras_node_speech_recognition_settings_props_input.alekpet_extras_node_speech_recognition_checkbox.alekpet_extras_node_recognition_save",
                      {
                        type: "checkbox",
                        checked: this.cfg().save_record ?? false,
                        onchange: (e) => {
                          if (
                            this.widgetsText?.element?.hasAttribute("readonly")
                          )
                            return;
                          this.cfg().save_record = !!e.target.checked;
                        },
                      }
                    ),
                  ]
                ),
                $el(
                  "label.alekpet_extras_node_speech_recognition_settings_props_label",
                  [
                    $el(
                      "span.alekpet_extras_node_speech_recognition_settings_props_name",
                      {
                        textContent: "Clear text",
                        title: "Clear text after recognition",
                      }
                    ),
                    $el(
                      "input.alekpet_extras_node_speech_recognition_settings_props_input.alekpet_extras_node_speech_recognition_checkbox.alekpet_extras_node_recognition_clear",
                      {
                        type: "checkbox",
                        checked: this.cfg().clear_text ?? true,
                        onchange: (e) => {
                          if (
                            this.widgetsText?.element?.hasAttribute("readonly")
                          )
                            return;
                          this.cfg().clear_text = !!e.target.checked;
                        },
                      }
                    ),
                  ]
                ),
                $el("hr", { style: { padding: 0, margin: 0 } }),
                $el(
                  "label.alekpet_extras_node_speech_recognition_settings_props_label",
                  [
                    $el(
                      "span.alekpet_extras_node_speech_recognition_settings_props_name",
                      {
                        textContent: "'Save as' window?",
                        title: "Show modal window when saving recorded audio.",
                      }
                    ),
                    $el(
                      "input.alekpet_extras_node_speech_recognition_settings_props_input.alekpet_extras_node_speech_recognition_checkbox.alekpet_extras_node_recognition_saveAs",
                      {
                        type: "checkbox",
                        checked: getSettingBool(KEY_SAVEAS),
                        onchange: (e) => setSettingBool(KEY_SAVEAS, e.target.checked),
                        onchange: (e) => {
                          const check = !!e.target.checked;
                          const settCheck = document.body.querySelector(
                            "[id$='.SpeechAndRecognationSpeech'] div input"
                          );
                          settCheck && (settCheck.checked = check);

                          localStorage.setItem(
                            `${idExt}.SpeechAndRecognationSpeechSaveAs`,
                            check
                          );

                          checkboxLSCheckedByKey(
                            `${idExt}.SpeechAndRecognationSpeechSaveAs`,
                            ".alekpet_extras_node_recognition_saveAs"
                          );
                        },
                      }
                    ),
                  ]
                ),
              ],
            }),
          ]),
          // end -- Settings elements
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
          onclick: (e) => {
            try {
              const info = this.element.querySelector(
                ".alekpet_extras_node_info span"
              );

              const speechesButtons = Array.from(
                document.querySelectorAll(".alekpet_extras_node_speech_icon")
              );

              // Already playing
              if (speechSynthesis.speaking) {
                SpeechSynthesis.cancel();

                info.textContent = "canceled";
                e.currentTarget.title = "Speak text";

                buttonsStyles(speechesButtons, "remove");
                setTimeout(() => (info.textContent = ""), 2000);
                return;
              }

              // Start playing text
              const text = this.widgetsText?.element?.value;

              if (text?.trim() !== "") {
                const utterance = speakSynthesisUtterance(text, {
                  onend: (ev) => {
                    ev.currentTarget.title = "Speak text";
                    info.textContent = "";

                    buttonsStyles(speechesButtons, "remove");
                  },
                });

                if (utterance) {
                  e.currentTarget.title = "Cancel speech";
                  info.textContent = "saying now";

                  buttonsStyles(speechesButtons);
                  SpeechSynthesis.speak(utterance);
                }
              } else {
                const utterance = speakSynthesisUtterance(
                  `${this.widgetsText?.name || "This"}, field is empty!`,
                  {
                    onend: (ev) => {
                      ev.currentTarget.title = "Speak text";
                      info.textContent = "";

                      buttonsStyles(speechesButtons, "remove");
                    },
                  }
                );

                if (utterance) {
                  e.currentTarget.title = "Cancel speech";
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

    this.element = $el(
      "div.alekpet_extras_node_speechrecognition_box",
      { style: { display: "none", right: "0", top: "-15px" } },
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

    this.widgetHide();
    return this.element;
  }
}
/* ~~~ end - Speech & Recognition ~~~ */

export {
  // SpeechWidget,
  SpeechAndRecognation,
  speechRect,
  SpeechSynthesis,
  speakSynthesisUtterance,
  checkboxLSCheckedByKey,
};
