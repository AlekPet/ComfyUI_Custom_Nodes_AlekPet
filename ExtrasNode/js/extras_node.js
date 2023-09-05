import { app } from "/scripts/app.js";
import { ComfyWidgets } from "/scripts/widgets.js";

app.registerExtension({
  name: "Comfy.ExtrasNode",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PreviewTextNode") {
      // Node Created
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
        return r;
      };
      // Node Executed
      const onNodeExecuted = nodeType.prototype.onExecuted;
      nodeType.prototype.onExecuted = function () {
        onNodeExecuted?.apply(this, arguments);

        const output = app.nodeOutputs[this.id + ""];
        if (output && output.string) {
          this.widgets[0].inputEl.value = output.string[0];
        }
      };
    }
  },
});
