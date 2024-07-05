import { app } from "../../scripts/app.js";

import "./lib/pythonnode/ace-builds/src-min-noconflict/ace.js";
ace.config.set(
  "basePath",
  new URL("./lib/pythonnode/", import.meta.url).toString()
);

function getPostition(ctx, w_width, y, n_height) {
  const MARGIN = 5;

  const rect = ctx.canvas.getBoundingClientRect();
  const transform = new DOMMatrix()
    .scaleSelf(rect.width / ctx.canvas.width, rect.height / ctx.canvas.height)
    .multiplySelf(ctx.getTransform())
    .translateSelf(MARGIN, MARGIN + y);

  return {
    transformOrigin: "0 0",
    transform: transform,
    left: `0px`,
    top: `0px`,
    position: "absolute",
    maxWidth: `${w_width - MARGIN * 2}px`,
    maxHeight: `${n_height - MARGIN * 2 - y - 15}px`,
    width: "100%",
    height: "50%",
  };
}

// Create editor code
function codeEditor(node, inputName, inputData) {
  const widget = {
    type: "PYCODE",
    name: inputName,
    value:
      inputData[1]?.default ||
      `def my(a, b=1):
  return a * b<br>
    
result = str(my(23, 9))`,
    size: [500, 250],
    draw(ctx, node, widget_width, y, widget_height) {
      Object.assign(
        this.codeElement.style,
        getPostition(ctx, widget_width, y, node.size[1])
      );
    },
    computeSize(...args) {
      return [500, 250];
    },
  };

  widget.codeElement = document.createElement("pre");
  widget.codeElement.id = "py_editor_code";
  widget.codeElement.innerHTML = widget.value;

  widget.editor = ace.edit(widget.codeElement);
  widget.editor.setTheme("ace/theme/monokai");
  widget.editor.session.setMode("ace/mode/python");

  document.body.appendChild(widget.codeElement);

  return widget;
}

// Register extensions
app.registerExtension({
  name: "Comfy.ExperimentalNodesAlekPet",
  async setup(app) {},
  getCustomWidgets(app) {
    return {
      PYCODE: (node, inputName, inputData, app) => {
        const widget = codeEditor(node, inputName, inputData);

        widget.editor.getSession().on("change", function (e) {
          widget.value = widget.editor.getValue();
        });

        node.addCustomWidget(widget);
        return widget;
      },
    };
  },

  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- PythonNode
    if (nodeData.name === "PythonNode") {
      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = async function () {
        const ret = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        let PythonNode = app.graph._nodes.filter(
            (wi) => wi.type == nodeData.name
          ),
          nodeName = `${nodeData.name}_${PythonNode.length}`;

        console.log(`Create ${nodeData.name}: ${nodeName}`);

        this.onRemoved = function () {
          for (const w of this?.widgets) {
            if (w?.codeElement) w.codeElement.remove();
          }
        };

        this.setSize(this.computeSize(this.size));

        return ret;
      };

      // Node Configure
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function (w) {
        onConfigure?.apply(this, arguments);
        if (w?.widgets_values?.length) {
          const widget_id = this?.widgets.findIndex((w) => w.type == "PYCODE");
          const editor = this.widgets[widget_id]?.editor;
          if (editor) {
            editor.setValue(this.widgets_values[widget_id]);
            editor.clearSelection();
          }
        }
      };
    }
  },
});
