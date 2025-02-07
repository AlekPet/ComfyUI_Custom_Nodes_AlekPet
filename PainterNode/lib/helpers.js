import { api } from "../../../../scripts/api.js";
import { app } from "../../../../scripts/app.js";
import { fabric } from "./fabric.js";
import {
  makeElement,
  createWindowModal,
  isEmptyObject,
  THEMES_MODAL_WINDOW,
} from "../../utils.js";

// RGB, HSV, and HSL color conversion algorithms in JavaScript https://gist.github.com/mjackson/5311256
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;

  let max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    h,
    s,
    v = max,
    d = max - min;
  s = max == 0 ? 0 : d / max;

  if (max == min) {
    h = 0; // achromatic
  } else {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }

    h /= 6;
  }

  return [h, s, v];
}
// ---

function toRGBA(hex, alpha = 1.0) {
  let array_hex = hex.match(/[^#]./g);
  if (array_hex) {
    return `rgba(${array_hex
      .map((h) => parseInt(h, 16))
      .join(", ")}, ${alpha})`;
  }
  return hex;
}

function getColorHEX(c) {
  let colorStyle = new fabric.Color(c),
    color = colorStyle.toHex(),
    alpha = colorStyle.getAlpha();
  return { color: `#${color}`, alpha: parseFloat(alpha) };
}

function rangeGradient(rangeElement, color1 = "#15539e", color2 = "#282828") {
  const valueRange =
    ((rangeElement.value - rangeElement.min) /
      (rangeElement.max - rangeElement.min)) *
    100;

  return `linear-gradient(to right, ${color1} 0%, ${color1} ${valueRange}%, ${color2} ${valueRange}%, ${color2} 100%)`;
}

function HsvToRgb(brush_settings) {
  if (
    !brush_settings?.color_h &&
    !brush_settings?.color_s &&
    !brush_settings?.color_v
  )
    return null;

  const colorhsv = new ColorHSV(
    brush_settings.color_h.base_value,
    brush_settings.color_s.base_value,
    brush_settings.color_v.base_value
  );
  colorhsv.hsv_to_rgb_float();

  let red = Math.floor(colorhsv.r * 255).toString(16);
  let green = Math.floor(colorhsv.g * 255).toString(16);
  let blue = Math.floor(colorhsv.b * 255).toString(16);

  if (red.length < 2) red = `0${red}`;
  if (green.length < 2) green = `0${green}`;
  if (blue.length < 2) blue = `0${blue}`;
  return { red, green, blue };
}

function formatBytes(bytes, decimals = 2) {
  if (!+bytes) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

// Workflow state manager class
class WorkflowStateManager {
  constructor() {
    if (WorkflowStateManager.instance) {
      return WorkflowStateManager.instance;
    }
    this.debug = !false;
    this._workflowManager = app?.workflowManager;

    this._currentWorkflow =
      app?.workflowManager?.activeWorkflow.name || "Unsaved Workflow";
    this._previousWorkflow = null;

    this.workflowsStores = [];

    this.countLoaded = 0;
    this.nodeStores = [];
    this.newSave = false;
    this.newOverwrite = false;

    WorkflowStateManager.instance = this;
    this.setEvents();
  }

  checkWorkflowExist(workflow) {
    return !this.workflowsStores.includes(workflow);
  }

  updateWorkflows() {
    return this.workflowManager.workflows.map((w) => w.name);
  }

  setEvents() {
    if (!this.workflowManager) return;

    const self = this;
    this.workflowsStores = this.updateWorkflows();

    // -- Set workflow
    const originsetWorkflow =
      comfyAPI.workflows.ComfyWorkflowManager.prototype.setWorkflow;
    comfyAPI.workflows.ComfyWorkflowManager.prototype.setWorkflow = function (
      workflow
    ) {
      let isOpenWorkflow = false;
      if (workflow && typeof workflow === "string") isOpenWorkflow = true;

      originsetWorkflow.apply(this, [workflow]);

      self.updateWorkflow(this.activeWorkflow.name);

      self.nodeStores = [];
      self.countLoaded = 0;

      if (!isOpenWorkflow)
        self.newSave = self.checkWorkflowExist(this.activeWorkflow.name);

      // Overwrite workflow, copy workflow data before workflow
      if (self.newOverwrite) self.newSave = true;

      self.workflowsStores = self.updateWorkflows();

      self.debug && console.log("Change workflow", self);
    };
    // -- end Set workflow

    // -- Global event workflow
    // Save workflow
    const originalSave = comfyAPI.workflows.ComfyWorkflow.prototype.save;
    comfyAPI.workflows.ComfyWorkflow.prototype.save = async function (
      saveAs = false
    ) {
      self.debug && console.log("Save global");

      // Check if confirm dialog workflow exist overwrite
      let confirmed = false;
      const originalConfirm = window.confirm;

      window.confirm = (message) => {
        confirmed = originalConfirm(message);

        if (confirmed) {
          self.newOverwrite = confirmed;
          self.debug && console.log("Overwrite exist workflow!");
        }

        return confirmed;
      };

      const result = await originalSave.apply(this, [saveAs]);
      window.confirm = originalConfirm;

      return result;
    };

    // Rename workflow
    const originalRename = comfyAPI.workflows.ComfyWorkflow.prototype.rename;
    comfyAPI.workflows.ComfyWorkflow.prototype.rename = async function () {
      self.debug && console.log("Rename global");
      const prevName = this.name;

      // Check if confirm dialog workflow exist overwrite
      let confirmed = false;
      const originalConfirm = window.confirm;

      window.confirm = (message) => {
        confirmed = originalConfirm(message);
        return confirmed;
      };

      const result = await originalRename.apply(this, arguments);
      const newName = this.name;

      if (newName === prevName) return result; // names equals, nothing rename

      // Rename backend
      let updateComplete = false;
      try {
        // -- Check if new name exist inside folder JSON files
        const checkResponse = await api.fetchApi(
          `/alekpet/file_exist_node_settings/Painter_${newName}`
        );
        if (checkResponse.status !== 200)
          throw new Error(
            `Error check exist workflow name file settings: ${checkResponse.statusText}`
          );

        const checkData = await checkResponse?.json();
        if (checkData?.isExists) {
          confirmed = confirm(
            `Workflow new name '${newName}' already exists among the JSON files! Rename?`
          );
        }
        // -- end - Check if new name exist inside folder JSON files

        const rawResponse = await fetch("/alekpet/rename_node_settings", {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            old_name: `Painter_${prevName}`,
            new_name: `Painter_${newName}`,
            overwrite: confirmed,
          }),
        });
        if (rawResponse.status === 200) {
          const json_data = await rawResponse?.json();
          console.log(json_data?.message);
          updateComplete = true;
        } else {
          console.error(
            `Error rename workflow file settings ${rawResponse.statusText}`
          );
        }
      } catch (e) {
        console.log(e);
      }

      if (updateComplete) {
        app.graph._nodes.forEach(
          async (n) => await n.storageCls.saveData(newName)
        );
      }

      self.debug && console.log("Rename workflow!");

      return result;
    };

    // Delete workflow
    const originalDelete = comfyAPI.workflows.ComfyWorkflow.prototype.delete;
    comfyAPI.workflows.ComfyWorkflow.prototype.delete = async function () {
      self.debug && console.log("Delete global");
      await originalDelete.apply(this, arguments);

      this.updateWorkflow(this.name);

      // Workflow remove from storage, when delete workflow
      if (
        JSON.parse(
          localStorage.getItem(
            "Comfy.Settings.alekpet.PainterNode.RemoveWorkflowDelete",
            false
          )
        )
      ) {
        // Remove data when removed workflow
      }
    };
    // end -- Global event workflows

    // Other - Clear workflow event
    api.addEventListener("graphCleared", async (event) => {
      this.debug && console.log("Graph cleared");
    });
  }

  updateWorkflow(newValue) {
    this.previousWorkflow = this.currentWorkflow;
    this.currentWorkflow = newValue;

    this.debug &&
      console.log(
        `Previous workflow: ${this.previousWorkflow}, Current workflow: ${this.currentWorkflow}`
      );
  }

  get workflowManager() {
    return this._workflowManager;
  }

  get previousWorkflow() {
    return this._previousWorkflow;
  }

  set previousWorkflow(new_value) {
    this._previousWorkflow = new_value;
  }

  get currentWorkflow() {
    return this._currentWorkflow;
  }

  set currentWorkflow(new_value) {
    this._currentWorkflow = new_value;
  }
}

// LocalStorage Init
class StorageClass {
  constructor(node, widget) {
    if (
      !node.name ||
      typeof node.name !== "string" ||
      node.name.trim() === ""
    ) {
      throw new Error("Incorrect painter name!");
    }

    this.widget = widget;
    this.node = node;
    this.name = node.name;

    this.workflowStateManager = new WorkflowStateManager();
    this.workflowStateManager?.nodeStores?.push(node);

    this.settings_painter_node_all = {};
    this.settings_painter_node = this.settings_painter_node_default = {
      undo_history: [],
      redo_history: [],
      canvas_settings: { background: "#000000" },
      settings: {
        pipingSettings: {
          action: {
            name: "background",
            options: {
              sendToBack: true,
              scale: 1.0,
            },
          },
          pipingChangeSize: true,
          pipingUpdateImage: true,
        },
        currentCanvasSize: {
          width: 512,
          height: 512,
        },
        mypaint_settings: {
          preset_brush_size: true,
          preset_brush_color: false,
        },
      },
    };
  }

  getSettingsPainterNode() {
    return this.settings_painter_node;
  }

  async getData(showModal = true) {
    // Get settings node
    if (showModal) {
      const parent = this.node.painter.canvas.wrapperEl;

      const message = createWindowModal({
        ...THEMES_MODAL_WINDOW.warning,
        textTitle: "Loading",
        textBody: [
          makeElement("div", {
            innerHTML:
              "Please wait, <span style='font-weight: bold; color: orange'>Painter node</span> settings are loading. Loading times may take a long time if large images have been added to the canvas!",
          }),
        ],
        options: {
          auto: {
            autohide: true,
            autoshow: true,
            autoremove: true,
            autoremove: true,
            timewait: 500,
            propStyles: { opacity: 0 },
            propPreStyles: { display: "flex" },
          },
          parent,
        },
      });
    }

    this.settings_painter_node_all = await this.loadData();
    // -- end - Get settings node

    if (
      !this.settings_painter_node_all ||
      isEmptyObject(this.settings_painter_node_all)
    ) {
      this.settings_painter_node_all = {
        painters_data: { [this.name]: {} },
      };
      this.settings_painter_node = {};
    }

    // --- Realize save copy before change workflow. Dev....
    if (this.workflowStateManager.newSave) {
      const json_data = await this.loadingAllDataJSON();
      let previousData = json_data.filter(
        (d) =>
          d.name === `Painter_${this.workflowStateManager.previousWorkflow}`
      );
      previousData = previousData.length ? previousData[0].value : null;

      if (
        previousData &&
        this.workflowStateManager.currentWorkflow !==
          this.workflowStateManager.previousWorkflow
      ) {
        this.settings_painter_node_all.painters_data = JSON.parse(
          JSON.stringify(previousData.painters_data)
        );
        console.log(
          `Copy painters data '${Object.keys(previousData.painters_data).join(
            ","
          )}' from previous workflow '${
            this.workflowStateManager.previousWorkflow
          }' to '${this.workflowStateManager.currentWorkflow}' completed!`
        );
      }
    }
    // --- end - Realize save copy before change workflow. Dev....

    if (
      !this.settings_painter_node_all.painters_data.hasOwnProperty(this.name)
    ) {
      this.settings_painter_node_all.painters_data[this.name] = {};
    }

    if (
      this.settings_painter_node_all.painters_data[this.name] &&
      isEmptyObject(this.settings_painter_node_all.painters_data[this.name])
    ) {
      this.settings_painter_node_all.painters_data[this.name] = JSON.parse(
        JSON.stringify(this.widget.settings_painter_node_default)
      );
    }

    this.settings_painter_node =
      this.settings_painter_node_all.painters_data[this.name];

    this.workflowStateManager.countLoaded += 1;
    if (
      this.workflowStateManager.newSave &&
      this.workflowStateManager.countLoaded ===
        this.workflowStateManager.nodeStores.length
    ) {
      this.workflowStateManager.newSave = false;
      this.workflowStateManager.newOverwrite = false;
      this.workflowStateManager.countLoaded = 0;
    }

    return this.settings_painter_node;
  }

  // Write settings in the file json
  async saveData(workflowName = null) {
    try {
      let savedData = await this.loadData(workflowName);
      if (Object.keys(savedData).length > 0) {
        savedData.painters_data[this.name] = JSON.parse(
          JSON.stringify(this.settings_painter_node)
        );
      } else {
        savedData = this.settings_painter_node_all;
      }

      const formData = new FormData();
      formData.append(
        "name",
        `Painter_${workflowName ?? this.workflowStateManager.currentWorkflow}`
      );
      formData.append(
        "data",
        new Blob([JSON.stringify(savedData)], {
          type: "application/json",
        })
      );

      const rawResponse = await fetch("/alekpet/save_node_settings", {
        method: "POST",
        body: formData,
      });
      if (rawResponse.status !== 200) {
        throw new Error(
          `Error painter save file settings ${rawResponse.statusText}`
        );
      }
    } catch (e) {
      console.log(e);
    }
  }

  // Get all data form JSON's files
  async loadingAllDataJSON() {
    try {
      const rawResponse = await api.fetchApi(
        "/alekpet/loading_all_node_settings"
      );
      if (rawResponse.status !== 200)
        throw new Error(
          `Error painter get json data settings: ${rawResponse.statusText}`
        );

      const data = await rawResponse?.json();
      if (!data?.all_settings_nodes) return [];

      return data.all_settings_nodes;
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  // Load settings from json file
  async loadData(workflowName = null) {
    try {
      const rawResponse = await api.fetchApi(
        `/alekpet/loading_node_settings/Painter_${
          workflowName ?? this.workflowStateManager.currentWorkflow
        }`
      );
      if (rawResponse.status !== 200)
        throw new Error(
          `Error painter load file settings: ${rawResponse.statusText}`
        );

      const data = await rawResponse?.json();
      if (!data) return {};

      return data.settings_nodes;
    } catch (e) {
      console.log(e);
      return {};
    }
  }

  // Remove settings from json file
  async removeData(painters_value = null) {
    let painters_data = painters_value ?? [this.name];

    try {
      const rawResponse = await fetch("/alekpet/remove_node_settings", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: `Painter_${this.workflowStateManager.currentWorkflow}`,
          painters_data: painters_data,
        }),
      });

      if (rawResponse.status !== 200)
        throw new Error(
          `Error painter remove file settings: ${rawResponse.statusText}`
        );

      const jsonData = await rawResponse?.json();
      console.log(jsonData.message);
    } catch (e) {
      console.log(e);
    }
  }
}

export {
  rgbToHsv,
  toRGBA,
  getColorHEX,
  rangeGradient,
  HsvToRgb,
  formatBytes,
  StorageClass,
  WorkflowStateManager,
};
