/*
 * Title: Extras extensions
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";
import { addStylesheet } from "../../scripts/utils.js";
import { makeColorWidget } from "./lib/extrasnode/extras_node_widgets.js";

const idExt = "alekpet.ExtrasNode";

// Register Extension
app.registerExtension({
  name: idExt,

  init() {
    addStylesheet("css/extrasnode/extras_node_styles.css", import.meta.url);
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- Preview Text Node
    switch (nodeData.name) {
      case "PreviewTextNode": {
        // Node Created
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
          const ret = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined;

          let PreviewTextNode = app.graph._nodes.filter(
              (wi) => wi.type == nodeData.name
            ),
            nodeName = `${nodeData.name}_${PreviewTextNode.length}`;

          console.log(`Create ${nodeData.name}: ${nodeName}`);

          const wi = ComfyWidgets.STRING(
            this,
            nodeName,
            [
              "STRING",
              {
                default: "",
                placeholder: "Text message output...",
                multiline: true,
              },
            ],
            app
          );
          wi.widget.inputEl.readOnly = true;

          this.setSize(this.computeSize(this.size));
          app.graph.setDirtyCanvas(true, false);

          return ret;
        };
        // Function set value
        const outSet = function (texts) {
          if (texts.length > 0) {
            let widget_id = this?.widgets.findIndex(
              (w) => w.type == "customtext"
            );

            if (Array.isArray(texts)) {
              texts = texts.map((v) =>
                typeof v === "object" ? JSON.stringify(v) : v.toString()
              );
              texts = texts
                .filter((word) => word.trim() !== "")
                .map((word) => word.trim())
                .join(" ");
            }
            this.widgets[widget_id].value = texts;
            app.graph.setDirtyCanvas(true);
          }
        };

        // onExecuted
        const onExecuted = nodeType.prototype.onExecuted;
        nodeType.prototype.onExecuted = function (texts) {
          onExecuted?.apply(this, arguments);
          outSet.call(this, texts?.string);
        };

        break;
      }
      // --- Preview Text Node

      // -- Colors nodes
      case "ColorsCorrectNode": {
        // Node Created
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
          const ret = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined;

          let ColorsCorrectNode = app.graph._nodes.filter(
              (wi) => wi.type == nodeData.name
            ),
            nodeName = `${nodeData.name}_${ColorsCorrectNode.length}`;

          console.log(`Create ${nodeData.name}: ${nodeName}`);

          return ret;
        };
        break;
      }

      case "HexToHueNode": {
        // Node Created
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
          const ret = onNodeCreated
            ? onNodeCreated.apply(this, arguments)
            : undefined;

          let HexToHueNode = app.graph._nodes.filter(
              (wi) => wi.type == nodeData.name
            ),
            nodeName = `${nodeData.name}_${HexToHueNode.length}`;

          console.log(`Create ${nodeData.name}: ${nodeName}`);

          let widgetColor = null;
          for (let w of this.widgets) {
            if (w.name === "color_hex") {
              widgetColor = makeColorWidget(
                this,
                nodeData.name,
                nodeData?.input?.required?.color_hex,
                w
              );
            }
          }

          api.addEventListener("alekpet_get_color_hex", async ({ detail }) => {
            const { color_hex, unique_id } = detail;

            if (+unique_id !== this.id || !color_hex) {
              return;
            }

            widgetColor.widget.w_color_hex.value = color_hex;
          });

          return ret;
        };
        break;
      }

      default: {
        break;
      }
    }
  },
});
