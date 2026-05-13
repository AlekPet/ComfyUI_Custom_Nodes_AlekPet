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
        // Create IdeNodeWidget
        node.clsWidget = new IdeNodeWidget(node, inputData);

        return node.clsWidget.widget;
      },
    };
  },

  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    // --- IDENode
    if (nodeData.name === "IDENode") {
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
        await this.clsWidget.loadListCodes();

        // JS run
        api.addEventListener("alekpet_js_result", async ({ detail }) => {
          const { vars, unique_id } = detail;

          if (
            (vars && !Object.keys(vars).length) ||
            +unique_id !== this.id ||
            this._jsProcessing
          ) {
            return;
          }

          await this.clsWidget.jsRunCode(vars, unique_id);
        });

        this.setSize([500, 500]);

        return ret;
      };

      const onDrawForeground = nodeType.prototype.onDrawForeground;
      nodeType.prototype.onDrawForeground = function (ctx) {
        const r = onDrawForeground?.apply?.(this, arguments);

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

        return r;
      };

      // Node Configure
      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = function (node) {
        onConfigure?.apply(this, arguments);
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
            node?.widgets_values?.length === 6 &&
            node?.widgets_values.includes("add_input_variable")
          ) {
            console.log(
              "🔨 [IDENode] Found old version IDENode (6 saved widget values), convert saves value for new version (5)."
            );

            node?.widgets_values.splice(2, 3);
            node?.widgets_values.splice(
              2,
              0,
              ...[this.widgets[widget_load_code_id].options?.default, ""]
            );
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
