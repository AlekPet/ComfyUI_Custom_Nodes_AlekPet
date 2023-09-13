import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

function get_support_langs() {
  let node = self,
    widgetService = this.widgets.find((w) => w.name == "service"),
    widget_from_translate = this.widgets.find((w) => w.name == "from_translate"),
    widget_to_translate = this.widgets.find((w) => w.name == "to_translate"),
    widget_auth_data = this.widgets.find((w) => w.name == "auth_data"),
    placeholders = {
      "GoogleTranslator,LingueeTranslator,MyMemoryTranslator,PonsTranslator": "No need authorization data",
      "ChatGptTranslator,YandexTranslator,MicrosoftTranslator,DeeplTranslator": "api_key=your_api_key",
      LibreTranslator: "No need used free_api or your api_key:\napi_key=your_api_key",
      PapagoTranslator: "client_id=your_client_id\nsecret_key=your_secret_key",
      BaiduTranslator: "appid=your-appid\nappkey=your-appkey",
      QcriTranslator:
        "No need used free_api or your api_key, default domain=general:\napi_key=your_api_key\ndomain=dialectal,dialectal-fast,general,general-fast,general-neural,general-neural-large,medical,neural-beta,neural-opus-dev,pb-debug",
    };

  widgetService.callback = async function () {
    let service = this.value.replace(/\s\[.*\]/g, ""),
      lang_support = await api.fetchApi(`/alekpet/tranlsate_langs_support/${service}`);
    lang_support = await lang_support.json();

    if (lang_support?.langs_service && Object.keys(lang_support.langs_service)) {
      // From translate
      widget_from_translate.options.values = ["auto"].concat(Object.keys(lang_support.langs_service));
      widget_from_translate.value = widget_from_translate.options.values[0];
      // To translate
      widget_to_translate.options.values = Object.keys(lang_support.langs_service);
      let defaultValue = Object.keys(lang_support.langs_service).find((f) => f.toLowerCase() == "english" || f.toLowerCase() == "en") || "english";
      widget_to_translate.value = defaultValue;
      // Auth
      let placeholder = Object.keys(placeholders).find((ph_key) => ph_key.includes(service) || ph_key === service);
      widget_auth_data.inputEl.placeholder = placeholders[placeholder];
      // -----
      app.graph.setDirtyCanvas(true);
    }
  };
  widgetService?.callback();
}

app.registerExtension({
  name: "Comfy.TranslateNode",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- DeepTranslatorTextNode
    if (nodeData.name === "DeepTranslatorTextNode") {
      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        onNodeCreated?.apply?.(this, arguments);

        let DeepTranslatorTextNode = app.graph._nodes.filter((wi) => wi.type == "DeepTranslatorTextNode"),
          nodeName = `DeepTranslatorTextNode_${DeepTranslatorTextNode.length}`;

        console.log(`Create DeepTranslatorTextNode: ${nodeName}`);
        get_support_langs.apply(this);
      };
    }
    // --- DeepTranslatorTextNode
  },
});
