import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import "./lib/idenode/ace-builds/src-min-noconflict/ace.js";
import {
  IdeNodeWidget,
  loadListCodes,
  defaultComboValue,
  saveValue,
} from "./lib/idenode/ide_node_widget.js";
import { addStylesheet } from "../../scripts/utils.js";
import { findWidget } from "./utils.js";

ace.config.set(
  "basePath",
  new URL(
    "./lib/idenode/ace-builds/src-min-noconflict/",
    import.meta.url
  ).toString()
);

// Paint widget function
function paintWidget(paramsPaint) {
  const oldDraw = this.drawWidget;
  const that = this;

  this.draw = function () {
    // Save old params and set new
    const old_params = {};
    for (const param in paramsPaint) {
      if (!LiteGraph.hasOwnProperty(param)) continue;
      old_params[param] = LiteGraph[param];
      LiteGraph[param] = paramsPaint[param];
    }

    oldDraw?.apply(that, arguments);

    // Restore old params
    for (const param in old_params) {
      LiteGraph[param] = old_params[param];
    }
  };
}

// Register extensions
app.registerExtension({
  name: "alekpet.IDENode",
  init(app) {
    addStylesheet("css/idenode/ide_node_styles.css", import.meta.url);
  },
  getCustomWidgets(app) {
    return {
      PYCODE: async (node, inputName, inputData, app) => {
        // Create widget IdeNode
        const clsIdeNode = new IdeNodeWidget(node, inputData);
        node.clsIdeNodeEditor = clsIdeNode.clsEditor;
        return clsIdeNode.getWidget();
      },
    };
  },

  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- IDENode
    if (nodeData.name === "IDENode") {
      // Node custom properties
      nodeType.prototype.toggleEnabled = true;

      // Node Created
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = async function () {
        const ret = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        const node_title = await this.getTitle();
        const nodeName = `${nodeData.name}_${this.id}`;

        console.log(`Create ${nodeData.name}: ${nodeName}`);
        this.name = nodeName;

        // Create default inputs, when first create node
        // if (this?.inputs?.length === 2) {
        //   ["var1", "var2", "var3"].forEach((inputName) => {
        //     const currentWidth = this.size[0];
        //     this.addInput(inputName, "*");
        //     this.setSize([currentWidth, this.size[1]]);
        //   });
        // }

        // Load list codes by language
        await this.clsIdeNodeEditor.loadItemListCodes();

        // Widget update_node
        const update_widget = this.addWidget(
          "number",
          "update_node",
          0,
          () => {}
        );
        update_widget.hidden = true;

        // Python run code
        const executionPyRunHandler = async ({ detail }) => {
          if (this._destroyed || this._pyProcessing) return;

          const { unique_id, error } = detail;

          this._pyProcessing = true;
          await this.clsIdeNodeEditor.pyRunCode(unique_id, error);
        };

        // JavaScript run code
        const executionRunJsHandler = async ({ detail }) => {
          if (this._destroyed) return;

          const { vars, unique_id } = detail;
          if (
            (vars && !Object.keys(vars).length) ||
            +unique_id !== this.id ||
            this._jsProcessing
          ) {
            return;
          }

          await this.clsIdeNodeEditor.jsRunCode(vars, unique_id);
        };

        // Execution start - update_widget
        const executionStartHandler = () => {
          if (!this.graph) return;
          if (this.toggleEnabled) {
            update_widget.value++;
            this.graph.change();
          }
        };

        // Handlers
        this._executionPyRunHandler = executionPyRunHandler;
        this._executionRunJsHandler = executionRunJsHandler;
        this._executionStartHandler = executionStartHandler;

        // Api events
        if (!this._listenersRegistered) {
          this._listenersRegistered = true;
          api.addEventListener("alekpet_py_result", executionPyRunHandler);
          api.addEventListener("alekpet_js_result", executionRunJsHandler);
          api.addEventListener("execution_start", executionStartHandler);
        }

        this.setSize([500, 500]);

        return ret;
      };

      // Node Removed
      const onRemoved = nodeType.prototype.onRemoved;
      nodeType.prototype.onRemoved = function () {
        this._destroyed = true;

        // Execution start
        if (this._executionStartHandler) {
          api.removeEventListener(
            "execution_start",
            this._executionStartHandler
          );
          this._executionStartHandler = null;
        }

        // JavaScript run code
        if (this._executionRunJsHandler) {
          api.removeEventListener(
            "alekpet_js_result",
            this._executionRunJsHandler
          );

          this._executionRunJsHandler = null;
        }

        // Python run code
        if (this._executionPyRunHandler) {
          api.removeEventListener(
            "alekpet_py_result",
            this._executionPyRunHandler
          );

          this._executionPyRunHandler = null;
        }

        onRemoved?.apply(this, arguments);
      };

      // Node onDrawForeground
      const onDrawForeground = nodeType.prototype.onDrawForeground;
      nodeType.prototype.onDrawForeground = function (ctx) {
        onDrawForeground?.apply?.(this, arguments);

        if (this.flags?.collapsed) return r;

        if (this?.outputs?.length) {
          for (let o = 0; o < this.outputs.length; o++) {
            const { name, type } = this.outputs[o];
            const colorType = LGraphCanvas.link_type_colors[type.toUpperCase()];
            const nameSize = ctx.measureText(name);
            const typeSize = ctx.measureText(
              `[${type === "*" ? "any" : type.toLowerCase()}]`
            );

            ctx.fillStyle = colorType === "" ? "#AAA" : colorType;
            ctx.font = "12px Arial, sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(
              `[${type === "*" ? "any" : type.toLowerCase()}]`,
              this.size[0] - nameSize.width - typeSize.width,
              o * 20 + 19
            );
          }
        }

        if (this?.inputs?.length) {
          const not_showing = ["language", "pycode", "theme_highlight"];
          for (let i = 0; i < this.inputs.length; i++) {
            const { name, type } = this.inputs[i];
            if (not_showing.includes(name)) continue;
            const colorType = LGraphCanvas.link_type_colors[type.toUpperCase()];
            const nameSize = ctx.measureText(name);
            ctx.fillStyle = !colorType || colorType === "" ? "#AAA" : colorType;
            ctx.font = "12px Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(
              `[${type === "*" ? "any" : type.toLowerCase()}]`,
              nameSize.width + 25,
              i * 20 + 13 * not_showing.length - not_showing.length * 20
            );
          }
        }

        // Switch update_node
        const x = this.size[0] - 50;
        const y = -LiteGraph.NODE_TITLE_HEIGHT + 6;

        // Text and badge
        ctx.fillStyle = this.toggleEnabled ? "#58AF3E" : "#777";
        ctx.beginPath();
        ctx.roundRect(x - 65, y - 2, 106, 22, 6);
        ctx.fill();

        ctx.save();
        ctx.fillStyle = this.toggleEnabled ? "#fff" : "#444";
        ctx.textAlign = "right";
        ctx.textBaseline = "middle";
        ctx.fillText("UPDATE", x - 10, y + 10);
        ctx.restore();

        // background
        ctx.fillStyle = this.toggleEnabled ? "#2c8801" : "#444";
        ctx.beginPath();
        ctx.roundRect(x, y, 36, 18, 9);
        ctx.fill();

        // circle
        ctx.fillStyle = "#fff";
        ctx.beginPath();

        ctx.arc(this.toggleEnabled ? x + 27 : x + 9, y + 9, 7, 0, Math.PI * 2);

        ctx.fill();

        // save area
        this._toggleBounds = [x, y, 36, 18];
      };

      nodeType.prototype.onSerialize = function (o) {
        o.toggleEnabled = this.toggleEnabled;
      };

      // Node MouseDown
      const onMouseDown = nodeType.prototype.onMouseDown;
      nodeType.prototype.onMouseDown = function (e, localPos, graphCanvas) {
        if (this._toggleBounds) {
          const [x, y, w, h] = this._toggleBounds;

          if (
            localPos[0] >= x &&
            localPos[0] <= x + w &&
            localPos[1] >= y &&
            localPos[1] <= y + h
          ) {
            this.toggleEnabled = !this.toggleEnabled;

            this.setDirtyCanvas(true, true);
            return true;
          }
        }

        if (onMouseDown) {
          return onMouseDown.apply(this, arguments);
        }
      };

      // Node Configure
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function (node) {
        onConfigure?.apply(this, arguments);

        this.toggleEnabled = node.toggleEnabled ?? true;

        if (node?.widgets_values?.length) {
          const widget_code_id = findWidget(
            this,
            "widget_pycode",
            "type",
            "findIndex"
          );
          const widget_theme_id = findWidget(
            this,
            "theme_highlight",
            "name",
            "findIndex"
          );
          const widget_language_id = findWidget(
            this,
            "language",
            "name",
            "findIndex"
          );

          const widget_load_code_id = findWidget(
            this,
            "Load code",
            "name",
            "findIndex"
          );

          if (
            node?.widgets_values.includes("add_input_variable") &&
            node?.widgets_values.includes("add_output_variable")
          ) {
            console.log(
              "🔨 [IDENode] Found old version IDENode (6 saved widget values), convert saves value for new version (5 saved widget values)."
            );

            node?.widgets_values.splice(2, 3);
            node?.widgets_values.splice(
              2,
              0,
              ...[this.widgets[widget_load_code_id].options?.default, ""]
            );
          }

          if (node.inputs.length > 2) {
            for (const i of node.inputs) {
              if (
                !["language", "pycode", "theme_highlight"].includes(i.name) &&
                i.widget
              ) {
                const widget = this.addWidget(
                  i.type ?? "number",
                  i.name,
                  1.0,
                  (v) => {
                    widget.value = v;
                  }
                );

                i.widget = widget;
                i.widget.value =
                  node?.widgets_values[
                    findWidget(this, i.name, "name", "findIndex")
                  ];
              }
            }
          }

          this.widgets[widget_load_code_id].value =
            this.widgets[widget_load_code_id].options?.default;

          const editor = this.widgets[widget_code_id]?.editor;

          if (editor) {
            const lang = node?.widgets_values[widget_language_id]?.trim()
              ? node?.widgets_values[widget_language_id]
              : "python";
            const theme = node?.widgets_values[widget_theme_id]?.trim()
              ? node?.widgets_values[widget_theme_id]
              : "monokai";

            editor.setTheme(`ace/theme/${theme}`);
            this.widgets[widget_theme_id].value = theme;

            editor.session.setMode(`ace/mode/${lang}`);
            this.widgets[widget_language_id].value = lang;

            editor.setValue(node?.widgets_values[widget_code_id]);
            editor.clearSelection();
          }
        }
      };

      // ExtraMenuOptions
      const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
      nodeType.prototype.getExtraMenuOptions = function (_, options) {
        getExtraMenuOptions?.apply(this, arguments);

        const past_index = options.length - 1;
        const past = options[past_index];

        if (!!past) {
          // Inputs remove
          for (const input_idx in this.inputs) {
            const input = this.inputs[input_idx];

            if (["language", "theme_highlight", "pycode"].includes(input.name))
              continue;

            options.splice(past_index + 1, 0, {
              content: `Remove Input ${input.name}`,
              callback: (e) => {
                const currentWidth = this.size[0];
                if (input.link) {
                  app.graph.removeLink(input.link);
                }

                this.removeInput(input_idx);
                this.setSize([currentWidth, this.size[1]]);
                saveValue();
              },
            });
          }

          // Output remove
          for (const output_idx in this.outputs) {
            const output = this.outputs[output_idx];

            if (output.name === "result") continue;

            options.splice(past_index + 1, 0, {
              content: `Remove Output ${output.name}`,
              callback: (e) => {
                const currentWidth = this.size[0];
                if (output.link) {
                  app.graph.removeLink(output.link);
                }
                this.removeOutput(output_idx);
                this.setSize([currentWidth, this.size[1]]);
                saveValue();
              },
            });
          }
        }
      };
      // end - ExtraMenuOptions
    }
  },
});
