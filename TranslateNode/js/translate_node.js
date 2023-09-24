import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const properties_widget = {};
const findWidget = (node, name, attr = "name") => node.widgets.find((w) => w[attr] === name);
const doesInputWithNameExist = (node, name) => (node.inputs ? node.inputs.some((input) => input.name === name) : false);

/*  Thanks "TinyTerra" for the toggleWidget function, which hides the widget.
 *  Github: https://github.com/TinyTerra
 *  Code line: https://github.com/TinyTerra/ComfyUI_tinyterraNodes/blob/main/js/ttNdynamicWidgets.js#L9
 */
function toggleWidget(node, widget, show = false, button = {}) {
  if (!widget || doesInputWithNameExist(node, widget.name)) return;

  if (!properties_widget[widget.name]) {
    properties_widget[widget.name] = { origType: widget.type, origComputeSize: widget.computeSize, show: show };
  } else {
    properties_widget[widget.name].show = show;
  }
  const origSize = node.size;

  if (button?.type == "button" && button?.name) {
    button.name = show ? `Hide ${button.value}` : `Show ${button.value}`;
  }

  widget.type = show ? properties_widget[widget.name].origType : "hidden_" + widget.name;
  widget.computeSize = show ? properties_widget[widget.name].origComputeSize : () => [0, -4];

  widget.linkedWidgets?.forEach((w) => toggleWidget(node, w, ":" + widget.name, show));

  const height = show ? Math.max(node.computeSize()[1], origSize[1]) : node.size[1];
  node.setSize([node.size[0], height]);
}

function get_support_langs() {
  let node = this,
    // Widgets
    widgetService = findWidget(node, "service"),
    widget_from_translate = findWidget(node, "from_translate"),
    widget_to_translate = findWidget(node, "to_translate"),
    widget_auth_data = findWidget(node, "auth_data"),
    widget_proxies = findWidget(node, "proxies"),
    widget_hide_proxy = findWidget(node, "hide_proxy"),
    widget_hide_auth = findWidget(node, "hide_authorization"),
    // Placeholders
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

  const obj_to_text = (obj, text = "", keys = [], vals = []) => {
    let _toText = "";
    for (const [key, value] of Object.entries(obj)) if (!keys.includes(key) && !vals.includes(value) && value.indexOf(text) === -1) _toText += `${key}=${value}\n`;
    return _toText;
  };

  widgetService.callback = async function () {
    let service = this.value.replace(/\s*\[.*\]/g, ""),
      responseData = await api.fetchApi(`/alekpet/tranlsate_langs_support/${service}`);
    responseData = await responseData?.json();

    if (!responseData || responseData == undefined) {
      console.log("Invalid service, select default: GoogleTranslator !");
      responseData = await api.fetchApi(`/alekpet/tranlsate_langs_support/GoogleTranslator`);
      responseData = await responseData?.json();
    }

    if (responseData && Object.keys(responseData).length) {
      // Proxies
      const proxies = responseData?.proxyes;
      if (proxies) {
        if (widget_proxies) widget_proxies.inputEl.value = obj_to_text(proxies);
      }

      const settings = responseData?.settings;
      if (settings && Object.keys(settings).length) {
        toggleWidget(node, widget_auth_data, properties_widget[widget_auth_data.name]?.show || settings?.auth_input_in_node || false, widget_hide_auth);
        toggleWidget(node, widget_proxies, properties_widget[widget_proxies.name]?.show || settings?.proxyes_input_in_node || false, widget_hide_proxy);
      }

      const langs_service = responseData?.langs_service;
      if (langs_service && Object.keys(langs_service).length) {
        const langs_service = responseData.langs_service;
        const defaultValue = Object.keys(langs_service).find((f) => f.toLowerCase() == "english" || f.toLowerCase() == "en") || "english";

        // From translate
        widget_from_translate.options.values = ["auto"].concat(Object.keys(langs_service));
        widget_from_translate.value = widget_from_translate.options.values[0];

        // To translate
        widget_to_translate.options.values = Object.keys(langs_service);
        widget_to_translate.value = defaultValue;

        // Auth
        const auth_data = responseData?.auth_data;
        if (widget_auth_data) {
          let placeholder = Object.keys(placeholders).find((ph_key) => ph_key.includes(service) || ph_key === service);
          widget_auth_data.inputEl.placeholder = placeholders[placeholder];
          widget_auth_data.inputEl.value = obj_to_text(auth_data, "your_");
        }
      }
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
        const node = this,
          DeepTranslator = app.graph._nodes.filter((wi) => wi.type == nodeData.name),
          nodeName = `${nodeData.name}_${DeepTranslator.length}`;

        console.log(`Create ${nodeData.name}: ${nodeName}`);

        node.addWidget("button", "hide_proxy", "proxy", function () {
          let w = findWidget(node, "proxies");
          toggleWidget(node, w, !properties_widget[w.name].show, this);
        });

        node.addWidget("button", "hide_authorization", "authorization", function () {
          let w = findWidget(node, "auth_data");
          toggleWidget(node, w, !properties_widget[w.name].show, this);
        });

        get_support_langs.apply(node);
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
