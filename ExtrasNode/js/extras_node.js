import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

function makeColorWidget(node, inputName, inputData, widget) {
  const color_hex = document.createElement("input");
  color_hex.type = "color";
  color_hex.value = inputData[1]?.default || "#ffffff";

  const color_text = document.createElement("div");
  color_text.title = "Click to copy color to clipboard";
  Object.assign(color_text.style, {
    textAlign: "center",
    fontSize: "20px",
    height: "20px",
    fontWeight: "600",
    lineHeight: 1.5,
    background: "var(--comfy-menu-bg)",
    border: "dotted 2px white",
    fontFamily: "sans-serif",
    letterSpacing: "0.5rem",
    borderRadius: "8px",
    textShadow: "0 0 4px #fff",
    cursor: "pointer",
  });

  color_text.addEventListener("click", () =>
    navigator.clipboard.writeText(color_hex.value)
  );

  const w_color_hex = node.addDOMWidget(inputName, "color_hex", color_hex, {
    getValue() {
      color_text.style.color = color_hex.value;
      color_text.textContent = color_hex.value;
      return color_hex.value;
    },
    setValue(v) {
      widget.value = v;
      color_hex.value = v;
    },
  });

  widget.callback = (v) => {
    widget.value = v;
  };

  color_hex.addEventListener("input", () => {
    widget.callback?.(color_hex.value);
  });

  const w_color_text = node.addDOMWidget(
    inputName + "_box",
    "color_hex_box",
    color_text
  );

  w_color_hex.color_hex = color_hex;

  widget.w_color_hex = w_color_hex;
  widget.w_color_text = w_color_text;

  return { widget };
}

app.registerExtension({
  name: "Comfy.ExtrasNode",
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

            if (
              !color_hex?.length &&
              +unique_id !== this.id &&
              !widgetColor?.widget
            ) {
              return;
            }

            widgetColor.widget.w_color_hex.value = color_hex;
          });

          return ret;
        };
        break;
      }
      // -- Color nodes

      default: {
        break;
      }
    }
  },
});
