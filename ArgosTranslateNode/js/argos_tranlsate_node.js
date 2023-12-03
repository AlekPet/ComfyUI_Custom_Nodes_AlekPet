import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const findWidget = (node, name, attr = "name") =>
  node.widgets.find((w) => w[attr] === name);

function get_support_langs() {
  let node = this,
    // Widgets values
    widgets_values =
      node?.widgets_values?.length > 0 ? node.widgets_values : [],
    // Widgets
    widget_from_translate = findWidget(node, "from_translate"),
    widget_to_translate = findWidget(node, "to_translate");

  widget_from_translate.callback = async function () {
    let responseData = await api.fetchApi(
      `/alekpet/argo_langs_support/${this.value}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    responseData = await responseData?.json();

    if (!responseData || responseData == undefined) {
      console.log("Invalid language, select default: en");
      responseData = await api.fetchApi(`/alekpet/argo_langs_support/en`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      responseData = await responseData?.json();
    }

    if (responseData && Object.keys(responseData).length) {
      const langs_support = responseData?.langs_support;

      if (langs_support && langs_support?.length) {
        const defaultValue =
          langs_support.find((f) => f.toLowerCase() == "en") || "en";
        // To translate
        widget_to_translate.options.values = langs_support;
        widget_to_translate.value = defaultValue;
      }
      // -----
      app.graph.setDirtyCanvas(true);
    }
  };
  widget_from_translate?.callback();
}

app.registerExtension({
  name: "Comfy.ArgosTranslateNode",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- Argos Translate Node
    if (
      nodeData.name == "ArgosTranslateCLIPTextEncodeNode" ||
      nodeData.name == "ArgosTranslateTextNode"
    ) {
      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        onNodeCreated?.apply?.(this, arguments);
        const node = this,
          ArgosTranslateNode = app.graph._nodes.filter(
            (wi) => wi.type == nodeData.name
          ),
          nodeName = `${nodeData.name}_${ArgosTranslateNode.length}`;

        console.log(`Create ${nodeData.name}: ${nodeName}`);

        get_support_langs.apply(node);
      };

      // Node Configure
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function () {
        onConfigure?.apply?.(this, arguments);
        if (this?.widgets_values.length) get_support_langs.apply(this);
      };
    }

    // --- DeepTranslatorTextNode
  },
});
