import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

const findWidget = (node, name, attr = "name") =>
  node.widgets.find((w) => w[attr] === name);

function manual_translate_prompt() {
  const node = this,
    // Widgets
    button_manual_translate = findWidget(node, "Manual Trasnlate"),
    widget_from_translate = findWidget(node, "from_translate"),
    widget_to_translate = findWidget(node, "to_translate"),
    manual_translate = findWidget(node, "manual_translate"),
    widget_textmultiline = findWidget(node, "customtext", "type");

  button_manual_translate.callback = async function () {
    if (manual_translate.value === "off") {
      alert("Manual translate off!");
      return;
    }

    try {
      let responseData = await api.fetchApi("/alekpet/translate_manual", {
        method: "POST",
        body: JSON.stringify({
          prompt: widget_textmultiline.value,
          srcTrans: widget_from_translate.value,
          toTrans: widget_to_translate.value,
        }),
      });

      if (responseData.status != 200) {
        console.log(
          "Error [" + responseData.status + "] > " + responseData.statusText
        );
        return;
      }

      responseData = await responseData?.json();
      if (!responseData || responseData == undefined) {
        console.log("Error not tranlsate manual!");
        return;
      }

      if (responseData.hasOwnProperty("translate_prompt")) {
        widget_textmultiline.value = responseData.translate_prompt;
      }
    } catch (e) {
      throw new Error(e);
    }
  };
  button_manual_translate?.callback();
}

app.registerExtension({
  name: "Comfy.GoogleTranslateNode",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- GoogleTranslateNode
    if (
      nodeData.name == "TranslateTextNode" ||
      nodeData.name == "TranslateCLIPTextEncodeNode"
    ) {
      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        onNodeCreated?.apply?.(this, arguments);
        const node = this,
          GoogleTranslateNode = app.graph._nodes.filter(
            (wi) => wi.type == nodeData.name
          ),
          nodeName = `${nodeData.name}_${GoogleTranslateNode.length}`;

        console.log(`Create ${nodeData.name}: ${nodeName}`);

        node.addWidget(
          "button",
          "Manual Trasnlate",
          "Manual Trasnlate",
          manual_translate_prompt.bind(node)
        );
      };
    }

    // --- GoogleTranslateNode
  },
});
