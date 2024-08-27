import { api } from "../../../../scripts/api.js";
import { fabric } from "./fabric.js";
import { formatBytes } from "./helpers.js";
import { ComfyDialog } from "../../../../../scripts/ui.js";
import { makeElement, makeModal } from "../../utils.js";

export class PainterStorageDialog extends ComfyDialog {
  // Remove record in LocalStorage or JSON file
  async removeRecord(name, type) {
    if (!confirm(`Delete record "${name}"?`)) return;

    if (type === "ls") {
      if (localStorage.getItem(name)) {
        localStorage.removeItem(name);
        return true;
      } else {
        return false;
      }
    } else if (type === "json") {
      try {
        const rawResponse = await fetch("/alekpet/remove_node_settings", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name: name }),
        });

        if (rawResponse.status !== 200) {
          throw new Error(
            `Error painter remove file settings: ${rawResponse.statusText}`
          );
        }

        if (rawResponse.status == 200) {
          return true;
        }
      } catch (e) {
        console.log(e);
        return false;
      }
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
            makeElement("div", { textContent: "#" }),
            makeElement("div", { textContent: "Preview" }),
            makeElement("div", { textContent: "Name" }),
            makeElement("div", { textContent: "Size" }),
            makeElement("div", { textContent: "Action" }),
          ],
        }),
      ],
    });

    for (const [idx, { name, value }] of data.entries()) {
      const item = makeElement("div", {
        class: ["painter_storage_grid", "painter_storage_item"],
        style: {
          background: `var(${
            (idx + 1) % 2 !== 0 ? "--tr-odd-bg-color" : "--tr-even-bg-color"
          })`,
        },
        parent: itemBox,
      });

      const numEl = makeElement("div", { textContent: idx + 1 });
      const previewEl = makeElement("div", {
        class: ["painter_storage_item_preview"],
      });

      // Create canvas from preview
      const canvasEl = makeElement("canvas", {
        class: ["painter_storage_item_preview_canvas"],
      });
      previewEl.append(canvasEl);

      // Fabric canvas load
      const fcanvas = new fabric.StaticCanvas(canvasEl);
      const canvasValue = typeof value === "string" ? JSON.parse(value) : value;
      if (canvasValue?.settings?.currentCanvasSize) {
        const { width, height } = canvasValue.settings.currentCanvasSize;

        fcanvas.setDimensions({ width, height }, { backstoreOnly: true });
      }

      fcanvas.loadFromJSON(canvasValue.canvas_settings, () => {
        fcanvas.renderAll();
      });

      const nameEl = makeElement("div", { textContent: name });
      const sizeEl = makeElement("div", {
        innerHTML: formatBytes(new Blob([JSON.stringify(value)]).size),
      });

      const removeButtonEl = makeElement("button", {
        style: { color: "var(--error-text)", padding: "7px", fontSize: "1rem" },
        textContent: "Delete",
        title: "Delete record!",
        onclick: async (e) => {
          const readioType = document.querySelector(
            "[name=painter_storage_radio]:checked"
          ).value;
          const result = await this.removeRecord(name, readioType);

          if (result) {
            makeModal({
              title: "Information",
              text: `Record name "${name}" deleted from ${
                readioType === "ls" ? "local storage" : "json files"
              }!`,
            });

            const data =
              readioType === "ls"
                ? this.loadingDataLocalStorage()
                : await this.loadingDataJSON();

            if (data) this.updateBodyData(data);
          }
        },
      });
      item.append(numEl, previewEl, nameEl, sizeEl, removeButtonEl);
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
      .filter((v) => v.indexOf("Paint_") !== -1)
      .map((v) => ({ name: v, value: localStorage.getItem(v) }));
  }

  async changeSourceData(value) {
    let data = null;
    if (value === "ls") {
      data = this.loadingDataLocalStorage();
    } else if (value === "json") {
      data = await this.loadingDataJSON();
    }

    if (data) this.updateBodyData(data);
  }

  async updateDataStorages(lsStorage) {
    try {
      this.body.innerHTML = "";

      if (lsStorage === "ls") {
        let localStorageItems = this.loadingDataLocalStorage();
        console.log("Loading localStorage data");
        this.body.append(this.createMenuElements(localStorageItems));
      } else if (lsStorage === "json") {
        const json_data_settings = await this.loadingDataJSON();
        console.log("Loading JSON files data");
        this.body.append(this.createMenuElements(json_data_settings));
      }
      return true;
    } catch (err) {
      return err;
    }
  }

  // Main function show
  async show(_lsStorage = true) {
    const lsStorage = !_lsStorage;

    this.body = makeElement("div", {
      class: ["painter_storage_body"],
    });

    const box = makeElement("div", {
      class: ["painter_storage_box"],
      children: [
        makeElement("div", {
          class: ["painter_storage_select"],
          children: [
            makeElement("label", {
              textContent: "Local storage",
              for: "painter_storage_radio_ls",
              children: [
                makeElement("input", {
                  type: "radio",
                  name: "painter_storage_radio",
                  value: "ls",
                  id: "painter_storage_radio_ls",
                  checked: lsStorage,
                  onchange: (e) => this.changeSourceData(e.target.value),
                }),
              ],
            }),
            makeElement("label", {
              textContent: "JSON files",
              for: "painter_storage_radio_json",
              children: [
                makeElement("input", {
                  type: "radio",
                  name: "painter_storage_radio",
                  value: "json",
                  id: "painter_storage_radio_json",
                  checked: !lsStorage,
                  onchange: (e) => this.changeSourceData(e.target.value),
                }),
              ],
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
                  const result = this.updateDataStorages(
                    document.querySelector(
                      "[name=painter_storage_radio]:checked"
                    ).value
                  );
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

    this.updateDataStorages(lsStorage ? "ls" : "json");

    super.show(box);
    this.element.style.zIndex = 9999;
  }

  close() {
    this.element.remove();
  }
}
