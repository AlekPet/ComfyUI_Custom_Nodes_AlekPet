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
        return ret;
      };
      // Function set value
      const outSet = function (texts) {
        if (texts.length > 0) {
          let widget_id = this?.widgets.findIndex(
            (w) => w.type == "customtext"
          );

          if (Array.isArray(texts))
            texts = texts
              .filter((word) => word.trim() !== "")
              .map((word) => word.trim())
              .join(" ");

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
      // onConfigure
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function (w) {
        onConfigure?.apply(this, arguments);
        if (w?.widgets_values?.length) {
          outSet.call(this, w.widgets_values);
        }
      };
    }
    // --- Preview Text Node
  },
});
