import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import "./lib/idenode/ace-builds/src-min-noconflict/ace.js";
import {
  createWindowModal,
  makeElement,
  THEMES_MODAL_WINDOW,
} from "./utils.js";

ace.config.set(
  "basePath",
  new URL(
    "./lib/idenode/ace-builds/src-min-noconflict/",
    import.meta.url
  ).toString()
);

// Constants
const MAX_CHAR_VARNAME = 20;
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
  result = runCode();`,
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
    height: "90%",
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
    size: [500, 350],
    draw(ctx, node, widget_width, y, widget_height) {
      Object.assign(
        this.codeElement.style,
        getPostition(ctx, widget_width, y, node.size[1])
      );
    },
    computeSize(...args) {
      return [500, 350];
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
          "themes",
          "monokai",
          (v) => {
            widget.editor.setTheme(`ace/theme/${themeList.value}`);
          },
          {
            values: LIST_THEMES,
            serialize: false,
          }
        );

        const widgetLang_id = node?.widgets.findIndex(
          (w) => w.name == "language"
        );

        if (widgetLang_id !== -1) {
          node.widgets[widgetLang_id].callback = (v) => {
            widget.editor.setTheme(`ace/theme/${themeList.value}`);
            confirm("Clear code?") && widget.editor.setValue("");
            if (confirm("Paste template?")) {
              let defaultCode = null;
              if (v === "javascript") {
                defaultCode = DEFAULT_TEMPLATES.js;
              } else if (v === "python") {
                defaultCode = DEFAULT_TEMPLATES.py;
              }

              defaultCode && widget.editor.setValue(defaultCode);
            }

            widget.editor.session.setMode(`ace/mode/${v}`);
          };
        }

        node.addWidget("button", "Add Variable", "add_variable", () => {
          const varName = prompt(
            "Enter variable name:",
            node?.inputs.length ? `var${node.inputs.length + 1}` : "var1"
          );

          if (
            !varName ||
            varName.trim() === "" ||
            varName.length > MAX_CHAR_VARNAME ||
            !/^[a-z_][a-z0-9_]*$/i.test(varName)
          ) {
            const windowError = createWindowModal({
              textTitle: "WARNING",
              textBody: [
                makeElement("div", {
                  innerHTML: `<h3>Variable name is incorrect!</h3><ul style="text-align:left;padding: 2px;"><li>starts with a number</li><li>has spaces or tabs</li><li>is empty</li><li>variable name is greater ${MAX_CHAR_VARNAME}</li></ul>`,
                }),
              ],
              ...THEMES_MODAL_WINDOW.warning,
              options: {
                auto: {
                  autohide: true,
                  autoremove: true,
                  autoshow: true,
                  timewait: 2000,
                },
                parent: widget.codeElement,
              },
            });

            return;
          }
          const currentWidth = node.size[0];
          node.addInput(varName, "*");
          node.setSize([currentWidth, node.size[1]]);
        });

        node.addWidget("button", "Clear", "clear_code", () => {
          widget.editor.setValue("");
        });

        node.addCustomWidget(widget);

        // JS run
        api.addEventListener("alekpet_js_result", async ({ detail }) => {
          const { vars, unique_id } = detail;
          if ((vars && !Object.keys(vars).length) || +unique_id !== node.id) {
            return;
          }

          await new Promise((res) => {
            const edit_vars = JSON.parse(vars);
            let code_run = `\nlet result = null;\n`;
            for (let [k, v] of Object.entries(edit_vars)) {
              // Check type
              if (v instanceof String || typeof v === "string") {
                v = `"${v}"`;
              } else if (v instanceof Object || typeof v === "object") {
                v = JSON.stringify(v);
              }
              code_run += `let ${k} = ${v};\n`;
            }

            code_run += `${widget.editor.getValue()}\nreturn result\n`;
            let result_run_code = null;
            try {
              result_run_code = eval(`(function(){${code_run}}())`);
            } catch (e) {
              result_run_code = `Error in javascript code: ${e}`;
              console.error(`<${node.name}> ${result_run_code}`);
            }

            res(result_run_code);
          }).then((result_code) => {
            api
              .fetchApi("/alekpet/check_js_complete", {
                method: "POST",
                body: JSON.stringify({
                  unique_id: node.id.toString(),
                  result_code: JSON.stringify(result_code),
                }),
              })
              .then((res) => res.json())
              .then((res) =>
                res?.status === "Ok"
                  ? console.log(
                      `%cJS complete ok: ${node.name}: ${res.status}`,
                      "color: green; font-weight: 600;"
                    )
                  : console.error(`Error JS complete: ${res.status}`)
              )
              .catch((err) => console.error(`Error JS complete: ${err}`));
          });
        });

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

        let IDENode = app.graph._nodes.filter((wi) => wi.type == nodeData.name),
          nodeName = `${nodeData.name}_${IDENode.length}`;

        console.log(`Create ${nodeData.name}: ${nodeName}`);
        this.name = nodeName;

        this.onRemoved = function () {
          for (const w of this?.widgets) {
            if (w?.codeElement) w.codeElement.remove();
          }
        };

        this.setSize([500, 350]);

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
            (w) => w.name == "themes"
          );
          const widget_language_id = this?.widgets.findIndex(
            (w) => w.name == "language"
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
          for (const input_idx in this.inputs) {
            const input = this.inputs[input_idx];

            options.splice(past_index + 1, 0, {
              content: `Remove Input ${input.name}`,
              callback: (e) => {
                const currentWidth = this.size[0];
                if (input?.link) {
                  app.graph.removeLink(input.link);
                }
                this.removeInput(input);
                this.setSize([currentWidth, this.size[1]]);
              },
            });
          }
        }
      };
      // end - ExtraMenuOptions
    }
  },
});
