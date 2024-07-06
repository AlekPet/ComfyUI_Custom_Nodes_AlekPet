import { app } from "../../scripts/app.js";
import "./lib/pythonnode/ace-builds/src-min-noconflict/ace.js";
ace.config.set(
  "basePath",
  new URL("./lib/pythonnode/", import.meta.url).toString()
);

const LIST_THEMES = [
  "ambiance",
  "chaos",
  "chrome",
  "cloud9_day",
  "cloud9_night",
  "cloud9_night_low_color",
  "clouds",
  "clouds_midnight",
  "cloud_editor",
  "cloud_editor_dark",
  "cobalt",
  "crimson_editor",
  "dawn",
  "dracula",
  "dreamweaver",
  "eclipse",
  "github",
  "github_dark",
  "github_light_default",
  "gob",
  "gruvbox",
  "gruvbox_dark_hard",
  "gruvbox_light_hard",
  "idle_fingers",
  "iplastic",
  "katzenmilch",
  "kr_theme",
  "kuroir",
  "merbivore",
  "merbivore_soft",
  "monokai",
  "mono_industrial",
  "nord_dark",
  "one_dark",
  "pastel_on_dark",
  "solarized_dark",
  "solarized_light",
  "sqlserver",
  "terminal",
  "textmate",
  "tomorrow",
  "tomorrow_night",
  "tomorrow_night_blue",
  "tomorrow_night_bright",
  "tomorrow_night_eighties",
  "twilight",
  "vibrant_ink",
  "xcode",
];

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
    type: "pycode",
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
  getCustomWidgets(app) {
    return {
      PYCODE: (node, inputName, inputData, app) => {
        const widget = codeEditor(node, inputName, inputData);

        widget.editor.getSession().on("change", function (e) {
          widget.value = widget.editor.getValue();
        });

        const themeList = node.addWidget(
          "combo",
          inputName + "_themes",
          "monokai",
          () => {
            widget.editor.setTheme(`ace/theme/${themeList.value}`);
          },
          {
            values: LIST_THEMES,
            serialize: false,
          }
        );

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
          const widget_code_id = this?.widgets.findIndex(
            (w) => w.type == "pycode"
          );
          const widget_theme_id = this?.widgets.findIndex(
            (w) => w.type == "combo"
          );
          const editor = this.widgets[widget_code_id]?.editor;

          if (editor) {
            editor.setValue(this.widgets_values[widget_code_id]);
            editor.setTheme(
              `ace/theme/${this.widgets_values[widget_theme_id]}`
            );
            editor.clearSelection();
          }
        }
      };
    }
  },
});
