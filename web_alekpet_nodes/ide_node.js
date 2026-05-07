import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import "./lib/idenode/ace-builds/src-min-noconflict/ace.js";
import { addStylesheet } from "../../scripts/utils.js";
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

// Default value select load code
const defaultComboValue = "-- Select code file --";

// RegExp
const symbolsIncorrectFileName = /[/\\?%*:|"<>]/g;

// Save data to workflow forced!
function saveValue() {
  app?.extensionManager?.workflow?.activeWorkflow?.changeTracker?.checkState();
}

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

// Load list codes
async function loadListCodes(language) {
  try {
    const response = await api.fetchApi(
      `/alekpet/ide_node_load_codes/${language}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return await response.json();
  } catch (e) {
    console.error(e);
    return { codes: [], language };
  }
}

// Checks Vars
function makeValidVariable(
  varName,
  iotype,
  textContent,
  regex = /^[a-z_][a-z0-9_]*$/i
) {
  if (
    !varName ||
    varName.trim() === "" ||
    varName.length > MAX_CHAR_VARNAME ||
    !regex.test(varName) ||
    iotype.some((i) => i.name === varName)
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

// Register extensions
app.registerExtension({
  name: "alekpet.IDENode",
  init(app) {
    addStylesheet("css/idenode/ide_node_styles.css", import.meta.url);
  },
  getCustomWidgets(app) {
    return {
      PYCODE: async (node, inputName, inputData, app) => {
        // Wrapper and codeElement
        const codeElementWrapper = makeElement("div", {
          style: { height: "100%", margin: "-10px 0 10px 0" },
        });

        const codeElement = makeElement("pre", {
          innerHTML:
            inputData[1]?.default ||
            `def my(a, b=1):
  return a * b<br>
    
result = str(my(23, 9))`,
          style: { height: "100%" },
        });

        codeElementWrapper.appendChild(codeElement);

        // Editor
        const editor = ace.edit(codeElement);
        editor.setTheme("ace/theme/monokai");
        editor.session.setMode("ace/mode/python");

        // Theme list
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

        // Languages list
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

            // Load list codes by language
            const { codes } = await loadListCodes(v);
            codeLoad.options.values = [defaultComboValue].concat(...codes);
            codeLoad.value = defaultComboValue;
            node.setDirtyCanvas(true, true);
          };
        }

        // Load code
        const codeLoad = node.addWidget(
          "COMBO",
          "Load code",
          defaultComboValue,
          async (codefile) => {
            if (codefile === defaultComboValue) return;

            // Confirm load code?
            app.extensionManager.dialog
              .confirm({
                title: "Confirm load code",
                message: "Are you sure you want load code?",
                type: "default",
              })
              .then(async (result) => {
                if (!result) {
                  // codeLoad.value = defaultComboValue;
                  return;
                }

                // Load code
                fetch(
                  new URL(
                    `./lib/idenode/codes/${node.widgets[widgetLang_id].value}/${codefile}`,
                    import.meta.url
                  ).toString()
                )
                  .then((res) => res.json())
                  .then((res) => {
                    const { inputs, outputs, code, language } = res;

                    let lang = language ?? "python";

                    // Set code language
                    node.widgets[widgetLang_id].value = lang;
                    widget.editor.session.setMode(`ace/mode/${lang}`);

                    const currentWidth = node.size[0];

                    // Remove input
                    const inputsSet = new Set([
                      "language",
                      "theme_highlight",
                      "pycode",
                      ...inputs.map((i) => i.name),
                    ]);

                    for (let i = node.inputs.length - 1; i >= 0; i--) {
                      const input = node.inputs[i];

                      if (!inputsSet.has(input.name)) {
                        node.removeInput(i);
                      }
                    }

                    // Remove output
                    const outputSet = new Set([
                      "result",
                      ...outputs.map((o) => o.name),
                    ]);

                    for (let i = node.outputs.length - 1; i >= 0; i--) {
                      const output = node.outputs[i];

                      if (!outputSet.has(output.name)) {
                        node.removeOutput(i);
                      }
                    }

                    inputs.forEach((input) => {
                      const isNotInArray = !node.inputs.some(
                        (i) => i.name === input.name.trim()
                      );
                      if (isNotInArray)
                        node.addInput(input.name.trim(), input.type);
                    });

                    outputs.forEach((output) => {
                      const isNotInArray = !node.outputs.some(
                        (o) => o.name === output.name.trim()
                      );
                      if (isNotInArray)
                        node.addOutput(output.name.trim(), output.type);
                    });

                    // Set code
                    widget.editor.setValue(code);
                    widget.editor.clearSelection();

                    node.setSize([currentWidth, node.size[1]]);
                    node.setDirtyCanvas(true, true);
                    saveValue();
                  })
                  .catch((e) => {
                    createWindowModal({
                      textTitle: "ERROR",
                      textBody: [
                        makeElement("div", {
                          style: { fontSize: "0.7rem" },
                          innerHTML: e,
                        }),
                      ],
                      ...THEMES_MODAL_WINDOW.error,
                      options: {
                        auto: {
                          autohide: true,
                          autoremove: true,
                          autoshow: true,
                          timewait: 1500,
                        },
                        close: { showClose: false },
                        overlay: { overlay_enabled: true },
                        parent: widget.codeElement,
                      },
                    });
                    console.error(e);
                  });
              });
          },
          {
            values: [defaultComboValue],
            default: defaultComboValue,
          }
        );

        // Remove node
        node.onRemoved = function () {
          for (const w of node?.widgets) {
            if (w?.codeElement) w.codeElement.remove();
          }
        };

        // Add input vars
        const buttonAddInput = makeElement("button", {
          class: [
            "ide_node_controls_buttons",
            "button_ide_node_addinput",
            "ide_node_controls_first_row",
          ],
          textContent: "✚ INPUT VARIABLE",
          title: "Add input variable",
          onclick: async () => {
            // Input name variable and check
            const varsCount = node?.inputs.filter((i) =>
              /^var[0-9]+$/.test(i?.name)
            );
            const nameInput = varsCount?.length
              ? `var${varsCount.length + 1}`
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
                node?.inputs,
                `<h3 style="margin: 0;">Variable for <span style="color: limegreen">Input</span> name is incorrect!</h3><ul style="text-align:left;padding: 2px;margin-left: 5%;"><li>variable <span style="color:orange;font-weight: 600;">${varName}</span> already present in the inputs</li><li>starts with a number</li><li>has spaces or tabs</li><li>is empty</li><li>variable name is greater ${MAX_CHAR_VARNAME}</li></ul>`
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
                node?.inputs,
                `<h3 style="margin: 0;">Type value is incorrect!</h3><ul style="text-align:left;padding: 2px;"><li>has spaces or tabs</li><li>is empty</li><li>type value length is greater ${MAX_CHAR_VARNAME}</li></ul>`,
                /^[*a-z_][a-z0-9_]*$/i
              )
            )
              return;

            const currentWidth = node.size[0];
            node.addInput(varName, type);
            node.setSize([currentWidth, node.size[1]]);
            saveValue();
          },
        });

        // Add output vars
        const buttonAddOutput = makeElement("button", {
          class: [
            "ide_node_controls_buttons",
            "button_ide_node_addoutput",
            "ide_node_controls_first_row",
          ],
          innerHTML: "OUTPUT VARIABLE ✚",
          title: "Add output variable",
          onclick: async () => {
            const currentWidth = node.size[0];

            // Output name variable
            const resultCount = node?.outputs.filter((i) =>
              /^result[0-9]+$/.test(i?.name)
            );
            const nameOutput = resultCount?.length
              ? `result${resultCount.length + 1}`
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
                node?.outputs,
                `<h3 style="margin: 0;">Variable for <span style="color: pink">Output</span> name is incorrect!</h3><ul style="text-align:left;padding: 2px;margin-left: 5%;"><li>variable <span style="color:orange;font-weight: 600;">${varName}</span> already present in the outputs</li><li>starts with a number</li><li>has spaces or tabs</li><li>is empty</li><li>variable name is greater ${MAX_CHAR_VARNAME}</li></ul>`
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
                node?.outputs,
                `<h3 style="margin: 0;">Type value is incorrect!</h3><ul style="text-align:left;padding: 2px;"><li>has spaces or tabs</li><li>is empty</li><li>type value length is greater ${MAX_CHAR_VARNAME}</li></ul>`,
                /^[*a-z_][a-z0-9_]*$/i
              )
            )
              return;

            node.addOutput(varName, type);
            node.setSize([currentWidth, node.size[1]]);
            saveValue();
          },
        });

        // Save file code
        const buttonSave = makeElement("button", {
          class: [
            "ide_node_controls_buttons",
            "button_ide_node_save",
            "ide_node_controls_second_row",
          ],
          textContent: "💾 save",
          title: "Save code",
          onclick: async () => {
            comfyuiDesktopPrompt(
              "Code filename",
              "Enter filename for code (if exists will be rewrited)",
              codeLoad.value === defaultComboValue ? "" : codeLoad.value
            ).then(async (save_filename) => {
              if (
                !save_filename ||
                !save_filename.trim() ||
                save_filename === defaultComboValue
              ) {
                await app.extensionManager.toast.add({
                  severity: "warn",
                  summary: "Warning",
                  detail: `Filename is empty or equal '${defaultComboValue}'!`,
                  life: 3000,
                });
                return;
              }

              const filename = save_filename
                .trim()
                .replace(symbolsIncorrectFileName, "_");

              api
                .fetchApi("/alekpet/ide_node_save_code", {
                  method: "POST",
                  body: JSON.stringify({
                    filename,
                    inputs: node.inputs
                      .filter(
                        (i) =>
                          !["language", "pycode", "theme_highlight"].includes(
                            i.name
                          )
                      )
                      .map((i) => ({
                        name: i.name,
                        type: i.type,
                      })),
                    outputs: node.outputs.map((o) => ({
                      name: o.name,
                      type: o.type,
                    })),
                    language: node.widgets[widgetLang_id].value,
                    code: widget.editor.getValue(),
                  }),
                })
                .then((res) => res.json())
                .then((data) => {
                  const { codes, message, status } = data;

                  if (status !== "Ok") {
                    throw new Error(message);
                  }

                  codeLoad.options.values = [defaultComboValue].concat(codes);
                  if (codeLoad.options.values.indexOf(filename) !== -1) {
                    codeLoad.value = filename;
                    node.setDirtyCanvas(true, true);
                  }

                  app.extensionManager.toast.add({
                    severity: "success",
                    summary: "Success",
                    detail: message,
                    life: 3000,
                  });
                })
                .catch((e) => {
                  app.extensionManager.toast.add({
                    severity: "error",
                    summary: "Error",
                    detail: e,
                    life: 3000,
                  });
                  console.error(e);
                });
            });
          },
        });

        // Rename file code
        const ButtonRename = makeElement("button", {
          class: [
            "ide_node_controls_buttons",
            "button_ide_node_rename",
            "ide_node_controls_second_row",
          ],
          textContent: "✏️ rename",
          title: "Rename file code",
          onclick: (e) => {
            const old_filename = codeLoad.value.trim();

            if (!old_filename || old_filename === defaultComboValue) {
              app.extensionManager.toast.add({
                severity: "warn",
                summary: "Warning",
                detail: `Invalid element selected: '${old_filename}'!`,
                life: 3000,
              });
              return;
            }

            comfyuiDesktopPrompt(
              "Confirm file rename",
              "Enter a filename to rename",
              old_filename === defaultComboValue ? "" : old_filename
            ).then(async (new_filename) => {
              if (
                !new_filename ||
                !new_filename.trim() ||
                new_filename === old_filename ||
                new_filename.trim() === defaultComboValue
              ) {
                await app.extensionManager.toast.add({
                  severity: "warn",
                  summary: "Warning",
                  detail: `Filename is empty or equal '${defaultComboValue}'!`,
                  life: 3000,
                });
                return;
              }

              const filename = new_filename
                .trim()
                .replace(symbolsIncorrectFileName, "_");
              const language = node.widgets[widgetLang_id].value;

              api
                .fetchApi("/alekpet/ide_node_rename_code", {
                  method: "POST",
                  body: JSON.stringify({
                    old_filename,
                    filename,
                    language,
                  }),
                })
                .then((res) => res.json())
                .then((data) => {
                  const { status, message, codes } = data;

                  if (status !== "Ok") throw new Error(message);

                  codeLoad.options.values = [defaultComboValue].concat(codes);
                  if (codeLoad.options.values.indexOf(filename) !== -1) {
                    codeLoad.value = filename;
                    node.setDirtyCanvas(true, true);
                  }

                  app.extensionManager.toast.add({
                    severity: "success",
                    summary: "Success",
                    detail: message,
                    life: 3000,
                  });
                })
                .catch((e) => {
                  app.extensionManager.toast.add({
                    severity: "error",
                    summary: "Error",
                    detail: e,
                    life: 3000,
                  });
                  console.error(e);
                });
            });
          },
        });

        // Remove file code
        const ButtonRemove = makeElement("button", {
          class: [
            "ide_node_controls_buttons",
            "button_ide_node_remove",
            "ide_node_controls_second_row",
          ],
          textContent: "🗑️ remove",
          title: "Remove file code",
          onclick: async (e) => {
            const filename = codeLoad.value.trim();
            if (!filename || filename === defaultComboValue) {
              app.extensionManager.toast.add({
                severity: "warn",
                summary: "Warning",
                detail: `Invalid element selected: '${filename}'!`,
                life: 3000,
              });
              return;
            }

            const language = node.widgets[widgetLang_id].value;
            const answerRemove = await app.extensionManager.dialog.confirm({
              title: "Confirm remove",
              message: `Are you sure you want remove filename ${filename} code?`,
              type: "default",
            });

            if (!answerRemove) {
              return;
            }

            api
              .fetchApi("/alekpet/ide_node_remove_code", {
                method: "POST",
                body: JSON.stringify({
                  filename,
                  language,
                }),
              })
              .then((res) => res.json())
              .then((data) => {
                const { status, message } = data;

                if (status !== "Ok") throw new Error(message);

                const itemSelected = codeLoad.options.values.indexOf(filename);
                if (itemSelected !== -1) {
                  codeLoad.options.values.splice(itemSelected, 1);
                  codeLoad.value = defaultComboValue;
                  node.setDirtyCanvas(true, true);
                }

                app.extensionManager.toast.add({
                  severity: "success",
                  summary: "Success",
                  detail: message,
                  life: 3000,
                });
              })
              .catch((e) => {
                app.extensionManager.toast.add({
                  severity: "error",
                  summary: "Error",
                  detail: e,
                  life: 3000,
                });
                console.error(e);
              });
          },
        });

        // Clear code
        const ButtonClear = makeElement("button", {
          class: [
            "ide_node_controls_buttons",
            "button_ide_node_clear",
            "ide_node_controls_second_row",
          ],
          textContent: "🧹 clear",
          title: "Clear code",
          onclick: async () => {
            // Confirm clear code?
            await app.extensionManager.dialog
              .confirm({
                title: "Confirm clear code",
                message: "Are you sure you want clear code?",
                type: "default",
              })
              .then((result) => {
                if (result) {
                  widget.editor.setValue("");
                  saveValue();
                }
              });
          },
        });
        const IdeNodeControls = makeElement("div", {
          class: ["ide_node_controls"],
          children: [
            buttonAddInput,
            buttonAddOutput,
            buttonSave,
            ButtonRename,
            ButtonRemove,
            ButtonClear,
          ],
        });

        const widgetIdeNodeControls = node.addDOMWidget(
          "widget_ide_node_controls",
          "ide_node_controls",
          IdeNodeControls,
          {
            serialize: false,
          }
        );
        widgetIdeNodeControls.computeSize = () => [node.size[0], 60];

        // Add DOMWidget
        const widget = node.addDOMWidget(
          "pycode",
          "widget_pycode",
          codeElementWrapper,
          {
            getValue() {
              return widget.editor.getValue();
            },
          }
        );

        widget.editor = editor;
        widget.codeElement = codeElement;

        widget.editor.getSession().on("change", function (e) {
          widget.value = widget.editor.getValue();
          saveValue();
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
        const widgetLanguage = findWidget(this, "language", "name");
        const widgetLoadCode = findWidget(this, "Load code", "name");
        const { codes } = await loadListCodes(widgetLanguage.value);
        widgetLoadCode.options.values = [defaultComboValue].concat(codes);

        const widgetEditor = findWidget(this, "widget_pycode", "type");
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

          this._jsProcessing = true;

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
              .fetchApi("/alekpet/ide_node_check_js_complete", {
                method: "POST",
                body: JSON.stringify({
                  unique_id: this.id.toString(),
                  result_code,
                }),
              })
              .then((res) => res.json())
              .then((res) => {
                res?.status === "Ok"
                  ? console.log(
                      `%cJS complete ok: ${this.name}: ${res.status}`,
                      "color: green; font-weight: 600;"
                    )
                  : console.error(`Error JS complete: ${res.status}`);
                this._jsProcessing = false;
              })
              .catch((err) => {
                this._jsProcessing = false;
                console.error(`Error JS complete: ${err}`);
              });
          });
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

          if (node?.widgets_values?.length === 6) {
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
            const lang = node?.widgets_values[widget_language_id].trim()
              ? node?.widgets_values[widget_language_id]
              : "python";
            const theme = node?.widgets_values[widget_theme_id].trim()
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
