import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { makeModal } from "./utils.js";

const findWidget = (node, name, attr = "name", func = "find") =>
  node.widgets[func]((w) => w[attr] === name);

function manual_translate_prompt() {
  const node = this,
    // Widgets
    button_manual_translate = findWidget(node, "Manual Trasnlate"),
    widget_from_translate = findWidget(node, "from_translate"),
    widget_to_translate = findWidget(node, "to_translate"),
    manual_translate = findWidget(node, "manual_translate"),
    widget_textmultiline = findWidget(node, "customtext", "type");

  button_manual_translate.callback = async function () {
    if (!!!manual_translate.value) {
      makeModal({
        title: "Info",
        text: "<p>Manual translate disabled!</p><p>The translation works when you start generating images.</p>",
      });

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
      nodeData.name == "GoogleTranslateTextNode" ||
      nodeData.name == "GoogleTranslateCLIPTextEncodeNode"
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

        node.widgets[2].type = "toggle";
        node.widgets[2].value = false;
        node.widgets.splice(3, 0, node.widgets.pop());
      };

      // Node Configure
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function () {
        onConfigure?.apply(this, arguments);

        if (this?.widgets_values.length) {
          if (typeof this.widgets_values[2] === "string") {
            const customtext = findWidget(this, "text", "name", "findIndex");
            this.widgets[customtext].value = this.widgets_values[2];
            this.widgets[2].value = false;
          }
        }
      };
    }

    // --- GoogleTranslateNode
  },
});
