import { app } from "/scripts/app.js";
import { ComfyWidgets } from "/scripts/widgets.js";

app.registerExtension({
  name: "Comfy.ExtrasNode",
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- Preview Text Node
    if (nodeData.name === "PreviewTextNode") {
      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = function () {
        const ret = onNodeCreated ? onNodeCreated.apply(this, arguments) : undefined;

        let PreviewTextNode = app.graph._nodes.filter((wi) => wi.type == nodeData.name),
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
        return ret;
      };

      const outSet = function () {
        const output = app.nodeOutputs[this.id + ""];
        const inputEl = this.widgets.find((w) => w.type === "customtext");
        if (output && output.string && inputEl && inputEl.value !== output.string[0]) {
          inputEl.value = output.string[0];
          app.graph.setDirtyCanvas(true);
        }
      };

      // onSerialize;
      const onSerialize = nodeType.prototype.onSerialize;
      nodeType.prototype.onSerialize = function () {
        onSerialize?.apply(this, arguments);
        outSet.call(this);
      };

      // onExecuted
      const onExecuted = nodeType.prototype.onExecuted;
      nodeType.prototype.onExecuted = function () {
        onExecuted?.apply(this, arguments);
        outSet.call(this);
      };
    }
    // --- Preview Text Node
  },
});
