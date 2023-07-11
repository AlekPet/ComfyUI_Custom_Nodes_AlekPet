import { app } from "../../scripts/app.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

app.registerExtension({
  name: "Comfy.ExtrasNode",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PreviewTextNode") {
      const onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = function () {
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        let PreviewTextNode = app.graph._nodes.filter(
            (wi) => wi.type == "PreviewTextNode"
          ),
          nodeName = `PreviewTextNode_${PreviewTextNode.length}`;

        console.log(`Create PreviewTextNode: ${nodeName}`);

        ComfyWidgets.STRING(
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
        this.onDrawBackground = function () {
          const output = app.nodeOutputs[this.id + ""];
          if (output && output.string) {
            this.widgets[0].inputEl.value = output.string[0];
          }
        };
        return r;
      };
    }
  },
});
