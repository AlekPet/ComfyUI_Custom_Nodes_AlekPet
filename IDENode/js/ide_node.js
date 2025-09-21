import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import "./lib/idenode/ace-builds/src-min-noconflict/ace.js";
import {
  createWindowModal,
  makeElement,
  findWidget,
  THEMES_MODAL_WINDOW,
  comfyuiDesktopConfirm,
  comfyuiDesktopPrompt,
} from "./utils.js";

ace.config.set(
  "basePath",
  new URL(
    "./lib/idenode/ace-builds/src-min-noconflict/",
    import.meta.url
  ).toString()
);

// Constants
const MAX_CHAR_VARNAME = 50;
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

const DEFAULT_TEMPLATES = {
  js: `// !!! Attention, do not insert unverified code !!!
// ---- Example code ----
// Globals inputs variables: var1, var2, var3, user variables ...
const runCode = () => {
  const date = new Date().toJSON().replace("T"," ");
  return date.slice(0,date.indexOf("."))
}
result = \`Hello ComfyUI with us today \${runCode()}!\``,
  py: `# !!! Attention, do not insert unverified code !!!
# ---- Example code ----
# Globals inputs variables: var1, var2, var3, user variables ...
from time import strftime
def runCode():
    nowDataTime = strftime("%Y-%m-%d %H:%M:%S")
    return f"Hello ComfyUI with us today {nowDataTime}!"
result = runCode()            
`,
};

function getPostition(node, ctx, w_width, y, n_height) {
  const margin = 5;

  const rect = ctx.canvas.getBoundingClientRect();
  const transform = new DOMMatrix()
    .scaleSelf(rect.width / ctx.canvas.width, rect.height / ctx.canvas.height)
    .multiplySelf(ctx.getTransform())
    .translateSelf(margin, margin + y);
  const scale = new DOMMatrix().scaleSelf(transform.a, transform.d);

  return {
    transformOrigin: "0 0",
    transform: scale,
    left: `${transform.a + transform.e + rect.left}px`,
    top: `${transform.d + transform.f + rect.top}px`,
    maxWidth: `${w_width - margin * 2}px`,
    maxHeight: `${n_height - margin * 2 - y - 15}px`,
    width: `${w_width - margin * 2}px`,
    height: "90%",
    position: "absolute",
    scrollbarColor: "var(--descrip-text) var(--bg-color)",
    scrollbarWidth: "thin",
    zIndex: app.graph._nodes.indexOf(node),
  };
}

// Create editor code
function codeEditor(node, inputName, inputData) {
  const widget = {
    type: "pycode",
    name: inputName,
    options: { hideOnZoom: true },
    value:
      inputData[1]?.default ||
      `def my(a, b=1):
  return a * b<br>
    
result = str(my(23, 9))`,
    draw(ctx, node, widget_width, y, widget_height) {
      const hidden =
        node.flags?.collapsed ||
        (!!widget.options.hideOnZoom && app.canvas.ds.scale < 0.5) ||
        widget.type === "converted-widget" ||
        widget.type === "hidden";

      widget.codeElement.hidden = hidden;

      if (hidden) {
        widget.options.onHide?.(widget);
        return;
      }

      Object.assign(
        this.codeElement.style,
        getPostition(node, ctx, widget_width, y, node.size[1])
      );
    },
    computeSize(...args) {
      return [500, 250];
    },
  };

  widget.codeElement = makeElement("pre", {
    innerHTML: widget.value,
  });

  widget.editor = ace.edit(widget.codeElement);
  widget.editor.setTheme("ace/theme/monokai");
  widget.editor.session.setMode("ace/mode/python");
  widget.codeElement.hidden = true;

  document.body.appendChild(widget.codeElement);

  const collapse = node.collapse;
  node.collapse = function () {
    collapse.apply(this, arguments);
    if (this.flags?.collapsed) {
      widget.codeElement.hidden = true;
    } else {
      if (this.flags?.collapsed === false) {
        widget.codeElement.hidden = false;
      }
    }
  };

  return widget;
}

// Save data to workflow forced!
function saveValue() {
  app?.extensionManager?.workflow?.activeWorkflow?.changeTracker?.checkState();
}

