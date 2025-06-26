/*
 * Title: Extras extension - Speech And Recognition Dialog
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { ComfyDialog } from "../../../../../scripts/ui.js";
import { makeElement } from "../../utils.js";
import { speakSynthesisUtterance } from "./extras_speech_and_recognation_widget.js";

const idExt = "alekpet.ExtrasNode";

export class RecognationSpeechDialog extends ComfyDialog {
  static getSettingsRecSpeechLS() {
    const SpeechVoiceLS = localStorage.getItem(
      `Comfy.Settings.${idExt}.SpeechVoice`
    );

    const SpeechVolumeLS = localStorage.getItem(
      `Comfy.Settings.${idExt}.SpeechVolume`
    );
    const SpeechPitchLS = localStorage.getItem(
      `Comfy.Settings.${idExt}.SpeechPitch`
    );
    const SpeechRateLS = localStorage.getItem(
      `Comfy.Settings.${idExt}.SpeechRate`
    );

    const voice =
        SpeechVoiceLS && SpeechVoiceLS.trim() !== "" ? SpeechVoiceLS : null,
      volume =
        SpeechVolumeLS && SpeechVolumeLS.trim() !== "" ? +SpeechVolumeLS : 1,
      pitch = SpeechPitchLS && SpeechPitchLS.trim() !== "" ? +SpeechPitchLS : 1,
      rate = SpeechRateLS && SpeechRateLS.trim() !== "" ? +SpeechRateLS : 1;
    return { voice, volume, pitch, rate };
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

    const synth = window.speechSynthesis;
    if (synth) {
      const voices = synth.getVoices();

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
          this.settings[opt] = e.target.value;
          localStorage.setItem(
            `Comfy.Settings.${idExt}.Speech${
              opt[0].toUpperCase() + opt.slice(1)
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
    this.cancelSpeech();
    this.settings = RecognationSpeechDialog.getSettingsRecSpeechLS();
    this.defaultSettings = {
      volume: { min: 0, max: 1, default: 1 },
      rate: { min: 0.1, max: 10, default: 1 },
      pitch: { min: 0, max: 2, default: 1 },
    };

    const box = makeElement("div", {
      class: ["box_recognation_speech"],
      style: {
        width: "80vw",
        color: "var(--input-text)",
        padding: "20px",
      },
      children: [await this.createPanelSettings()],
    });

    super.show(box);
    this.element.style.zIndex = 9999;

    const close = this.element.children[0].querySelectorAll("button")[1];
    close.style.width = "50%";

    const divButtons = makeElement("div", {
      class: ["box_recognation_speech_buttons"],
      style: { display: "flex" },
      children: [
        makeElement("button", {
          textContent: "Reset to default",
          style: { width: "50%" },
          onclick: (e) => {
            const ranges = box.querySelectorAll("[type='range']");

            // Reset voice
            const selectElement = box.querySelector(
              ".panel_settings_recognation_speech_voice"
            );
            const indexDefault = Array.from(selectElement.options).findIndex(
              (o) => o.textContent.includes(" — DEFAULT")
            );
            selectElement.selectedIndex = indexDefault;
            localStorage.removeItem(`Comfy.Settings.${idExt}.SpeechVoice`);

            // Reset settings
            for (const r of ranges) {
              r.value = this.defaultSettings[r.dataset.name].default ?? 1;
              r.nextElementSibling.textContent = r.value;
              r.dispatchEvent(new Event("change"));
            }
          },
        }),
        close,
      ],
      parent: this.element.children[0],
    });
  }
  close() {
    this.cancelSpeech();
    this.element.remove();
  }
}
