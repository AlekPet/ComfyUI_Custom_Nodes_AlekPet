/*
 * Title: Extras extension - Speech And Recognition Dialog
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { makeElement } from "../../utils.js";
import { speakSynthesisUtterance } from "./extras_speech_and_recognation_widget.js";

const { ComfyDialog } = window.comfyAPI.ui;
const idExt = "alekpet.ExtrasNode";

export class RecognationSpeechDialog {
  constructor() {
    this.overlay = null;
  }

  static getSettingsRecSpeechLS() {
    const getItemLS = (k) => localStorage.getItem(`Comfy.Settings.${idExt}.${k}`);
    const num = (k, def) => {
      const raw = getItemLS(k);
      const n = raw && raw.trim() !== "" ? Number(raw) : NaN;
      return Number.isFinite(n) ? n : def;
    };
    const voiceRaw = getItemLS("SpeechVoice");
    return {
      voice: voiceRaw && voiceRaw.trim() !== "" ? voiceRaw : null,
      volume: num("SpeechVolume", 1),
      pitch: num("SpeechPitch", 1),
      rate: num("SpeechRate", 1),
    };
  }


  async createPanelSettings() {
    const panelSettings = makeElement("div", {
      class: ["panel_settings_recognation_speech"],
      style: {
        display: "grid",
        gridTemplateColumns: "0.2fr 1fr 0.2fr",
        alignItems: "center",
        justifyContent: "center",
        gap: "5px",
      },
    });

    const voicesList = makeElement("select", {
      class: ["panel_settings_recognation_speech_voice"],
      onchange: (e) => {
        const value = e.target.options[e.target.selectedIndex].dataset.name;
        this.settings.voice = value;
        localStorage.setItem(`Comfy.Settings.${idExt}.SpeechVoice`, value);
      },
    });

    const loadVoices = () =>
      new Promise((resolve) => {
        const synth = window.speechSynthesis;
        if (!synth) return resolve([]);
        const v = synth.getVoices();
        if (v.length) return resolve(v);
        const done = () => resolve(synth.getVoices());
        synth.addEventListener("voiceschanged", done, { once: true });
        setTimeout(done, 1000);
      });

    const synth = window.speechSynthesis;
    if (synth) {
      const voices = await loadVoices();

      for (let i = 0; i < voices.length; i++) {
        const voice = voices[i];
        const option = makeElement("option", {
          textContent: `${voices[i].name} (${voices[i].lang})`,
          dataset: { lang: voice.lang, name: voice.name },
          parent: voicesList,
        });

        if (voice.default) option.textContent += " — DEFAULT";
        if (voice.name === this.settings.voice) option.selected = true;
      }
    }

    panelSettings.append(
      makeElement("div", {
        class: ["panel_settings_recognation_speech_voice_label"],
        textContent: "Select voice: ",
        style: { fontWeight: "800" },
      }),
      voicesList,
      makeElement("button", {
        textContent: "Test speech",
        style: { color: "limegreen", fontSize: "1rem" },
        class: ["panel_settings_recognation_speech_voice_test"],
        onclick: (e) => {
          const target = e.target;
          const SpeechSynthesis = window.speechSynthesis;

          if (SpeechSynthesis && speechSynthesis) {
            if (SpeechSynthesis.speaking) {
              this.cancelSpeech();
              target.style.opacity = 1;
              target.title = "Run test speech";
              target.textContent = "Test speech";
              target.style.color = "limegreen";
              return;
            }

            const utterance = speakSynthesisUtterance(
              "Hello! This is testing speech, on the ComfyUI!",
              {
                onend: (e) => {
                  target.style.opacity = 1;
                  target.title = "Run test speech";
                  target.textContent = "Test speech";
                  target.style.color = "limegreen";
                  this.cancelSpeech();
                },
              }
            );

            if (utterance) {
              target.style.opacity = 0.7;
              target.style.color = "var(--error-text)";
              target.title = "Cancel test speech";
              target.textContent = "Cancel test";
              Array.from(
                document.querySelectorAll(".alekpet_extras_node_speech_icon")
              ).forEach((speechButton) => {
                speechButton.classList.add(
                  "alekpet_extras_node_speech_icon_playing"
                );
              });
              SpeechSynthesis.speak(utterance);
            }
          } else {
            target.textContent = "Not support!";
            target.style.color = "var(--error-text)";
            setTimeout(() => {
              target.textContent = "Test speech";
              target.style.color = "limegreen";
            }, 500);
          }
        },
      })
    );

    for (const opt in this.defaultSettings) {
      const option = this.defaultSettings[opt];
      const label = makeElement("div", {
        class: [`panel_settings_recognation_speech_${opt}_label`],
        textContent: `${opt[0].toUpperCase() + opt.slice(1)}: `,
        style: { fontWeight: "800" },
      });

      const element = makeElement("input", {
        class: [`panel_settings_recognation_speech_${opt}_input`],
        type: "range",
        min: option.min,
        max: option.max,
        step: 0.1,
        dataset: { name: opt },
        oninput: (e) => {
          e.target.nextElementSibling.textContent = e.target.value;
        },
        onchange: (e) => {
          this.settings[opt] = Number(e.target.value);
          localStorage.setItem(
            `Comfy.Settings.${idExt}.Speech${opt[0].toUpperCase() + opt.slice(1)
            }`,
            e.target.value
          );
        },
      });

      element.value = this.settings[opt] ?? option.default;

      const valueEl = makeElement("span", {
        class: [`panel_settings_recognation_speech_${opt}_value`],
        textContent: element.value,
        style: { justifySelf: "center" },
      });
      panelSettings.append(label, element, valueEl);
    }

    return panelSettings;
  }

  cancelSpeech() {
    if (window.speechSynthesis && window.speechSynthesis.speak) {
      Array.from(
        document.querySelectorAll(".alekpet_extras_node_speech_icon")
      ).forEach((speechButton) => {
        speechButton.classList.remove(
          "alekpet_extras_node_speech_icon_playing"
        );
      });
      window.speechSynthesis.cancel();
    }
  }

  async show() {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "alekpet_storage_overlay";
    this.overlay.title = "Close dialog"

    const box = document.createElement("div");
    box.className = "alekpet_storage_box";

    const header = document.createElement("div");
    header.className = "alekpet_storage_header";
    header.innerHTML = `<strong>Speech and Recognition: <span style='color: #7e797d;'>Voice settings</span></strong>`;

    const close = document.createElement("button");
    close.textContent = "✕";
    close.onclick = () => this.close();
    header.appendChild(close);

    this.cancelSpeech();
    this.settings = RecognationSpeechDialog.getSettingsRecSpeechLS();
    this.defaultSettings = {
      volume: { min: 0, max: 1, default: 1 },
      rate: { min: 0.1, max: 10, default: 1 },
      pitch: { min: 0, max: 2, default: 1 },
    };

    const panelSettings = makeElement("div", {
      class: ["box_recognation_speech"],
      style: {
        color: "var(--input-text)",
        padding: "20px",
      },
      children: [await this.createPanelSettings()],
    });


    box.append(header, panelSettings)

    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.close();
    });

    const stop = (e) => e.stopPropagation();
    [
      "pointerdown", "pointerup", "mousedown", "mouseup", "click",
      "focusin", "focusout", "keydown",
    ].forEach((ev) => this.overlay.addEventListener(ev, stop));

    this.overlay.addEventListener("keydown", (e) => {
      if (e.key === "Escape") this.close();
    });

    this.overlay.tabIndex = -1;
    this.overlay.focus();

    document.body.append(this.overlay);

    const divButtons = makeElement("div", {
      class: ["box_recognation_speech_buttons"],
      style: {
        display: "flex",
        gap: "10px",
        padding: "15px",
        flexWrap: "nowrap",
        justifyContent: "space-evenly"
      },
      children: [
        makeElement("button", {
          textContent: "Reset to default",
          style: {
            width: "50%"
          },
          onclick: (e) => {
            const ranges = box.querySelectorAll("[type='range']");

            // Reset voice
            const selectElement = box.querySelector(
              ".panel_settings_recognation_speech_voice"
            );
            const indexDefault = Array.from(selectElement.options).findIndex(
              (o) => o.textContent.includes(" — DEFAULT")
            );
            selectElement.selectedIndex = indexDefault >= 0 ? indexDefault : 0;
            this.settings.voice = null;
            localStorage.removeItem(`Comfy.Settings.${idExt}.SpeechVoice`);

            // Reset settings
            for (const r of ranges) {
              r.value = this.defaultSettings[r.dataset.name].default ?? 1;
              r.nextElementSibling.textContent = r.value;
              r.dispatchEvent(new Event("change"));
            }
          },
        }),
      ],
      parent: box,
    });

    this.overlay.appendChild(box)
  }
  close() {
    this.cancelSpeech();
    this.overlay?.remove();
    this.overlay = null;
  }
}
