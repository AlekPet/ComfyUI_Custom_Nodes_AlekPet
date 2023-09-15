import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

function get_support_langs() {
  let node = this,
    widgetService = this.widgets.find((w) => w.name == "service"),
    widget_from_translate = this.widgets.find((w) => w.name == "from_translate"),
    widget_to_translate = this.widgets.find((w) => w.name == "to_translate"),
    widget_auth_data = this.widgets.find((w) => w.name == "auth_data"),
    placeholders = {
      "GoogleTranslator,LingueeTranslator,MyMemoryTranslator,PonsTranslator": "Authorization data:\nThis service does not require api_key or other information.",
      "ChatGptTranslator,YandexTranslator,MicrosoftTranslator,DeeplTranslator": "Authorization data:\napi_key=your_api_key",
      LibreTranslator: "Authorization data:\nThis service uses the already specified api_key, if you want you can replace it with your own:\napi_key=your_api_key",
      PapagoTranslator: "Authorization data:\nclient_id=your_client_id\nsecret_key=your_secret_key",
      BaiduTranslator: "Authorization data:\nappid=your-appid\nappkey=your-appkey",
      QcriTranslator:
        "Information:\nThis service uses the already specified api_key, if you want you can replace it with your own.\n" +
        "You can select one of the domains, default domain=general\nList domains: dialectal, dialectal-fast, general, general-fast, general-neural, general-neural-large, medical, neural-beta, neural-opus-dev, pb-debug:\n" +
        "Authorization data:\napi_key=your_api_key",
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
    // --- DeepTranslatorTextNode and DeepTranslatorCLIPTextEncodeNode
    if (nodeData.name == "DeepTranslatorTextNode" || nodeData.name == "DeepTranslatorCLIPTextEncodeNode") {
      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        onNodeCreated?.apply?.(this, arguments);

        let DeepTranslator = app.graph._nodes.filter((wi) => wi.type == nodeData.name),
          nodeName = `${nodeData.name}_${DeepTranslator.length}`;

        console.log(`Create {nodeData.name}: ${nodeName}`);

        get_support_langs.apply(this);
      };

      // Node Configure
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function () {
        onConfigure?.apply?.(this, arguments);
        get_support_langs.apply(this);
      };
    }

    // --- DeepTranslatorTextNode
  },
});
