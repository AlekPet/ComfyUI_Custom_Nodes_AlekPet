import { app } from "../../../../scripts/app.js";
import { api } from "../../../../scripts/api.js";
import {
  createWindowModal,
  makeElement,
  findWidget,
  THEMES_MODAL_WINDOW,
  comfyuiDesktopConfirm,
  comfyuiDesktopPrompt,
} from "../../utils.js";

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

class IdeNodeWidget {
  #editor;
  #codeElement;
  #codeElementWrapper;
  #codeLoad;
  #themeList;
  #widgetLang;

  constructor(node, inputData) {
    this.node = node;
    this.#createEditor(inputData);
    this.#createThemeList();
    this.#createCodeLoader();
    this.#createControls();
    this.#createWidget();
  }

  getEditor() {
    return this.#editor;
  }

  getCodeElementWrapper() {
    return this.#codeElementWrapper;
  }

  getCodeElement() {
    return this.#codeElement;
  }

  getCodeLoad() {
    return this.#codeLoad;
  }
  getThemeList() {
    return this.#themeList;
  }
  getWidgetLang() {
    return this.#widgetLang;
  }

  #createEditor(inputData) {
    // Wrapper and codeElement
    this.#codeElementWrapper = makeElement("div", {
      style: { height: "100%", margin: "-10px 0 10px 0" },
    });

    this.#codeElement = makeElement("pre", {
      innerHTML:
        inputData[1]?.default ||
        `def my(a, b=1):
  return a * b<br>

result = str(my(23, 9))`,
      style: { height: "100%" },
    });

    this.#codeElementWrapper.append(this.#codeElement);

    // Editor
    this.#editor = ace.edit(this.#codeElement);
    this.#editor.setTheme("ace/theme/monokai");
    this.#editor.session.setMode("ace/mode/python");
  }

  #createThemeList() {
    // Theme list
    this.#themeList = this.node.addWidget(
      "combo",
      "theme_highlight",
      "monokai",
      (v) => {
        this.getEditor().setTheme(`ace/theme/${this.#themeList.value}`);
      },
      {
        values: LIST_THEMES,
        serialize: false,
      }
    );

    // Languages list
    this.#widgetLang = findWidget(this.node, "language", "name");
    this.#widgetLang.callback = async (v) => {
      this.getEditor().setTheme(`ace/theme/${this.#themeList.value}`);

      if (await comfyuiDesktopConfirm("Clear code?"))
        this.getEditor().setValue("");

      if (await comfyuiDesktopConfirm("Paste template?")) {
        let defaultCode = null;
        if (v === "javascript") {
          defaultCode = DEFAULT_TEMPLATES.js;
        } else if (v === "python") {
          defaultCode = DEFAULT_TEMPLATES.py;
        }

        if (defaultCode) {
          this.getEditor().setValue(defaultCode);
          this.getEditor().clearSelection();
        }
      }

      this.getEditor().session.setMode(`ace/mode/${v}`);

      // Load list codes by language
      const { codes } = await loadListCodes(v);
      this.getCodeLoad().options.values = [defaultComboValue].concat(...codes);
      this.getCodeLoad().value = defaultComboValue;
      this.node.setDirtyCanvas(true, true);
    };
  }

  #createCodeLoader() {
    // Load code
    this.#codeLoad = this.node.addWidget(
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
              //  this.#codeLoad.value = defaultComboValue;
              return;
            }

            // Load code
            fetch(
              new URL(
                `./codes/${this.getWidgetLang().value}/${codefile}`,
                import.meta.url
              ).toString()
            )
              .then((res) => res.json())
              .then((res) => {
                const { inputs, outputs, code, language } = res;

                let lang = language ?? "python";

                // Set code language
                this.getWidgetLang().value = lang;
                this.getEditor().session.setMode(`ace/mode/${lang}`);

                const currentWidth = this.node.size[0];

                // Remove input
                const inputsSet = new Set([
                  "language",
                  "theme_highlight",
                  "pycode",
                  ...inputs.map((i) => i.name),
                ]);

                for (let i = this.node.inputs.length - 1; i >= 0; i--) {
                  const input = this.node.inputs[i];

                  if (!inputsSet.has(input.name)) {
                    this.node.removeInput(i);
                  }
                }

                // Remove output
                const outputSet = new Set([
                  "result",
                  ...outputs.map((o) => o.name),
                ]);

                for (let i = this.node.outputs.length - 1; i >= 0; i--) {
                  const output = this.node.outputs[i];

                  if (!outputSet.has(output.name)) {
                    this.node.removeOutput(i);
                  }
                }

                inputs.forEach((input) => {
                  const isNotInArray = !this.node.inputs.some(
                    (i) => i.name === input.name.trim()
                  );
                  if (isNotInArray)
                    this.node.addInput(input.name.trim(), input.type);
                });

                outputs.forEach((output) => {
                  const isNotInArray = !this.node.outputs.some(
                    (o) => o.name === output.name.trim()
                  );
                  if (isNotInArray)
                    this.node.addOutput(output.name.trim(), output.type);
                });

                // Set code
                this.getEditor().setValue(code);
                this.getEditor().clearSelection();

                this.node.setSize([currentWidth, this.node.size[1]]);
                this.node.setDirtyCanvas(true, true);
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
                    parent: this.getCodeElement(),
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
  }

  #createControls() {
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
        const varsCount = this.node?.inputs.filter((i) =>
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
            this.node?.inputs,
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
            this.node?.inputs,
            `<h3 style="margin: 0;">Type value is incorrect!</h3><ul style="text-align:left;padding: 2px;"><li>has spaces or tabs</li><li>is empty</li><li>type value length is greater ${MAX_CHAR_VARNAME}</li></ul>`,
            /^[*a-z_][a-z0-9_]*$/i
          )
        )
          return;

        const currentWidth = this.node.size[0];
        const input = this.node.addInput(varName, type);

        // let isWidget = await comfyuiDesktopPrompt(
        //   "Widget",
        //   "Convert to Widget:",
        //   true
        // );

        // if (isWidget) {
        //   const widget = this.node.addWidget(
        //     "number",
        //     input.name,
        //     1.0,
        //     (v) => {
        //       widget.value = v;
        //     },
        //     {
        //       min: 0,
        //       max: 10,
        //       step: 0.1,
        //     }
        //   );

        //   input.widget = widget;
        //   input.type = type;
        //   input.hidden = true;
        // }

        this.node.setSize([currentWidth, this.node.size[1]]);
        app.graph.setDirtyCanvas(true, true);
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
        const currentWidth = this.node.size[0];

        // Output name variable
        const resultCount = this.node?.outputs.filter((i) =>
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
            this.node?.outputs,
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
            this.node?.outputs,
            `<h3 style="margin: 0;">Type value is incorrect!</h3><ul style="text-align:left;padding: 2px;"><li>has spaces or tabs</li><li>is empty</li><li>type value length is greater ${MAX_CHAR_VARNAME}</li></ul>`,
            /^[*a-z_][a-z0-9_]*$/i
          )
        )
          return;

        this.node.addOutput(varName, type);
        this.node.setSize([currentWidth, node.size[1]]);
        app.graph.setDirtyCanvas(true, true);
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
          this.#codeLoad.value === defaultComboValue ? "" : this.#codeLoad.value
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
                inputs: this.node.inputs
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
                outputs: this.node.outputs.map((o) => ({
                  name: o.name,
                  type: o.type,
                })),
                language: this.getWidgetLang().value,
                code: this.getEditor().getValue(),
              }),
            })
            .then((res) => res.json())
            .then((data) => {
              const { codes, message, status } = data;

              if (status !== "Ok") {
                throw new Error(message);
              }

              this.#codeLoad.options.values = [defaultComboValue].concat(codes);
              if (this.#codeLoad.options.values.indexOf(filename) !== -1) {
                this.#codeLoad.value = filename;
                this.node.setDirtyCanvas(true, true);
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
        const old_filename = this.#codeLoad.value.trim();

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
          const language = this.getWidgetLang().value;

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

              this.#codeLoad.options.values = [defaultComboValue].concat(codes);
              if (this.#codeLoad.options.values.indexOf(filename) !== -1) {
                this.#codeLoad.value = filename;
                this.node.setDirtyCanvas(true, true);
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
        const filename = this.#codeLoad.value.trim();
        if (!filename || filename === defaultComboValue) {
          app.extensionManager.toast.add({
            severity: "warn",
            summary: "Warning",
            detail: `Invalid element selected: '${filename}'!`,
            life: 3000,
          });
          return;
        }

        const language = this.getWidgetLang().value;
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

            const itemSelected =
              this.#codeLoad.options.values.indexOf(filename);
            if (itemSelected !== -1) {
              this.#codeLoad.options.values.splice(itemSelected, 1);
              this.#codeLoad.value = defaultComboValue;
              this.node.setDirtyCanvas(true, true);
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
              this.getEditor().setValue("");
              saveValue();
            }
          });
      },
    });

    this.ide_node_controls_buttons = [
      buttonAddInput,
      buttonAddOutput,
      buttonSave,
      ButtonRename,
      ButtonRemove,
      ButtonClear,
    ];

    const IdeNodeControls = makeElement("div", {
      class: ["ide_node_controls"],
      children: this.ide_node_controls_buttons,
    });

    this.widgetIdeNodeControls = this.node.addDOMWidget(
      "widget_ide_node_controls",
      "ide_node_controls",
      IdeNodeControls,
      {
        serialize: false,
      }
    );
    this.widgetIdeNodeControls.computeSize = () => [this.node.size[0], 60];
  }

  #createWidget() {
    // Add DOMWidget
    const that = this;
    this.widget = this.node.addDOMWidget(
      "pycode",
      "widget_pycode",
      this.getCodeElementWrapper(),
      {
        getValue: () => {
          return this.widget.editor.getValue();
        },
      }
    );

    this.widget.editor = this.getEditor();
    this.widget.codeElement = this.getCodeElement();

    this.widget.editor.getSession().on("change", (e) => {
      this.widget.value = this.widget.editor.getValue();
      saveValue();
    });
  }

  async loadListCodes() {
    const { codes } = await loadListCodes(this.getWidgetLang().value);
    this.getCodeLoad().options.values = [defaultComboValue].concat(codes);
  }

  async jsRunCode(vars, unique_id) {
    this.node._jsProcessing = true;

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

      code_run += `${this.getEditor().getValue()}\nreturn [${Object.keys(
        edit_vars
      )},]\n`;
      let result_run_code = null;
      try {
        result_run_code = eval(`(function(){${code_run}}())`);
      } catch (e) {
        result_run_code = `Error in javascript code: ${e}`;
        console.error(`<${this.node.name}> ${result_run_code}`);
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
            parent: this.getCodeElement(),
          },
        });
        this.node._jsProcessing = false;
        res(Object.keys(edit_vars).map((v) => e.message));
      }
      res(result_run_code);
    }).then((result_code) => {
      api
        .fetchApi("/alekpet/ide_node_check_js_complete", {
          method: "POST",
          body: JSON.stringify({
            unique_id: this.node.id.toString(),
            result_code,
          }),
        })
        .then((res) => res.json())
        .then((res) => {
          res?.status === "Ok"
            ? console.log(
                `%cJS complete ok: ${this.node.name}: ${res.status}`,
                "color: green; font-weight: 600;"
              )
            : console.error(`Error JS complete: ${res.status}`);
          this.node._jsProcessing = false;
        })
        .catch((err) => {
          this.node._jsProcessing = false;
          console.error(`Error JS complete: ${err}`);
        });
    });
  }
}

export { IdeNodeWidget, loadListCodes, saveValue, defaultComboValue };