// Register extensions
app.registerExtension({
  name: "alekpet.IDENode",
  getCustomWidgets(app) {
    return {
      PYCODE: (node, inputName, inputData, app) => {
        const widget = codeEditor(node, inputName, inputData);

        widget.editor.getSession().on("change", function (e) {
          widget.value = widget.editor.getValue();
          saveValue();
        });

        const themeList = node.addWidget(
          "combo",
          "theme_highlight",
          "monokai",
          (v) => {
            widget.editor.setTheme(`ace/theme/${themeList.value}`);
          },
          {
            values: LIST_THEMES,
            serialize: false,
          }
        );

        const widgetLang_id = findWidget(node, "language", "name", "findIndex");
        if (widgetLang_id !== -1) {
          node.widgets[widgetLang_id].callback = async (v) => {
            widget.editor.setTheme(`ace/theme/${themeList.value}`);

            if (await comfyuiDesktopConfirm("Clear code?"))
              widget.editor.setValue("");

            if (await comfyuiDesktopConfirm("Paste template?")) {
              let defaultCode = null;
              if (v === "javascript") {
                defaultCode = DEFAULT_TEMPLATES.js;
              } else if (v === "python") {
                defaultCode = DEFAULT_TEMPLATES.py;
              }

              if (defaultCode) {
                widget.editor.setValue(defaultCode);
                widget.editor.clearSelection();
              }
            }

            widget.editor.session.setMode(`ace/mode/${v}`);
          };
        }

        function makeValidVariable(
          varName,
          textContent,
          regex = /^[a-z_][a-z0-9_]*$/i
        ) {
          if (
            !varName ||
            varName.trim() === "" ||
            varName.length > MAX_CHAR_VARNAME ||
            !regex.test(varName)
          ) {
            createWindowModal({
              textTitle: "WARNING",
              textBody: [
                makeElement("div", {
                  style: { fontSize: "0.7rem" },
                  innerHTML: textContent,
                }),
              ],
              ...THEMES_MODAL_WINDOW.warning,
              options: {
                auto: {
                  autohide: true,
                  autoremove: true,
                  autoshow: true,
                  timewait: 1000,
                },
                close: { showClose: false },
                overlay: { overlay_enabled: true },
                parent: widget.codeElement,
              },
            });

            return false;
          }
          return true;
        }

        node.addWidget(
          "button",
          "Add Input variable",
          "add_input_variable",
          async () => {
            // Input name variable and check
            const nameInput = node?.inputs?.length
              ? `var${node.inputs.length + 1}`
              : "var1";

            let varName = await comfyuiDesktopPrompt(
              "Variable",
              "Enter input variable name:",
              nameInput
            );

            varName = varName.trim();
            if (
              !makeValidVariable(
                varName,
                `<h3 style="margin: 0;">Variable for <span style="color: limegreen">Input</span> name is incorrect!</h3><ul style="text-align:left;padding: 2px;margin-left: 5%;"><li>starts with a number</li><li>has spaces or tabs</li><li>is empty</li><li>variable name is greater ${MAX_CHAR_VARNAME}</li></ul>`
              )
            )
              return;

            // Type variable and check
            let type = await comfyuiDesktopPrompt(
              "Type",
              "Enter type data output (default: *):",
              "*"
            );

            type = type.trim();
            if (
              !makeValidVariable(
                type,
                `<h3 style="margin: 0;">Type value is incorrect!</h3><ul style="text-align:left;padding: 2px;"><li>has spaces or tabs</li><li>is empty</li><li>type value length is greater ${MAX_CHAR_VARNAME}</li></ul>`,
                /^[*a-z_][a-z0-9_]*$/i
              )
            )
              return;

            const currentWidth = node.size[0];
            node.addInput(varName, type);
            node.setSize([currentWidth, node.size[1]]);
            saveValue();
          }
        );

        node.addWidget(
          "button",
          "Add Output variable",
          "add_output_variable",
          async () => {
            const currentWidth = node.size[0];

            // Output name variable
            const nameOutput = node?.outputs?.length
              ? `result${node.outputs.length + 1}`
              : "result1";

            let varName = await comfyuiDesktopPrompt(
              "Variable",
              "Enter output variable name:",
              nameOutput
            );

            // Check output variable name
            varName = varName.trim();
            if (
              !makeValidVariable(
                varName,
                `<h3 style="margin: 0;">Variable for <span style="color: pink">Output</span> name is incorrect!</h3><ul style="text-align:left;padding: 2px;margin-left: 5%;"><li>starts with a number</li><li>has spaces or tabs</li><li>is empty</li><li>variable name is greater ${MAX_CHAR_VARNAME}</li></ul>`
              )
            )
              return;

            // Type variable and check
            let type = await comfyuiDesktopPrompt(
              "Type",
              "Enter type data output (default: *):",
              "*"
            );

            type = type.trim();
            if (
              !makeValidVariable(
                type,
                `<h3 style="margin: 0;">Type value is incorrect!</h3><ul style="text-align:left;padding: 2px;"><li>has spaces or tabs</li><li>is empty</li><li>type value length is greater ${MAX_CHAR_VARNAME}</li></ul>`,
                /^[*a-z_][a-z0-9_]*$/i
              )
            )
              return;

            node.addOutput(varName, type);
            node.setSize([currentWidth, node.size[1]]);
            saveValue();
          }
        );

        node.addWidget("button", "Clear", "clear_code", () => {
          widget.editor.setValue("");
          saveValue();
        });

        node.onRemoved = function () {
          for (const w of node?.widgets) {
            if (w?.codeElement) w.codeElement.remove();
          }
        };

        node.addCustomWidget(widget);

        return widget;
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
        if (!this?.inputs?.length) {
          ["var1", "var2", "var3"].forEach((inputName) => {
            const currentWidth = this.size[0];
            this.addInput(inputName, "*");
            this.setSize([currentWidth, this.size[1]]);
          });
        }

        const widgetEditor = findWidget(this, "pycode", "type");
        // JS run
        api.addEventListener("alekpet_js_result", async ({ detail }) => {
          const { vars, unique_id } = detail;

          if ((vars && !Object.keys(vars).length) || +unique_id !== this.id) {
            return;
          }

          await new Promise((res) => {
            const edit_vars = JSON.parse(vars);
            let code_run = "";
            for (let [k, v] of Object.entries(edit_vars)) {
              // Check type
              if (v instanceof String || typeof v === "string") {
                v = `"${v}"`;
              } else if (v instanceof Object || typeof v === "object") {
                v = JSON.stringify(v);
              }
              code_run += `let ${k} = ${v};\n`;
            }

            code_run += `${widgetEditor.editor.getValue()}\nreturn [${Object.keys(
              edit_vars
            )},]\n`;
            let result_run_code = null;
            try {
              result_run_code = eval(`(function(){${code_run}}())`);
            } catch (e) {
              result_run_code = `Error in javascript code: ${e}`;
              console.error(`<${this.name}> ${result_run_code}`);
              createWindowModal({
                textTitle: "Error in javascript code",
                textBody: [
                  makeElement("div", {
                    style: { fontSize: "0.7rem" },
                    textContent: e,
                  }),
                ],
                ...THEMES_MODAL_WINDOW.error,
                options: {
                  auto: {
                    autohide: true,
                    autoremove: true,
                    autoshow: true,
                    timewait: 1000,
                  },
                  close: { showClose: false },
                  overlay: { overlay_enabled: true },
                  parent: widgetEditor.codeElement,
                },
              });
              res(Object.keys(edit_vars).map((v) => e.message));
            }
            res(result_run_code);
          }).then((result_code) => {
            api
              .fetchApi("/alekpet/check_js_complete", {
                method: "POST",
                body: JSON.stringify({
                  unique_id: this.id.toString(),
                  result_code,
                }),
              })
              .then((res) => res.json())
              .then((res) =>
                res?.status === "Ok"
                  ? console.log(
                      `%cJS complete ok: ${this.name}: ${res.status}`,
                      "color: green; font-weight: 600;"
                    )
                  : console.error(`Error JS complete: ${res.status}`)
              )
              .catch((err) => console.error(`Error JS complete: ${err}`));
          });
        });

        this.setSize([530, this.size[1]]);

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
          const not_showing = ["language", "pycode"];
          for (let i = 0; i < this.inputs.length; i++) {
            const { name, type } = this.inputs[i];
            if (not_showing.includes(name)) continue;
            console.log();
            const colorType = LGraphCanvas.link_type_colors[type.toUpperCase()];
            const nameSize = ctx.measureText(name);

            ctx.fillStyle = !colorType || colorType === "" ? "#AAA" : colorType;
            ctx.font = "12px Arial, sans-serif";
            ctx.textAlign = "left";
            ctx.fillText(
              `[${type === "*" ? "any" : type.toLowerCase()}]`,
              nameSize.width + 25,
              i * 20 + 19 - not_showing.length * 20
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
            "pycode",
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

          const editor = this.widgets[widget_code_id]?.editor;

          if (editor) {
            editor.setTheme(
              `ace/theme/${this.widgets_values[widget_theme_id]}`
            );
            editor.session.setMode(
              `ace/mode/${this.widgets_values[widget_language_id]}`
            );
            editor.setValue(this.widgets_values[widget_code_id]);
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

            if (["language", "theme_highlight"].includes(input.name)) continue;

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
