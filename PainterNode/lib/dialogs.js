import { api } from "../../../../scripts/api.js";
import { fabric } from "./fabric.js";
import { formatBytes } from "./helpers.js";
import { ComfyDialog } from "../../../../../scripts/ui.js";
import {
  makeElement,
  createWindowModal,
  animateClick,
  THEMES_MODAL_WINDOW,
} from "../../utils.js";

export class PainterStorageDialog extends ComfyDialog {
  // Remove record in LocalStorage or JSON file
  async removeRecord(workflow_name, painters_data = []) {
    if (!(await comfyuiDesktopConfirm(`Delete record "${workflow_name}"?`)))
      return;
    try {
      const rawResponse = await fetch("/alekpet/remove_node_settings", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: workflow_name,
          painters_data: painters_data,
        }),
      });

      if (rawResponse.status !== 200) {
        throw new Error(
          `Error painter remove file settings: ${rawResponse.statusText}`
        );
      }

      const jsonData = await rawResponse.json();

      return {
        status: true,
        remove_info: jsonData?.workflow_info,
        message: jsonData.message,
      };
    } catch (e) {
      console.log(e);
      return { status: false, remove_info: null, message: e.message };
    }
  }

  // Create menu elements
  createMenuElements(_data) {
    const data = _data.sort((a, b) => {
      a = JSON.stringify(a.value).length;
      b = JSON.stringify(b.value).length;
      return b - a;
    });

    if (!data?.length) {
      return makeElement("div", {
        class: ["painter_storage_items_box"],
        textContent: "Records is not found!",
      });
    }

    const itemBox = makeElement("div", {
      class: ["painter_storage_items_box"],
      children: [
        makeElement("div", {
          class: ["painter_storage_grid", "painter_storage_items_header"],
          children: [
            makeElement("div", { textContent: "👓" }),
            makeElement("div", { textContent: "#" }),
            makeElement("div", { textContent: "Name workflow" }),
            makeElement("div", { textContent: "Size" }),
            makeElement("div", { textContent: "Action" }),
          ],
        }),
      ],
    });

    // Check if body item is empty, show message no records
    async function checkNoItems() {
      if (
        document.querySelector(".painter_storage_body").children.length === 1
      ) {
        const data = await this.loadingDataJSON();

        if (data) this.updateBodyData(data);
      }
    }

    // Sort workflows for size
    function sortWorkflowSize(paint_data) {
      return Object.keys(paint_data.painters_data)
        .map((w) => ({
          painter_name: w,
          painter_data: paint_data.painters_data[w],
        }))
        .sort((a, b) => {
          a = JSON.stringify(a.painter_data).length;
          b = JSON.stringify(b.painter_data).length;
          return b - a;
        });
    }

    // Create painters elements
    function createItemsPainters(workflow_name, workflow_data) {
      // Wrapper
      const itemPaintersWrapper = makeElement("div", {
        class: ["painter_storage_painters_wrapper"],
        style: { display: "none", opacity: 0, transition: "all 0.4s" },
      });

      // Header
      const itemPainterHeader = makeElement("div", {
        class: [
          "painter_storage_grid",
          "painter_storage_painters_header",
          "painter_storage_painters_grid",
        ],
        children: [
          makeElement("div", { textContent: "#" }),
          makeElement("div", { textContent: "Painter name" }),
          makeElement("div", { textContent: "Preview" }),
          makeElement("div", { textContent: "Size" }),
          makeElement("div", { textContent: "Action" }),
        ],
        parent: itemPaintersWrapper,
      });

      for (const [idx, { painter_name, painter_data }] of sortWorkflowSize(
        workflow_data
      ).entries()) {
        const itemPainter = makeElement("div", {
          class: [
            "painter_storage_grid",
            "painter_storage_painters_item",
            "painter_storage_painters_grid",
          ],
        });

        const numPainter = makeElement("div", { textContent: idx + 1 });
        const namePainter = makeElement("div", {
          class: ["painter_storage_painters_item_name"],
          textContent: painter_name,
          title: painter_name,
        });
        const previewPainter = makeElement("div", {
          class: ["painter_storage_painters_item_preview"],
        });

        // Create canvas from preview
        const canvasEl = makeElement("canvas", {
          class: ["painter_storage_painters_item_preview_canvas"],
        });
        previewPainter.append(canvasEl);

        // Fabric canvas load
        const fcanvas = new fabric.StaticCanvas(canvasEl);
        const canvasValue =
          typeof painter_data === "string"
            ? JSON.parse(painter_data)
            : painter_data;
        if (canvasValue?.settings?.currentCanvasSize) {
          const { width, height } = canvasValue.settings.currentCanvasSize;
          fcanvas.setDimensions({ width, height }, { backstoreOnly: true });
        }

        fcanvas.loadFromJSON(canvasValue.canvas_settings, () => {
          fcanvas.renderAll();
        });

        const sizePainter = makeElement("div", {
          innerHTML: formatBytes(new Blob([JSON.stringify(painter_data)]).size),
        });
        const removeButtonPainter = makeElement("button", {
          style: {
            color: "var(--error-text)",
            padding: "7px",
            fontSize: "1rem",
          },
          textContent: "Delete",
          title: "Delete painter!",
          onclick: async (e) => {
            e.stopPropagation();
            if (!confirm(`Delete painter record "${painter_name}"?`)) return;

            const result = await this.removeRecord(workflow_name, [
              painter_name,
            ]);

            if (!result.status) {
              createWindowModal({
                ...THEMES_MODAL_WINDOW.error,
                stylesBox: {
                  ...THEMES_MODAL_WINDOW.error.stylesBox,
                  lineHeight: 1.5,
                },

                textTitle: "Error",
                textBody: result.message,
                options: {
                  parent: document.body,
                  overlay: { overlay_enabled: true },
                  auto: {
                    autoshow: true,
                    autoremove: true,
                    autohide: true,
                    timewait: 500,
                  },
                  close: { showClose: false },
                },
              });
              return;
            }

            let textMessage = `<div>Painter name <span style="color: chartreuse; font-weight: 600;">"${painter_name}"</span> deleted from json file workflow <span style="color: darkseagreen; font-weight: 600;">"${workflow_name}"</span>!</div>`;

            if (
              result.remove_info.workflow_record &&
              result.remove_info.paint_record
            ) {
              textMessage = `<div>Workflow name <span style="color: chartreuse; font-weight: 600;">"${workflow_name}"</span> and record <span style="color: darkseagreen; font-weight: 600;">"${painter_name}"</span> deleted from json file!</div>`;
            }

            createWindowModal({
              ...THEMES_MODAL_WINDOW.normal,
              stylesBox: {
                ...THEMES_MODAL_WINDOW.normal.stylesBox,
                lineHeight: 1.5,
              },

              textTitle: "Information",
              textBody: textMessage,
              options: {
                parent: document.body,
                overlay: { overlay_enabled: true },
                auto: {
                  autoshow: true,
                  autoremove: true,
                  autohide: true,
                  timewait: 500,
                },
                close: { showClose: false },
              },
            });

            if (
              result.remove_info.workflow_record &&
              result.remove_info.paint_record
            ) {
              itemPainter.closest(".painter_storage_painters_wrapper").remove();
              checkNoItems.call(this);
              return;
            }

            itemPainter.remove();
          },
        });

        itemPainter.append(
          numPainter,
          namePainter,
          previewPainter,
          sizePainter,
          removeButtonPainter
        );
        itemPaintersWrapper.append(itemPainter);
      }

      return itemPaintersWrapper;
    }

    // Create workflows elements
    function createWorkflowStorage(idx, workflow_name, workflow_value) {
      const itemWorkflow = makeElement("div", {
        class: ["painter_storage_grid", "painter_storage_workflows_item"],
        title: `Show painters records workflow ${workflow_name}`,
        onclick: (e) => {
          const target = e.currentTarget;
          animateClick(target.nextElementSibling).then((res) => {
            target.children[0].textContent = res ? "▼" : "►";
            target.title = `Hide painters records workflow ${workflow_name}`;
          });
        },
      });

      const showWorkflow = makeElement("div", { textContent: "►" });
      const numEl = makeElement("div", { textContent: idx + 1 });
      const nameEl = makeElement("div", { textContent: workflow_name });
      const sizeEl = makeElement("div", {
        innerHTML: formatBytes(new Blob([JSON.stringify(workflow_value)]).size),
      });

      const removeButtonEl = makeElement("button", {
        style: { color: "var(--error-text)", padding: "7px", fontSize: "1rem" },
        textContent: "Delete",
        title: "Delete workflow!",
        onclick: async (e) => {
          e.stopPropagation();
          if (!confirm(`Delete workflow "${workflow_name}"?`)) return;

          const result = await this.removeRecord(workflow_name);

          if (!result.status) {
            createWindowModal({
              ...THEMES_MODAL_WINDOW.error,
              stylesBox: {
                ...THEMES_MODAL_WINDOW.error.stylesBox,
                lineHeight: 1.5,
              },

              textTitle: "Error",
              textBody: result.message,
              options: {
                parent: document.body,
                overlay: { overlay_enabled: true },
                auto: {
                  autoshow: true,
                  autoremove: true,
                  autohide: true,
                  timewait: 500,
                },
                close: { showClose: false },
              },
            });
            return;
          }

          createWindowModal({
            ...THEMES_MODAL_WINDOW.normal,
            stylesBox: {
              ...THEMES_MODAL_WINDOW.normal.stylesBox,
              lineHeight: 1.5,
            },

            textTitle: "Information",
            textBody: `<div>Workflow name <span style="color: chartreuse; font-weight: 600;">"${workflow_name}"</span> deleted from json files!</div>`,
            options: {
              parent: document.body,
              overlay: { overlay_enabled: true },
              auto: {
                autoshow: true,
                autoremove: true,
                autohide: true,
                timewait: 500,
              },
              close: { showClose: false },
            },
          });

          itemWorkflow.closest(".painter_storage_painters_wrapper").remove();
          checkNoItems.call(this);
        },
      });

      itemWorkflow.append(showWorkflow, numEl, nameEl, sizeEl, removeButtonEl);

      return itemWorkflow;
    }

    for (const [idx, { name, value }] of data.entries()) {
      const itemWrapper = makeElement("div", {
        class: ["painter_storage_painters_wrapper"],
        style: {
          background: `var(${
            (idx + 1) % 2 !== 0 ? "--tr-odd-bg-color" : "--tr-even-bg-color"
          })`,
        },
      });

      const itemPaint = createWorkflowStorage.call(this, idx, name, value);
      const itemWorkflows = createItemsPainters.call(this, name, value);
      itemWrapper.append(itemPaint, itemWorkflows);
      itemBox.append(itemWrapper);
    }

    return itemBox;
  }

  // Get data form JSON's files
  async loadingDataJSON() {
    try {
      const rawResponse = await api.fetchApi(
        "/alekpet/loading_all_node_settings"
      );
      if (rawResponse.status !== 200)
        throw new Error(
          `Error painter get json data settings: ${rawResponse.statusText}`
        );

      const data = await rawResponse?.json();
      if (!data?.all_settings_nodes) return {};

      return data.all_settings_nodes;
    } catch (e) {
      console.log(e);
      return {};
    }
  }

  updateBodyData(data) {
    this.body.innerHTML = "";
    this.body.append(this.createMenuElements(data));
  }

  // Get data form LocalStorage
  loadingDataLocalStorage() {
    return Object.keys(localStorage)
      .filter((v) => v.indexOf("Painter_") !== -1)
      .map((v) => ({ name: v, value: JSON.parse(localStorage.getItem(v)) }));
  }

  async updateDataStorages() {
    try {
      this.body.innerHTML = "";

      const storagePaintersData = await this.loadingDataJSON();
      console.log("Loading JSON files data");

      this.body.append(this.createMenuElements(storagePaintersData));

      return true;
    } catch (err) {
      return err;
    }
  }

  // Main function show
  async show() {
    this.body = makeElement("div", {
      class: ["painter_storage_body"],
    });

    const box = makeElement("div", {
      class: ["painter_storage_box"],
      children: [
        makeElement("div", {
          class: ["painter_storage_header"],
          children: [
            makeElement("div", {
              innerHTML: "<b>JSON</b> storage data",
              style: { flexBasis: "100%", textAlign: "center" },
            }),
            makeElement("button", {
              textContent: "Refresh",
              style: { color: "limegreen", fontSize: "1rem", padding: "7px" },
              onclick: async (e) => {
                const target = e.target;
                target.style.color = "var(--descrip-text)";
                target.disabled = true;
                target.textContent = "Wait...";

                await new Promise((res, rej) => {
                  const result = this.updateDataStorages();
                  result ? res(true) : rej(result);
                })
                  .then(() => {
                    setTimeout(() => {
                      target.style.color = "limegreen";
                      target.disabled = false;
                      target.textContent = "Refresh";
                    }, 500);
                  })
                  .catch((e) => {
                    console.log(e);
                  });
              },
            }),
          ],
        }),
        this.body,
      ],
    });

    await this.updateDataStorages();

    super.show(box);
    this.element.style.zIndex = 9999;
  }

  close() {
    this.element.remove();
  }
}
