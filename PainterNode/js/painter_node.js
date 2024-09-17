/*
 * Title: PainterNode ComflyUI from ControlNet
 * Author: AlekPet
 * Version: 2024.09.02
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { fabric } from "./lib/painternode/fabric.js";
import "./lib/painternode/mybrush.js";
import { svgSymmetryButtons } from "./lib/painternode/brushes.js";
import { toRGBA, getColorHEX, LS_Class } from "./lib/painternode/helpers.js";
import { PainterStorageDialog } from "./lib/painternode/dialogs.js";
import { addStylesheet } from "../../scripts/utils.js";
import {
  showHide,
  makeElement,
  makeModal,
  animateClick,
  createWindowModal,
  isEmptyObject,
  THEMES_MODAL_WINDOW,
} from "./utils.js";
import { MyPaintManager } from "./lib/painternode/manager_mypaint.js";

// ================= FUNCTIONS ================

// Save settings in JSON file on the extension folder [big data settings includes images] if true else localStorage
const SaveSettingsJsonLS = localStorage.getItem(
  "Comfy.Settings.alekpet.PainterNode.SaveSettingsJson",
  false
);
let painters_settings_json = SaveSettingsJsonLS
  ? JSON.parse(SaveSettingsJsonLS)
  : false;
//

const removeIcon =
  "data:image/svg+xml,%3Csvg version='1.1' id='Ebene_1' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3C/defs%3E%3Crect x='125.3' y='264.6' width='350.378' height='349.569' style='fill: rgb(237, 0, 0); stroke: rgb(197, 2, 2);' rx='58.194' ry='58.194'%3E%3C/rect%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18' rx='32.772' ry='32.772'%3E%3C/rect%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179' rx='32.772' ry='32.772'%3E%3C/rect%3E%3C/g%3E%3C/svg%3E";

const removeImg = document.createElement("img");
removeImg.src = removeIcon;

const convertIdClass = (text) => text.replaceAll(".", "_");

function renderIcon(icon) {
  return function renderIcon(ctx, left, top, styleOverride, fabricObject) {
    var size = this.cornerSize;
    ctx.save();
    ctx.translate(left, top);
    ctx.rotate(fabric.util.degreesToRadians(fabricObject.angle));
    ctx.drawImage(icon, -size / 2, -size / 2, size, size);
    ctx.restore();
  };
}

function removeObject(eventData, transform) {
  var target = transform.target;
  var canvas = target.canvas;
  canvas.remove(target);
  canvas.requestRenderAll();
  this.viewListObjects(this.list_objects_panel__items);
}

function resizeCanvas(node, sizes) {
  const { width, height } = sizes ?? node.painter.currentCanvasSize;

  node.painter.canvas.setDimensions({
    width: width,
    height: height,
  });

  node.painter.canvas.getElement().width = width;
  node.painter.canvas.getElement().height = height;

  node.painter.canvas.renderAll();
  app.graph.setDirtyCanvas(true, false);
}
// ================= END FUNCTIONS ================

// ================= CLASS PAINTER ================
class Painter {
  constructor(node, canvas) {
    this.originX = 0;
    this.originY = 0;
    this.drawning = true;
    this.mode = false;
    this.type = "Brush";

    this.locks = {
      lockMovementX: false,
      lockMovementY: false,
      lockScalingX: false,
      lockScalingY: false,
      lockRotation: false,
    };

    this.currentCanvasSize = { width: 512, height: 512 };
    this.maxNodeSize = 1024;

    this.max_history_steps = 20;
    this.undo_history = [];
    this.redo_history = [];

    // this.undo_history = this.node.LS_Cls.LS_Painters.undo_history || [];
    // this.redo_history = this.node.LS_Cls.LS_Painters.redo_history || [];

    this.fonts = {
      Arial: "arial",
      "Times New Roman": "Times New Roman",
      Verdana: "verdana",
      Georgia: "georgia",
      Courier: "courier",
      "Comic Sans MS": "comic sans ms",
      Impact: "impact",
    };

    this.bringFrontSelected = true;

    this.node = node;
    this.history_change = false;
    this.canvas = this.initCanvas(canvas);
    this.image = node.widgets.find((w) => w.name === "image");

    let default_value = this.image.value;
    Object.defineProperty(this.image, "value", {
      set: function (value) {
        this._real_value = value;
      },

      get: function () {
        let value = "";
        if (this._real_value) {
          value = this._real_value;
        } else {
          return default_value;
        }

        if (value.filename) {
          let real_value = value;
          value = "";
          if (real_value.subfolder) {
            value = real_value.subfolder + "/";
          }

          value += real_value.filename;

          if (real_value.type && real_value.type !== "input")
            value += ` [${real_value.type}]`;
        }
        return value;
      },
    });
  }

  initCanvas(canvasEl) {
    this.canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: true,
      backgroundColor: "transparent",
      width: 512,
      height: 512,
      enablePointerEvents: true,
    });

    this.canvas.backgroundColor = "#000000";

    fabric.util.addListener(
      this.canvas.upperCanvasEl,
      "contextmenu",
      function (e) {
        e.preventDefault();
      }
    );

    return this.canvas;
  }

  propertiesLS() {
    let settingsNode = this.node.LS_Cls.LS_Painters.settings;

    if (!settingsNode) {
      settingsNode = this.node.LS_Cls.LS_Painters.settings = {
        lsSavePainter: true,
        pipingSettings: {
          action: {
            name: "background",
            options: {},
          },
          pipingChangeSize: true,
          pipingUpdateImage: true,
        },
      };
    }

    // Save canvas to localStorage if not exists
    if (typeof settingsNode?.lsSavePainter !== "boolean") {
      settingsNode.lsSavePainter = true;
    }

    // Piping settings localStorage if not exists
    if (!settingsNode?.pipingSettings) {
      settingsNode.pipingSettings = {
        action: {
          name: "background",
          options: {},
        },
        pipingChangeSize: true,
        pipingUpdateImage: true,
      };
    }
  }

  makeElements() {
    const panelPaintBox = document.createElement("div");
    panelPaintBox.innerHTML = `<div class="painter_manipulation_box" f_name="Locks" style="display:none;">
        <div class="comfy-menu-btns">
            <button id="lockMovementX" title="Lock move X">Lock X</button>
            <button id="lockMovementY" title="Lock move Y">Lock Y</button>
            <button id="lockScalingX" title="Lock scale X">Lock ScaleX</button>
            <button id="lockScalingY" title="Lock scale Y">Lock ScaleY</button>
            <button id="lockRotation" title="Lock rotate">Lock Rotate</button>
        </div>
        <div class="comfy-menu-btns">
            <button id="zpos_BringForward" title="Moves an object or a selection up in stack of drawn objects">Bring Forward</button>
            <button id="zpos_SendBackwards" title="Moves an object or a selection down in stack of drawn objects">Send Backwards</button>
            <button id="zpos_BringToFront" title="Moves an object or the objects of a multiple selection to the top">Bring Front</button>
            <button id="zpos_SendToBack" title="Moves an object or the objects of a multiple selection to the bottom">Send Back</button>
            <button id="zpos_BringFrontSelected" title="Moves an object or the objects of a multiple selection to the top after mouse click" class="${
              this.bringFrontSelected ? "active" : ""
            }">Bring Up Always</button>
        </div>
    </div>
    <div class="painter_drawning_box_property" style='display:block;'></div>
    <div class="painter_drawning_box">
        <div class="painter_mode_box fieldset_box comfy-menu-btns" f_name="Mode">
            <button id="painter_change_mode" title="Enable selection mode">Selection</button>
            <div class="list_objects_panel" style="display:none;">
                <div class="list_objects_align">
                    <div class="list_objects_panel__items"></div>
                    <div class="painter_shapes_box_modify"></div>
                </div>
            </div>
        </div>
        <div class="painter_drawning_elements" style="display:block;">
            <div class="painter_grid_style painter_shapes_box fieldset_box comfy-menu-btns" f_name="Shapes">
                <button class="active" data-shape='Brush' title="Brush">B</button>
                <button data-shape='Erase' title="Erase">E</button>
                <button data-shape='Circle' title="Draw circle">◯</button>
                <button data-shape='Rect' title="Draw rectangle">▭</button>
                <button data-shape='Triangle' title="Draw triangle">△</button>
                <button data-shape='Line' title="Draw line">|</button>
                <button data-shape='Image' title="Add picture">P</button>
                <button data-shape='Textbox' title="Add text">T</button>
            </div>
            <div class="painter_colors_box fieldset_box" f_name="Colors">
                <div class="painter_grid_style painter_colors_alpha">
                    <span>Fill</span><span>Alpha</span>
                    <input id="fillColor" type="color" value="#FF00FF" title="Fill color">
                    <input id="fillColorTransparent" type="number" max="1.0" min="0" step="0.05" value="0.0" title="Alpha fill value">
                </div>
                <div class="painter_grid_style painter_colors_alpha">
                    <span>Stroke</span><span>Alpha</span>
                    <input id="strokeColor" type="color" value="#FFFFFF" title="Stroke color">    
                    <input id="strokeColorTransparent" type="number" max="1.0" min="0" step="0.05" value="1.0" title="Stroke alpha value">
                </div>
            </div>
            <div class="painter_stroke_box fieldset_box" f_name="Brush/Erase width">
                <label for="strokeWidth"><span>Brush:</span><input id="strokeWidth" type="number" min="0" max="150" value="5" step="1" title="Brush width"></label>
                <label for="eraseWidth"><span>Erase:</span><input id="eraseWidth" type="number" min="0" max="150" value="5" step="1" title="Erase width"></label>
            </div>
            <div class="painter_grid_style painter_bg_setting fieldset_box comfy-menu-btns" f_name="Background">
                <input id="bgColor" type="color" value="#000000" data-label="BG" title="Background color">
                <button bgImage="img_load" title="Add background image">IMG</button>
                <button bgImage="img_reset" title="Remove background image">IMG <span style="color: var(--error-text);">✖</span></button>
            </div>
            <div class="painter_settings_box fieldset_box comfy-menu-btns" f_name="Settimgs">    
              <button id="painter_canvas_size" title="Set canvas size">Canvas size</button>
            </div>
        </div>
    </div>
    <div class="painter_history_panel comfy-menu-btns">
      <button id="history_undo" title="Undo" disabled>⟲</button>
      <button id="history_redo" title="Redo" disabled>⟳</button>
    </div> 
    `;

    // Main panelpaint box
    panelPaintBox.className = "panelPaintBox";

    this.canvas.wrapperEl.appendChild(panelPaintBox);
    // Manipulation box
    this.manipulation_box = panelPaintBox.querySelector(
      ".painter_manipulation_box"
    );
    this.painter_drawning_box_property = panelPaintBox.querySelector(
      ".painter_drawning_box_property"
    );

    [this.undo_button, this.redo_button] = panelPaintBox.querySelectorAll(
      ".painter_history_panel button"
    );

    // Modify in change mode
    this.painter_shapes_box_modify = panelPaintBox.querySelector(
      ".painter_shapes_box_modify"
    );
    this.painter_drawning_elements = panelPaintBox.querySelector(
      ".painter_drawning_elements"
    );
    [
      this.painter_shapes_box,
      this.painter_colors_box,
      this.painter_stroke_box,
      this.painter_bg_setting,
      this.painter_settings_box,
    ] = this.painter_drawning_elements.children;

    // Setting pipping modal window
    this.mainSettings();

    // Settings piping button
    const mainSettingsNode = makeElement("button", {
      style: "background: var(--comfy-input-bg);",
      textContent: "Settings 🛠️",
      title: "Show main settings model window",
      onclick: (e) => animateClick(this.painter_wrapper_settings),
      customSize: { w: 70, h: 25, fs: 10 },
    });
    this.painter_settings_box.append(mainSettingsNode);

    this.change_mode = panelPaintBox.querySelector("#painter_change_mode");
    this.painter_shapes_box = panelPaintBox.querySelector(
      ".painter_shapes_box"
    );
    this.strokeWidth = panelPaintBox.querySelector("#strokeWidth");
    this.eraseWidth = panelPaintBox.querySelector("#eraseWidth");
    this.strokeColor = panelPaintBox.querySelector("#strokeColor");
    this.fillColor = panelPaintBox.querySelector("#fillColor");

    this.list_objects_panel__items = panelPaintBox.querySelector(
      ".list_objects_panel__items"
    );

    this.strokeColorTransparent = panelPaintBox.querySelector(
      "#strokeColorTransparent"
    );
    this.fillColorTransparent = panelPaintBox.querySelector(
      "#fillColorTransparent"
    );

    this.bgColor = panelPaintBox.querySelector("#bgColor");
    this.clear = panelPaintBox.querySelector("#clear");

    this.painter_bg_setting = panelPaintBox.querySelector(
      ".painter_bg_setting"
    );

    this.buttonSetCanvasSize = panelPaintBox.querySelector(
      "#painter_canvas_size"
    );

    this.bgImageFile = document.createElement("input");
    Object.assign(this.bgImageFile, {
      accept: "image/jpeg,image/png,image/webp",
      type: "file",
      style: "display:none",
    });

    this.painter_bg_setting.appendChild(this.bgImageFile);
    this.changePropertyBrush();
    this.createBrushesToolbar();
    this.bindEvents();
  }

  setValueElementsLS() {
    this.painter_wrapper_settings.remove();
    this.mainSettings();
  }

  mainSettings() {
    // Piping fieldset
    const pipingSettingsBox = makeElement("fieldset", {
      style:
        "display: flex; flex-direction: column; gap: 5px; text-align: left; border-color: #0f84cd; border-radius: 4px;",
      class: ["pipingSettingsBox"],
    });

    // LS change size piping
    const labelPipingChangeSize = makeElement("label", {
      textContent: "Change size:",
      style: "font-size: 10px; display: block; text-align: right;",
      title: "Change the canvas size equal to the input image",
    });

    const pipingChangeSize = makeElement("input", {
      type: "checkbox",
      class: ["pipingChangeSize_checkbox"],
      checked:
        this.node.LS_Cls.LS_Painters.settings?.pipingSettings
          ?.pipingChangeSize ?? true,
      onchange: (e) => {
        this.node.LS_Cls.LS_Painters.settings.pipingSettings.pipingChangeSize =
          pipingChangeSize.checked;
        this.node.LS_Cls.LS_Save();
      },
    });

    pipingChangeSize.customSize = { w: 10, h: 10, fs: 10 };
    labelPipingChangeSize.append(pipingChangeSize);
    // end - LS change size piping

    // Piping update image
    const labelPipingUpdateImage = makeElement("label", {
      textContent: "Update image:",
      style: "font-size: 10px; display: block; text-align: right;",
      title:
        "Update the image when generating (needed to avoid updating the mask)",
    });

    const pipingUpdateImageCheckbox = makeElement("input", {
      type: "checkbox",
      class: ["pipingUpdateImage_checkbox"],
      checked:
        this.node.LS_Cls.LS_Painters.settings?.pipingSettings
          ?.pipingUpdateImage ?? true,
      onchange: (e) => {
        this.node.LS_Cls.LS_Painters.settings.pipingSettings.pipingUpdateImage =
          pipingUpdateImageCheckbox.checked;

        // Get hidden widget update_node
        const update_node_widget = this.node.widgets.find(
          (w) => w.name === "update_node"
        );
        update_node_widget.value = pipingUpdateImageCheckbox.checked;
        this.node.LS_Cls.LS_Save();
      },
    });

    pipingUpdateImageCheckbox.customSize = { w: 10, h: 10, fs: 10 };
    labelPipingUpdateImage.append(pipingUpdateImageCheckbox);
    // end - Piping update image

    // === Settings box ===

    // Function click on the radio and show/hide custom settings
    function checkRadioOptionsSelect(currentTarget) {
      if (currentTarget.value !== "image") {
        other_options_radio.innerHTML = "";
      } else {
        if (!other_options_radio.querySelector(".custom_options_piping_box")) {
          const custom_options_piping_box = makeElement("div", {
            class: ["custom_options_piping_box"],
            style:
              "border: 1px solid #0069ff; padding: 6px; display: flex; flex-direction: column; gap: 3px; justify-content: center; align-items: flex-end; text-align: right; border-radius: 6px;",
          });

          // Scale option image
          const scale = makeElement("input", {
            type: "number",
            value:
              this.node.LS_Cls.LS_Painters.settings.pipingSettings.action
                .options.scale ?? 1.0,
            min: 0,
            step: 0.01,
            style: "width: 30%;",
            onchange: (e) => {
              this.node.LS_Cls.LS_Painters.settings.pipingSettings.action.options.scale =
                +e.currentTarget.value;
              this.node.LS_Cls.LS_Save();
            },
          });

          const scaleLabel = makeElement("label", {
            textContent: "Scale: ",
            title: "Change image size (default: 1)",
          });
          scaleLabel.append(scale);

          // sendToBack image canvas
          const backwardsImage = makeElement("input", {
            type: "checkbox",
            checked:
              this.node.LS_Cls.LS_Painters.settings.pipingSettings.action
                .options.sendToBack ?? true,
            onchange: (e) => {
              this.node.LS_Cls.LS_Painters.settings.pipingSettings.action.options.sendToBack =
                e.currentTarget.checked;
              this.node.LS_Cls.LS_Save();
            },
          });
          const sendToBackLabel = makeElement("label", {
            textContent: "Send to back: ",
            title: "Sending to back image on the canvas (default: true)",
          });
          sendToBackLabel.append(backwardsImage);

          custom_options_piping_box.append(scaleLabel, sendToBackLabel);

          other_options_radio.append(custom_options_piping_box);
        }
      }
    }

    // Radios click
    function radiosClick(e) {
      const { currentTarget } = e;
      checkRadioOptionsSelect.call(this, currentTarget);

      this.node.LS_Cls.LS_Painters.settings.pipingSettings.action.name =
        currentTarget.value;
      this.node.LS_Cls.LS_Save();
    }

    const radio_name = `painter_radio_piping_${this.node.name.replace(
      ".png",
      ""
    )}`;

    const radios = [
      {
        title: "Past as background",
        toast: "Set piping input image as backgound canvas",
        value: "background",
      },
      {
        title: "Past as image",
        toast: "Set piping input image as image to the backend",
        value: "image",
      },
    ];

    const other_options_radio = makeElement("div", {
      class: ["painter_other_options_radio"],
    });

    const radiosElements = [];
    radios.forEach((radio, idx) => {
      const { title, toast, value } = radio;
      const radioBox = makeElement("div", {
        class: ["painter_radio_piping_box"],
      });

      const labelRadio = makeElement("label", {
        class: ["painter_radio_piping_label"],
      });

      const radEl = makeElement("input", {
        type: "radio",
        name: radio_name,
        title: toast,
        id: `painter_radio_${value}`,
        value: value,
        onclick: (e) => radiosClick.call(this, e),
      });

      labelRadio.append(radEl, document.createTextNode(title));
      radioBox.append(labelRadio);
      radiosElements.push(radioBox);

      if (
        this.node.LS_Cls.LS_Painters.settings.pipingSettings.action.name ===
        value
      ) {
        radEl.checked = true;
        checkRadioOptionsSelect.call(this, radEl);
      }
    });

    pipingSettingsBox.append(
      makeElement("legend", {
        textContent: "Piping",
        style: "color: rgb(15, 132, 205);",
      }),
      ...radiosElements,
      other_options_radio,
      labelPipingChangeSize,
      labelPipingUpdateImage
    );

    // LocalStorage fieldset
    const lSettingsBoxSettingsBox = makeElement("fieldset", {
      style:
        "display: flex; flex-direction: column; gap: 5px; text-align: left; border-color: #ffb710; border-radius: 4px;",
      class: ["lSettingsBoxSettingsBox"],
    });

    const labelLSSave = makeElement("label", {
      textContent: "Save canvas:",
      style: "font-size: 10px; display: block; text-align: right;",
      title: "Save canvas to local storage",
    });

    const checkBoxLSSave = makeElement("input", {
      type: "checkbox",
      class: ["lsSave_checkbox"],
      checked: this.node.LS_Cls.LS_Painters.settings?.lsSavePainter ?? true,
      onchange: (e) => {
        this.node.LS_Cls.LS_Painters.settings.lsSavePainter =
          checkBoxLSSave.checked;
        this.node.LS_Cls.LS_Save();
      },
      customSize: { w: 10, h: 10, fs: 10 },
    });

    labelLSSave.append(checkBoxLSSave);
    lSettingsBoxSettingsBox.append(
      makeElement("legend", {
        textContent: "Local Storage",
        style: "color: #ffb710;",
      }),
      labelLSSave
    );
    // end - LocalStorage fieldset

    this.painter_wrapper_settings = createWindowModal({
      textTitle: "Settings",
      textBody: [pipingSettingsBox, lSettingsBoxSettingsBox],
      stylesBox: {
        borderColor: "#13e9c5ad",
        boxShadow: "2px 2px 4px #13e9c5ad",
      },
      stylesClose: { background: "#13e9c5ad" },
      stylesBody: { width: "100%", alignItems: "auto" },
    });

    this.canvas.wrapperEl.append(this.painter_wrapper_settings);
    // === end - Settings box ===
  }

  clearCanvas() {
    this.canvas.clear();
    this.canvas.backgroundColor = this.bgColor.value || "#000000";
    this.canvas.requestRenderAll();

    this.addToHistory();
    this.canvasSaveSettingsPainter();
  }

  viewListObjects(list_body) {
    list_body.innerHTML = "";

    let objectNames = [];

    this.canvas.getObjects().forEach((o) => {
      const type = o.type,
        boxOb = makeElement("div", { class: ["viewlist__itembox"] }),
        itemRemove = makeElement("img", {
          src: removeIcon,
          title: "Remove object",
        }),
        obEl = makeElement("button"),
        countType = objectNames.filter((t) => t == type).length + 1,
        text_value = !o.hasOwnProperty("mypaintlib")
          ? type + `_${countType}`
          : `mypaint_${countType}`;

      obEl.setAttribute("painter_object", text_value);
      obEl.textContent = text_value;

      objectNames.push(o.type);

      obEl.addEventListener("click", (e) => {
        // Style active
        this.setActiveElement(obEl, list_body);
        // Select element
        this.canvas.discardActiveObject();
        this.canvas.setActiveObject(o);

        // Get position and size object
        this.getPositionAndSize(o);

        this.canvas.renderAll();
      });

      itemRemove.addEventListener("click", () => {
        removeObject.call(this, null, { target: o });
        this.canvas.renderAll();
        this.uploadPaintFile(this.node.name);
      });

      boxOb.append(obEl, itemRemove);
      list_body.append(boxOb);
    });
  }

  getPositionAndSize(object) {
    if (!this.elemX || !this.elemY) {
      [this.elemX, this.elemY] = this.position_sizes_box.querySelectorAll(
        "input[class*=painter_position]"
      );
    }
    this.elemX.value = object.left;
    this.elemY.value = object.top;

    this.elemX.title = "Position X:" + object.left.toFixed(2);
    this.elemY.title = "Position Y:" + object.top.toFixed(2);
  }

  clearLocks() {
    try {
      const locksElements =
        this.manipulation_box.querySelectorAll("[id^=lock]");
      if (locksElements) {
        locksElements.forEach((element) => {
          const id = element.id;
          if (id) {
            this.locks[id] = false;
            element.classList.remove("active");
          }
        });
      }
    } catch (e) {
      console.log("Clear locks error:" + e.message);
    }
  }

  changeMode(b) {
    let target = b.target,
      nextElement = target.parentElement.nextElementSibling,
      panelListObjects = target.nextElementSibling;

    if (["Image", "Textbox"].includes(this.type)) {
      this.drawning = true;
    }

    if (this.drawning) {
      this.canvas.isDrawingMode = false;
      this.drawning = false;
    } else {
      this.canvas.discardActiveObject();
      this.canvas.isDrawingMode = this.drawning = true;

      if (
        !["Brush", "Erase", "BrushSymmetry", "Image", "Textbox"].includes(
          this.type
        )
      )
        this.canvas.isDrawingMode = false;
    }

    if (!this.mode) {
      target.textContent = "Drawing";
      target.title = "Enable drawing mode";
      this.viewListObjects(this.list_objects_panel__items);

      showHide({
        elements: [this.manipulation_box, nextElement, panelListObjects],
      });

      showHide({
        elements: [this.painter_drawning_box_property],
        displayProp: "flex",
      });

      this.clearLocks();

      // Make XY pos and scale
      this.position_sizes_box = makeElement("div", {
        class: ["painter_position_sizes_box", "fieldset_box"],
        style: {
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        },
        children: [
          makeElement("label", {
            children: [
              makeElement("span", {
                textContent: "X:",
                style: { padding: "2px" },
              }),
              makeElement("input", {
                class: ["painter_position_element_x"],
                title: "Position X",
                type: "number",
                value: 0,
                onchange: (e) => {
                  const object = this.canvas.getActiveObject();
                  if (+e.target.value) {
                    e.target.title = "Position X: " + e.target.value;
                    object.set({ left: +e.target.value });
                    object?.setCoords();
                    this.canvas.requestRenderAll();
                  }
                },
              }),
            ],
          }),
          makeElement("label", {
            children: [
              makeElement("span", {
                textContent: "Y:",
                style: { padding: "2px" },
              }),
              makeElement("input", {
                class: ["painter_position_element_y"],
                title: "Position Y",
                type: "number",
                value: 0,
                onchange: (e) => {
                  const object = this.canvas.getActiveObject();
                  if (+e.target.value) {
                    e.target.title = "Position Y: " + e.target.value;
                    object.set({ top: +e.target.value });
                    object?.setCoords();
                    this.canvas.requestRenderAll();
                  }
                },
              }),
            ],
          }),
        ],
      });

      this.position_sizes_box.setAttribute("f_name", "Position");

      this.painter_shapes_box_modify.append(
        this.position_sizes_box,
        this.painter_colors_box,
        this.painter_stroke_box
      );
    } else {
      target.textContent = "Selection";
      target.title = "Enable selection mode";
      showHide({
        elements: [this.manipulation_box, nextElement, panelListObjects],
      });

      showHide({
        elements: [this.painter_drawning_box_property],
        displayProp: "flex",
      });

      this.painter_shapes_box.insertAdjacentElement(
        "afterend",
        this.painter_colors_box
      );
      this.painter_colors_box.insertAdjacentElement(
        "afterend",
        this.painter_stroke_box
      );
      // Position and scale remove
      this.position_sizes_box.remove();
    }

    this.canvas.discardActiveObject();
    this.canvas.renderAll();

    this.mode = !this.mode;
  }

  setActiveElement(element_active, parent) {
    let elementActive = parent?.querySelector(".active");
    if (elementActive) elementActive.classList.remove("active");
    element_active.classList.add("active");
  }

  // Change properties brush and shapes, when change color and strokeWidth
  changePropertyBrush(type = "Brush") {
    if (["Brush", "BrushSymmetry", "BrushMyPaint"].includes(type)) {
      if (type === "Brush" || type === "BrushSymmetry") {
      }

      if (type === "BrushMyPaint") {
        this.MyBrushPaintManager.setColorBrush(this.strokeColor.value);

        // Size brush
        this.MyBrushPaintManager.setPropertyBrushValue(
          this.strokeWidth.value,
          "radius_logarithmic"
        );
        return;
      }

      this.canvas.freeDrawingBrush.color = toRGBA(
        this.strokeColor.value,
        this.strokeColorTransparent.value
      );
      this.canvas.freeDrawingBrush.width = parseInt(this.strokeWidth.value, 10);
    }

    if (type != "Erase" || (type == "Erase" && !this.drawning)) {
      let a_obs = this.canvas.getActiveObjects();
      if (a_obs) {
        a_obs.forEach((a_o) => {
          this.setActiveStyle(
            "strokeWidth",
            parseInt(this.strokeWidth.value, 10),
            a_o
          );
          this.setActiveStyle(
            "stroke",
            toRGBA(this.strokeColor.value, this.strokeColorTransparent.value),
            a_o
          );
          this.setActiveStyle(
            "fill",
            toRGBA(this.fillColor.value, this.fillColorTransparent.value),
            a_o
          );
        });
      }
    } else {
      this.canvas.freeDrawingBrush.width = parseInt(this.eraseWidth.value, 10);
    }

    this.canvas.renderAll();
  }

  // Make shape
  shapeCreate({
    type,
    left,
    top,
    stroke,
    fill,
    strokeWidth,
    points = [],
    path = "",
  }) {
    let shape = null;

    if (type == "Rect") {
      shape = new fabric.Rect();
    } else if (type == "Circle") {
      shape = new fabric.Circle();
    } else if (type == "Triangle") {
      shape = new fabric.Triangle();
    } else if (type == "Line") {
      shape = new fabric.Line(points);
    } else if (type == "Path") {
      shape = new fabric.Path(path);
    }

    Object.assign(shape, {
      angle: 0,
      left: left,
      top: top,
      originX: "left",
      originY: "top",
      strokeWidth: strokeWidth,
      stroke: stroke,
      transparentCorners: false,
      hasBorders: false,
      hasControls: false,
      radius: 1,
      fill: type == "Path" ? false : fill,
    });

    return shape;
  }

  // Toolbars
  createFontToolbar() {
    const property_textbox = makeElement("div", {
      class: ["property_textBox", "comfy-menu-btns"],
    });
    const buttonItalic = makeElement("button", {
      dataset: { prop: "prop_fontStyle" },
      title: "Italic",
      style: "font-style:italic;",
      textContent: "I",
    });
    const buttonBold = makeElement("button", {
      dataset: { prop: "prop_fontWeight" },
      title: "Bold",
      style: "font-weight:bold;",
      textContent: "B",
    });
    const buttonUnderline = makeElement("button", {
      dataset: { prop: "prop_underline" },
      title: "Underline",
      style: "text-decoration: underline;",
      textContent: "U",
    });
    const separator = makeElement("div", { class: ["separator"] });
    const selectFontFamily = makeElement("select", {
      class: ["font_family_select"],
    });

    for (let f in this.fonts) {
      const option = makeElement("option");
      if (f === "Arial") option.setAttribute("selected", true);
      option.value = this.fonts[f];
      option.textContent = f;
      selectFontFamily.appendChild(option);
    }

    // Select front event
    selectFontFamily.onchange = (e) => {
      if (this.getActiveStyle("fontFamily") != selectFontFamily.value)
        this.setActiveStyle("fontFamily", selectFontFamily.value);
    };

    property_textbox.append(
      buttonItalic,
      buttonBold,
      buttonUnderline,
      separator,
      selectFontFamily
    );
    this.painter_drawning_box_property.append(property_textbox);
  }

  createBrushesToolbar() {
    // First panel
    const property_brushesBox = makeElement("div", {
      class: ["property_brushesBox", "comfy-menu-btns"],
    });

    const BrushMyPaint = makeElement("button", {
      dataset: [{ shape: "BrushMyPaint" }, { prop: "prop_BrushMyPaint" }],
      title: "MyPaint Brush",
      textContent: "MyPaint",
    });
    BrushMyPaint.customSize = { w: 50, h: 25, fs: 10 };

    const buttonBrushSymmetry = makeElement("button", {
      dataset: [{ shape: "BrushSymmetry" }, { prop: "prop_BrushSymmetry" }],
      title: "Symmetry Brush",
      textContent: "S",
    });

    const separator = makeElement("div", { class: ["separator"] });

    // Second panel setting brushes
    this.property_brushesSecondBox = makeElement("div", {
      class: ["property_brushesSecondBox"],
    });

    property_brushesBox.append(
      BrushMyPaint,
      buttonBrushSymmetry,
      separator,
      this.property_brushesSecondBox
    );

    this.painter_drawning_box_property.append(property_brushesBox);
  }

  async createToolbarOptions(type) {
    this.property_brushesSecondBox.innerHTML = "";
    if (type === "BrushSymmetry" || type === "BrushMyPaint") {
      const options = this.canvas.freeDrawingBrush?._options;
      Object.keys(options).forEach((symoption, indx) => {
        const current = options[symoption];
        const buttonOpt = makeElement("button", {
          innerHTML: svgSymmetryButtons[indx],
          dataset: { prop: `prop_symmetry_${indx}` },
          title: current.type,
        });

        if (current.enable) buttonOpt.classList.add("active");

        buttonOpt.optindex = indx;
        this.property_brushesSecondBox.append(buttonOpt);
      });

      // MyPaintBrush
      if (type === "BrushMyPaint") {
        this.MyBrushPaintManager.appendElements(this.property_brushesSecondBox);
      }
    }

    app.graph.setDirtyCanvas(true, false);
  }
  // end - Toolbars

  selectPropertyToolbar(type) {
    this.painter_drawning_box_property.innerHTML = "";
    if (["Textbox", "Brush"].includes(this.type)) {
      this.painter_drawning_box_property.style.display = "block";

      switch (this.type) {
        case "Textbox":
          this.createFontToolbar();
          break;
        case "Brush":
          this.createBrushesToolbar();
          break;
      }
    } else {
      this.painter_drawning_box_property.style.display = "";
    }
    app.graph.setDirtyCanvas(true, false);
  }

  setCanvasSize(new_width, new_height, confirmChange = false) {
    if (
      confirmChange &&
      this.node.isInputConnected(0) &&
      this.node.LS_Cls.LS_Painters.settings.pipingSettings.pipingChangeSize &&
      (new_width !== this.currentCanvasSize.width ||
        new_height !== this.currentCanvasSize.height)
    ) {
      if (confirm("Disable change size piping?")) {
        this.canvas.wrapperEl.querySelector(
          ".pipingChangeSize_checkbox"
        ).checked = false;
        this.node.LS_Cls.LS_Painters.settings.pipingSettings.pipingChangeSize = false;
        this.node.LS_Cls.LS_Save();
      }
    }

    resizeCanvas(this.node, {
      width: new_width,
      height: new_height,
    });

    this.currentCanvasSize = { width: new_width, height: new_height };
    this.node.LS_Cls.LS_Painters.settings["currentCanvasSize"] =
      this.currentCanvasSize;
    this.node.title = `${this.node.type} - ${new_width}x${new_height}`;
    this.canvas.renderAll();
    app.graph.setDirtyCanvas(true, false);
    this.node.onResize();
    this.node.LS_Cls.LS_Save();
  }

  setDefaultValuesInputs() {
    if (+this.strokeWidth.value < 1) {
      this.strokeWidth.max = 150;
      this.strokeWidth.min = 0;
      this.strokeWidth.step = 1;
      this.strokeWidth.value = 5;
    }
  }

  bindEvents() {
    // Button tools select
    this.painter_shapes_box.onclick = (e) => {
      let target = e.target,
        currentTarget = target.dataset?.shape;
      if (currentTarget) {
        this.type = currentTarget;

        // Set default brush width if width < 1 (for fabricjs)
        this.setDefaultValuesInputs();

        switch (currentTarget) {
          case "Erase":
            this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas);
            this.changePropertyBrush(currentTarget);
            this.canvas.isDrawingMode = true;
            this.drawning = true;
            break;
          case "Brush":
            this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
            this.changePropertyBrush(currentTarget);
            this.canvas.isDrawingMode = true;
            this.drawning = true;
            break;
          case "Image":
            this.bgImageFile.func = (img) => {
              let img_ = img
                .set({
                  left: 0,
                  top: 0,
                  angle: 0,
                  strokeWidth: 1,
                })
                .scale(0.3);
              this.canvas.add(img_).renderAll();
              this.uploadPaintFile(this.node.name);
              this.bgImageFile.value = "";
            };
            this.bgImageFile.click();
            this.canvas.isDrawingMode = false;
            this.drawning = false;
            break;
          case "Textbox":
            let textbox = new fabric.Textbox("Text here", {
              fontFamily: "Arial",
              stroke: toRGBA(
                this.strokeColor.value,
                this.strokeColorTransparent.value
              ),
              fill: toRGBA(
                this.fillColor.value,
                this.fillColorTransparent.value
              ),
              strokeWidth: 1,
            });
            this.strokeWidth.value = +textbox.strokeWidth;
            this.canvas.add(textbox).setActiveObject(textbox);
            this.canvas.isDrawingMode = false;
            this.drawning = false;
            break;
          default:
            this.canvas.isDrawingMode = false;
            this.drawning = true;
            break;
        }

        this.selectPropertyToolbar(this.type);
        this.setActiveElement(target, this.painter_shapes_box);
      }
    };

    // Button Mode select
    this.change_mode.onclick = (e) => this.changeMode(e);

    // Buttons Lock events
    const stackPositionObjects = (tool, target) => {
      let a_object = this.canvas.getActiveObject();
      if (tool) {
        switch (tool) {
          case "zpos_BringForward":
            this.canvas.bringForward(a_object);
            break;
          case "zpos_BringToFront":
            this.canvas.bringToFront(a_object);
            break;
          case "zpos_SendToBack":
            this.canvas.sendToBack(a_object);
            break;
          case "zpos_SendBackwards":
            this.canvas.sendBackwards(a_object);
            break;
          case "zpos_BringFrontSelected":
            this.bringFrontSelected = !this.bringFrontSelected;
            target.classList.toggle("active");
            break;
        }
        this.canvas.renderAll();
      }
    };

    // Manipulation box events
    this.manipulation_box.onclick = (e) => {
      let target = e.target,
        listButtons = [
          ...Object.keys(this.locks),
          "zpos_BringForward",
          "zpos_BringToFront",
          "zpos_SendToBack",
          "zpos_SendBackwards",
          "zpos_BringFrontSelected",
        ],
        index = listButtons.indexOf(target.id);
      if (index != -1) {
        if (
          listButtons[index].includes("_Send") ||
          listButtons[index].includes("_Bring")
        ) {
          stackPositionObjects(listButtons[index], target);
        } else {
          let buttonSel = listButtons[index];
          this.locks[buttonSel] = !this.locks[buttonSel];
          target.classList.toggle("active");
        }
      }
    };

    // Drawning box property box events
    this.getActiveStyle = (styleName, object) => {
      object = object || this.canvas.getActiveObject();
      if (!object) return "";

      return object.getSelectionStyles && object.isEditing
        ? object.getSelectionStyles()[styleName] || ""
        : object[styleName] || "";
    };

    this.setActiveStyle = (styleName, value, object) => {
      object = object || this.canvas.getActiveObject();
      if (!object) return;

      if (object.setSelectionStyles && object.isEditing) {
        var style = {};
        style[styleName] = value;
        object.setSelectionStyles(style);
        object.setCoords();
      } else {
        object.set(styleName, value);
      }

      object.setCoords();
      this.canvas.requestRenderAll();
    };

    this.painter_drawning_box_property.onclick = async (e) => {
      const listButtonsStyles = [
        "prop_fontStyle",
        "prop_fontWeight",
        "prop_underline",
        "prop_brushDefault",
        // Symmetry
        "prop_BrushMyPaint",
        "prop_BrushSymmetry",
        "prop_symmetry_",
      ];

      let { target, currentTarget } = e;
      while (target.tagName !== "BUTTON") {
        target = target.parentElement;
        if (!target || target === currentTarget) return;
      }

      const index = listButtonsStyles.indexOf(target.dataset.prop);
      if (index != -1) {
        if (listButtonsStyles[index].includes("prop_")) {
          const buttonSelStyle = listButtonsStyles[index].replace("prop_", ""),
            activeOb = this.canvas.getActiveObject();

          if (activeOb?.type === "textbox") {
            switch (buttonSelStyle) {
              case "fontWeight":
                if (this.getActiveStyle("fontWeight") == "bold") {
                  this.setActiveStyle(buttonSelStyle, "");
                  target.classList.remove("active");
                } else {
                  this.setActiveStyle(buttonSelStyle, "bold");
                  target.classList.add("active");
                }
                break;
              case "fontStyle":
                if (this.getActiveStyle("fontStyle") == "italic") {
                  this.setActiveStyle(buttonSelStyle, "");
                  target.classList.remove("active");
                } else {
                  this.setActiveStyle(buttonSelStyle, "italic");
                  target.classList.add("active");
                }
                break;
              case "underline":
                if (Boolean(this.getActiveStyle("underline"))) {
                  this.setActiveStyle("underline", false);
                  target.classList.remove("active");
                } else {
                  this.setActiveStyle("underline", true);
                  target.classList.add("active");
                }

                this.fillColorTransparent.value = "1.0";
                this.setActiveStyle("fill", toRGBA(this.fillColor.value));
                break;
            }
          }

          // Default brush
          if (target.parentElement?.classList.contains("property_brushesBox")) {
            Array.from(target.parentElement.children).forEach((b) =>
              b.classList.remove("active")
            );

            this.canvas.isDrawingMode = true;
            this.drawning = true;
            this.type = buttonSelStyle;

            // Symmetry & MyPaint
            if (
              buttonSelStyle === "BrushSymmetry" ||
              buttonSelStyle === "BrushMyPaint"
            ) {
              // BrushMyPaint
              if (this.type === "BrushMyPaint") {
                this.MyBrushPaintManager = new MyPaintManager(this);
                await this.MyBrushPaintManager.createElements();

                this.canvas.freeDrawingBrush = new fabric.MyBrushPaintSymmetry(
                  this.canvas,
                  this.MyBrushPaintManager.range_brush_pressure,
                  this.MyBrushPaintManager.currentBrushSettings,
                  this
                );
              } // end BrushMyPaint

              // BrushSymmetry fabricjs
              if (this.type === "BrushSymmetry") {
                this.setDefaultValuesInputs();
                this.canvas.freeDrawingBrush = new fabric.SymmetryBrush(
                  this.canvas
                );
              } // end BrushSymmetry fabricjs

              if (this.symmetryBrushOptionsCopy)
                this.canvas.freeDrawingBrush._options =
                  this.symmetryBrushOptionsCopy;

              if (this.property_brushesSecondBox)
                this.createToolbarOptions(this.type);

              // Set options brush
              this.changePropertyBrush(this.type);
              this.setActiveElement(target, this.painter_shapes_box);
            }
          }
        }
      }

      // Second toolbar options
      if (
        target.parentElement?.classList.contains("property_brushesSecondBox")
      ) {
        const options = this.canvas.freeDrawingBrush?._options;
        if (options && target.dataset.prop?.includes("prop_symmetry_")) {
          const optionsKeys = Object.keys(options);
          const optionKeyChange = optionsKeys[target.optindex];

          options[optionKeyChange].enable = !options[optionKeyChange].enable;
          this.symmetryBrushOptionsCopy = this.canvas.freeDrawingBrush._options;
          target.classList.toggle("active");
        }
      }
    };
    // Event input bgcolor
    this.reset_set_bg = () => {
      this.canvas.setBackgroundImage(null);
      this.canvas.backgroundColor = this.bgColor.value;
      this.canvas.renderAll();
    };

    const fileReaderFunc = (e, func) => {
      let file = e.target.files[0],
        reader = new FileReader();

      reader.onload = (f) => {
        let data = f.target.result;
        fabric.Image.fromURL(data, (img) => func(img));
      };
      reader.readAsDataURL(file);
    };

    this.bgColor.oninput = this.reset_set_bg;

    // Event input bg image
    this.bgImageFile.onchange = (e) => {
      fileReaderFunc(e, this.bgImageFile.func);
    };

    this.painter_bg_setting.onclick = (e) => {
      let target = e.target;
      if (target.hasAttribute("bgImage")) {
        let typeEvent = target.getAttribute("bgImage");
        switch (typeEvent) {
          case "img_load":
            this.bgImageFile.func = (img) => {
              if (confirm("Change canvas size equal image?")) {
                this.setCanvasSize(img.width, img.height, true);
              }

              this.canvas.setBackgroundImage(
                img,
                () => {
                  this.canvas.renderAll();
                  this.uploadPaintFile(this.node.name);
                  this.bgImageFile.value = "";
                },
                {
                  scaleX: this.canvas.width / img.width,
                  scaleY: this.canvas.height / img.height,
                  strokeWidth: 0,
                }
              );
            };
            this.bgImageFile.click();
            break;
          case "img_reset":
            this.reset_set_bg();
            break;
        }
      }
    };

    // Settings
    this.buttonSetCanvasSize.addEventListener("click", () => {
      function checkSized(prop = "", defaultVal = 512) {
        let inputSize;
        let correct = false;
        while (!correct) {
          inputSize = +prompt(`Enter canvas ${prop}:`, defaultVal);
          if (
            Number(inputSize) === inputSize &&
            inputSize % 1 === 0 &&
            inputSize > 0
          ) {
            return inputSize;
          }
          alert(`[${prop}] Invalid number "${inputSize}" or <=0!`);
        }
      }

      let width = checkSized("width", this.currentCanvasSize.width),
        height = checkSized("height", this.currentCanvasSize.height);

      this.setCanvasSize(width, height, true);
      this.uploadPaintFile(this.node.name);
    });

    // History undo, redo
    function showURModal() {
      if (this.type === "BrushMyPaint") {
        makeModal({
          title: "Info",
          text: "Undo/Redo not avaibles in MyPaint 😞!",
          stylePos: "absolute",
          parent: this.canvas.wrapperEl,
        });
        return false;
      }
      return true;
    }

    this.undo_button.onclick = (e) => {
      if (!showURModal.call(this)) return;
      this.undo();
    };

    this.redo_button.onclick = (e) => {
      if (!showURModal.call(this)) return;
      this.redo();
    };

    // Event inputs stroke, fill colors and transparent
    this.strokeColorTransparent.oninput =
      this.strokeColor.oninput =
      this.fillColor.oninput =
      this.fillColorTransparent.oninput =
        () => {
          if (
            [
              "Brush",
              "Textbox",
              "BrushMyPaint",
              "BrushSymmetry",
              "Image",
              "Erase",
            ].includes(this.type) ||
            !this.drawning
          ) {
            this.changePropertyBrush(this.type);
          }
        };

    this.strokeColorTransparent.onchange =
      this.strokeColor.onchange =
      this.fillColor.onchange =
      this.fillColorTransparent.onchange =
        () => {
          if (this.canvas.getActiveObject()) {
            this.uploadPaintFile(this.node.name);
          }
        };

    this.bgColor.onchange = () => this.uploadPaintFile(this.node.name);

    // Event change stroke and erase width
    this.eraseWidth.onchange = () => {
      if (["Erase"].includes(this.type) || !this.drawning) {
        this.changePropertyBrush(this.type);
      }
    };

    this.strokeWidth.onchange = () => {
      if (
        ["Brush", "BrushMyPaint", "BrushSymmetry", "Textbox", "Image"].includes(
          this.type
        ) ||
        !this.drawning
      ) {
        this.changePropertyBrush(this.type);
      }

      if (this.canvas.getActiveObject()) {
        this.uploadPaintFile(this.node.name);
      }
    };

    this.setInputsStyleObject = () => {
      let targets = this.canvas.getActiveObjects();
      if (!targets || targets.length == 0) return;

      // Selected tools
      const setProps = (style, check) => {
        const propEl = this.painter_drawning_box_property.querySelector(
          `#prop_${style}`
        );

        if (propEl) propEl.classList[check ? "remove" : "add"]("active");
      };

      targets.forEach((target) => {
        // MyPaintLib not valid change color and stroke (only borders) in selection mode it type texture
        if (target?.mypaintlib) return;

        if (target.type == "textbox") {
          setProps(
            "fontWeight",
            this.getActiveStyle("fontWeight", target) == "normal"
          );
          setProps(
            "fontStyle",
            this.getActiveStyle("fontStyle", target) == "normal"
          );
          setProps(
            "underline",
            Boolean(this.getActiveStyle("underline", target)) == false
          );
        }

        if (
          !this.drawning &&
          !["Erase", "Brush", "BrushMyPaint", "BrushSymmetry"].includes(
            this.type
          )
        ) {
          this.strokeWidth.value = parseInt(
            this.getActiveStyle("strokeWidth", target),
            10
          );

          let { color: strokeColor, alpha: alpha_stroke } = getColorHEX(
              this.getActiveStyle("stroke", target)
            ),
            { color: fillColor, alpha: alpha_fill } = getColorHEX(
              this.getActiveStyle("fill", target)
            );

          this.strokeColor.value = strokeColor;
          this.strokeColorTransparent.value = alpha_stroke;

          this.fillColor.value = fillColor;
          this.fillColorTransparent.value = alpha_fill;
        }
      });
      this.canvas.renderAll();
    };

    // ----- Canvas Events -----
    this.canvas.on({
      "selection:created": (o) => {
        this.setInputsStyleObject();
      },
      "selection:updated": (o) => {
        this.setInputsStyleObject();
      },
      // Mouse button down event
      "mouse:down": (o) => {
        if (!this.canvas.isDrawingMode && this.bringFrontSelected)
          this.canvas.bringToFront(this.canvas.getActiveObject());

        this.canvas.isDrawingMode = this.drawning;
        if (!this.canvas.isDrawingMode) {
          // New group when manipulated group mypaint
          if (this.type === "BrushMyPaint") {
            this.canvas.freeDrawingBrush?.newGroup();
          }
          return;
        }

        if (
          ["Brush", "Erase", "BrushMyPaint", "BrushSymmetry"].includes(
            this.type
          )
        )
          return;

        if (this.type != "Textbox") {
          let { x: left, y: top } = this.canvas.getPointer(o.e),
            colors = ["red", "blue", "green", "yellow", "purple", "orange"],
            strokeWidth = +this.strokeWidth.value,
            stroke =
              strokeWidth == 0
                ? "transparent"
                : toRGBA(
                    this.strokeColor.value,
                    this.strokeColorTransparent.value
                  ) || colors[Math.floor(Math.random() * colors.length)],
            fill = toRGBA(
              this.fillColor.value,
              this.fillColorTransparent.value
            ),
            shape = this.shapeCreate({
              type: this.type,
              left,
              top,
              stroke,
              fill,
              strokeWidth,
              points: [left, top, left, top],
            });

          this.originX = left;
          this.originY = top;

          if (shape) {
            this.canvas.add(shape).renderAll().setActiveObject(shape);
          }
        }
      },

      // Mouse move event
      "mouse:move": (o) => {
        if (!this.drawning) {
          try {
            let activeObjManipul = this.canvas.getActiveObject();
            activeObjManipul.hasControls = true;
            activeObjManipul.lockScalingX = this.locks.lockScalingX;
            activeObjManipul.lockScalingY = this.locks.lockScalingY;
            activeObjManipul.lockRotation = this.locks.lockRotation;

            if (!activeObjManipul.isEditing) {
              activeObjManipul.lockMovementX = this.locks.lockMovementX;
              activeObjManipul.lockMovementY = this.locks.lockMovementY;
            }
          } catch (e) {}
        }
        if (!this.canvas.isDrawingMode) {
          return;
        }

        if (
          ["Brush", "Erase", "BrushMyPaint", "BrushSymmetry"].includes(
            this.type
          )
        )
          return;

        let pointer = this.canvas.getPointer(o.e),
          activeObj = this.canvas.getActiveObject();

        if (!activeObj) return;

        if (this.originX > pointer.x) {
          activeObj.set({ left: pointer.x });
        }
        if (this.originY > pointer.y) {
          activeObj.set({ top: pointer.y });
        }

        if (this.type == "Circle") {
          let radius =
            Math.max(
              Math.abs(this.originY - pointer.y),
              Math.abs(this.originX - pointer.x)
            ) / 2;
          if (radius > activeObj.strokeWidth)
            radius -= activeObj.strokeWidth / 2;
          activeObj.set({ radius: radius });
        } else if (this.type == "Line") {
          activeObj.set({ x2: pointer.x, y2: pointer.y });
        } else {
          activeObj.set({ width: Math.abs(this.originX - pointer.x) });
          activeObj.set({ height: Math.abs(this.originY - pointer.y) });
        }

        this.canvas.renderAll();
      },

      // Mouse button up event
      "mouse:up": (o) => {
        this.canvas._objects.forEach((object) => {
          if (!object.hasOwnProperty("controls")) {
            object.controls = {
              ...object.controls,
              removeControl: new fabric.Control({
                x: 0.5,
                y: -0.5,
                offsetY: -16,
                offsetX: 16,
                cursorStyle: "pointer",
                mouseUpHandler: removeObject.bind(this),
                render: renderIcon(removeImg),
                cornerSize: 24,
              }),
            };
          }
        });

        this.canvas.getActiveObject()?.setCoords();
        this.canvas.getActiveObjects()?.forEach((a) => a.setCoords());

        if (
          ![
            "Brush",
            "Erase",
            "BrushMyPaint",
            "BrushSymmetry",
            "Image",
            "Textbox",
          ].includes(this.type)
        )
          this.canvas.isDrawingMode = false;

        // Skip BrushMyPaint mouseup is empty objects array, loading canvas as image, upload when object add to canvas
        if (!["BrushMyPaint"].includes(this.type)) {
          this.addToHistory();
          this.canvas.renderAll();
          this.uploadPaintFile(this.node.name);
        }
      },

      "object:added": (o) => {},

      // Object moving event
      "object:moving": (o) => {
        this.canvas.isDrawingMode = false;
      },

      // Object modify event
      "object:modified": (o) => {
        this.canvas.isDrawingMode = false;

        if (this.position_sizes_box) {
          this.getPositionAndSize(o.target);
        }

        this.canvas.renderAll();
        this.uploadPaintFile(this.node.name);
      },
    });
    // ----- Canvas Events -----
  }

  addToHistory() {
    // Undo / rendo
    const objs = this.canvas.toJSON(["mypaintlib"]);

    if (this.undo_history.length > this.max_history_steps) {
      this.undo_history.shift();
      console.log(
        `[Info ${this.node.name}]: History saving step limit reached! Limit steps = ${this.max_history_steps}.`
      );
    }
    this.undo_history.push(objs);
    this.redo_history = [];
    if (this.undo_history.length) {
      this.undo_button.disabled = false;
    }
  }

  // Save canvas data to localStorage or JSON
  canvasSaveSettingsPainter() {
    if (!this.node.LS_Cls.LS_Painters.settings.lsSavePainter) return;

    try {
      const data = this.canvas.toJSON(["mypaintlib"]);
      if (
        this.node.LS_Cls.LS_Painters &&
        !isEmptyObject(this.node.LS_Cls.LS_Painters)
      ) {
        this.node.LS_Cls.LS_Painters.canvas_settings = painters_settings_json
          ? data
          : JSON.stringify(data);

        this.node.LS_Cls.LS_Painters.settings["currentCanvasSize"] =
          this.currentCanvasSize;

        this.node.LS_Cls.LS_Save();
      }
    } catch (e) {
      console.error(e);
    }
  }

  setCanvasLoadData(data) {
    const obj_data =
      typeof data === "string" || data instanceof String
        ? JSON.parse(data)
        : data;

    const canvas_settings = data.canvas_settings;
    const settings = data.settings;

    this.canvas.loadFromJSON(canvas_settings, () => {
      this.canvas.renderAll();
      this.uploadPaintFile(this.node.name);
      this.bgColor.value = getColorHEX(data.background).color || "";
    });
  }

  undoRedoLoadData(data) {
    this.canvas.loadFromJSON(data, () => {
      this.canvas.renderAll();
      this.bgColor.value = getColorHEX(data.background).color || "";
    });
  }

  // Load canvas data from localStorage or JSON
  canvasLoadSettingPainter() {
    try {
      if (
        this.node.LS_Cls.LS_Painters &&
        this.node.LS_Cls.LS_Painters.hasOwnProperty("canvas_settings")
      ) {
        const data =
          typeof this.node.LS_Cls.LS_Painters === "string" ||
          this.node.LS_Cls.LS_Painters instanceof String
            ? JSON.parse(this.node.LS_Cls.LS_Painters)
            : this.node.LS_Cls.LS_Painters;
        this.setCanvasLoadData(data);
        this.addToHistory();
      }
    } catch (e) {
      console.error(e);
    }
  }

  undo() {
    if (this.undo_history.length > 0) {
      this.undo_button.disabled = false;
      this.redo_button.disabled = false;
      this.redo_history.push(this.undo_history.pop());

      const content = this.undo_history[this.undo_history.length - 1];
      this.undoRedoLoadData(content);
      this.canvas.renderAll();
    } else {
      this.undo_button.disabled = true;
    }
  }

  redo() {
    if (this.redo_history.length > 0) {
      this.redo_button.disabled = false;
      this.undo_button.disabled = false;

      const content = this.redo_history.pop();
      this.undo_history.push(content);
      this.undoRedoLoadData(content);
      this.canvas.renderAll();
    } else {
      this.redo_button.disabled = true;
    }
  }

  pastAsBackground(image, options = {}) {
    if (!image) return;

    if (confirm("Resize Painter node canvas?")) {
      this.setCanvasSize(image.naturalWidth, image.naturalHeight);
    }

    const img_ = new fabric.Image(image, {
      left: 0,
      top: 0,
      angle: 0,
      strokeWidth: 1,
      ...options,
    });

    this.canvas.setBackgroundImage(
      img_,
      () => {
        this.canvas.renderAll();
        this.uploadPaintFile(this.node.name);
      },
      {
        scaleX: this.canvas.width / img_.width,
        scaleY: this.canvas.height / img_.height,
        strokeWidth: 0,
      }
    );
  }

  pastAsImage(image, options = {}) {
    if (!image) return;

    const painterSize = confirm("Resize Painter node canvas?");
    if (painterSize) {
      this.setCanvasSize(image.naturalWidth, image.naturalHeight);
    }

    const img_ = new fabric.Image(image, {
      left: 0,
      top: 0,
      angle: 0,
      strokeWidth: 1,
      ...options,
    });

    if (!painterSize && confirm("Stretch image to fit canvas Painter node?")) {
      img_.scaleToHeight(this.currentCanvasSize.width);
      img_.scaleToWidth(this.currentCanvasSize.height);
    }

    this.canvas.add(img_).renderAll();
    this.uploadPaintFile(this.node.name);
    this.canvas.isDrawingMode = false;
    this.drawning = false;
    this.type = "Image";
    this.setActiveElement(
      this.painter_shapes_box.querySelector("[data-shape=Image]"),
      this.painter_shapes_box
    );
  }

  async addImageToCanvas(image, options = {}) {
    async function uploadFile(file) {
      try {
        const body = new FormData();
        body.append("image", file);

        const resp = await api.fetchApi("/upload/image", {
          method: "POST",
          body,
        });

        if (resp.status === 200) {
          const data = await resp.json();
          let path = data.name;
          if (data.subfolder) path = data.subfolder + "/" + path;

          const img = await new Promise((resolve, reject) => {
            let img = new Image();
            img.onload = () => resolve(img);
            img.onerror = (e) => resolve(new Error("Image not load!"));

            let name = path;
            let folder_separator = name.lastIndexOf("/");
            let subfolder = "";

            if (folder_separator > -1) {
              subfolder = name.substring(0, folder_separator);
              name = name.substring(folder_separator + 1);
            }

            img.src = api.apiURL(
              `/view?filename=${encodeURIComponent(
                name
              )}&type=input&subfolder=${subfolder}${app.getPreviewFormatParam()}${app.getRandParam()}`
            );
          });

          return img;
        } else {
          console.log(`${resp.status} - ${resp.statusText}`);
          return resp.statusText;
        }
      } catch (err) {
        console.log(err);
        return err;
      }
    }

    image = await uploadFile(image);

    if (image?.tagName !== "IMG") {
      createWindowModal({
        textTitle: "ERROR",
        textBody: [
          makeElement("div", {
            innerHTML: image ?? "Error load image",
          }),
        ],
        ...THEMES_MODAL_WINDOW.error,
        options: {
          auto: { autohide: true, autoshow: true, autoremove: true },
          close: { showClose: false },
          parent: this.canvas.wrapperEl,
        },
      });
      return;
    }

    if (confirm("Past as background?")) {
      this.pastAsBackground(image, options);
    } else if (confirm("Past as image?")) {
      this.pastAsImage(image, options);
    }
  }

  showImage(name) {
    let img = new Image();
    img.onload = () => {
      this.node.imgs = [img];
      app.graph.setDirtyCanvas(true);
    };

    let folder_separator = name.lastIndexOf("/");
    let subfolder = "";
    if (folder_separator > -1) {
      subfolder = name.substring(0, folder_separator);
      name = name.substring(folder_separator + 1);
    }

    img.src = api.apiURL(
      `/view?filename=${name}&type=input&subfolder=${subfolder}${app.getPreviewFormatParam()}&${new Date().getTime()}`
    );
    this.node.setSizeForImage?.();
  }

  async uploadPaintFile(fileName) {
    // Upload paint to temp folder ComfyUI
    let activeObj = null;
    if (!this.canvas.isDrawingMode) {
      activeObj = this.canvas.getActiveObject();

      if (activeObj) {
        activeObj.hasControls = false;
        activeObj.hasBorders = false;
        this.canvas.getActiveObjects().forEach((a_obs) => {
          a_obs.hasControls = false;
          a_obs.hasBorders = false;
        });
        this.canvas.renderAll();
      }
    }

    await new Promise((res) => {
      const uploadFile = async (blobFile) => {
        try {
          const resp = await fetch("/upload/image", {
            method: "POST",
            body: blobFile,
          });

          if (resp.status === 200) {
            const data = await resp.json();

            if (!this.image.options.values.includes(data.name)) {
              this.image.options.values.push(data.name);
            }

            this.image.value = data.name;
            this.showImage(data.name);

            if (activeObj && !this.drawning) {
              activeObj.hasControls = true;
              activeObj.hasBorders = true;

              this.canvas.getActiveObjects().forEach((a_obs) => {
                a_obs.hasControls = true;
                a_obs.hasBorders = true;
              });
              this.canvas.renderAll();
            }
            this.canvasSaveSettingsPainter();
            res(true);
          } else {
            alert(resp.status + " - " + resp.statusText);
          }
        } catch (error) {
          console.log(error);
        }
      };

      this.canvas.lowerCanvasEl.toBlob(function (blob) {
        let formData = new FormData();
        formData.append("image", blob, fileName);
        formData.append("overwrite", "true");
        //formData.append("type", "temp");
        uploadFile(formData);
      }, "image/png");
    });

    // - end

    const callb = this.node.callback,
      self = this;
    this.image.callback = function () {
      self.image.value = self.node.name;
      if (callb) {
        return callb.apply(this, arguments);
      }
    };
  }
}
// ================= END CLASS PAINTER ================

// ================= CREATE PAINTER WIDGET ============
function PainterWidget(node, inputName, inputData, app) {
  node.name = inputName;
  const widget = {
    type: "painter_widget",
    name: `w${inputName}`,
    callback: () => {},
    draw: function (ctx, _, widgetWidth, y, widgetHeight) {
      const margin = 10,
        left_offset = 8,
        top_offset = 50,
        visible = app.canvas.ds.scale > 0.6 && this.type === "painter_widget",
        w = widgetWidth - margin * 2 - 80,
        clientRectBound = ctx.canvas.getBoundingClientRect(),
        transform = new DOMMatrix()
          .scaleSelf(
            clientRectBound.width / ctx.canvas.width,
            clientRectBound.height / ctx.canvas.height
          )
          .multiplySelf(ctx.getTransform())
          .translateSelf(margin, margin + y),
        scale = new DOMMatrix().scaleSelf(transform.a, transform.d);

      let aspect_ratio = 1;
      if (node?.imgs && typeof node.imgs !== undefined) {
        aspect_ratio = node.imgs[0].naturalHeight / node.imgs[0].naturalWidth;
      }

      Object.assign(this.painter_wrap.style, {
        left: `${
          transform.a * margin * left_offset +
          transform.e +
          clientRectBound.left
        }px`,
        top: `${
          transform.d + transform.f + top_offset + clientRectBound.top
        }px`,
        width: `${w * transform.a}px`,
        height: `${w * transform.d}px`,
        position: "absolute",
        zIndex: app.graph._nodes.indexOf(node),
      });

      Object.assign(this.painter_wrap.children[0].style, {
        transformOrigin: "0 0",
        transform: scale,
        width: w + "px",
        height: w * aspect_ratio + "px",
      });

      Object.assign(this.painter_wrap.children[1].style, {
        transformOrigin: "0 0",
        transform: scale,
        width: w + "px",
        height: w * aspect_ratio + "px",
      });

      Array.from(
        this.painter_wrap.children[2].querySelectorAll(
          "input, button, input:after, span, div.painter_drawning_box"
        )
      ).forEach((element) => {
        if (element.type == "number") {
          Object.assign(element.style, {
            width: `${40 * transform.a}px`,
            height: `${21 * transform.d}px`,
            fontSize: `${transform.d * 10.0}px`,
          });
        } else if (element.tagName == "SPAN") {
          // NOPE
        } else if (element.tagName == "DIV") {
          Object.assign(element.style, {
            width: `${88 * transform.a}px`,
            left: `${-90 * transform.a}px`,
          });
        } else {
          let sizesEl = { w: 25, h: 25, fs: 10 };

          if (element?.customSize) {
            sizesEl = element.customSize;
          }

          if (element.id.includes("lock")) sizesEl = { w: 75, h: 15, fs: 10 };
          if (element.id.includes("zpos")) sizesEl = { w: 80, h: 15, fs: 7 };
          if (
            ["painter_change_mode", "painter_canvas_size"].includes(element.id)
          )
            sizesEl.w = 75;
          if (element.hasAttribute("painter_object"))
            sizesEl = { w: 58, h: 16, fs: 10 };
          if (element.hasAttribute("bgImage"))
            sizesEl = { w: 60, h: 20, fs: 10 };

          Object.assign(element.style, {
            cursor: "pointer",
            width: `${sizesEl.w * transform.a}px`,
            height: `${sizesEl.h * transform.d}px`,
            fontSize: `${transform.d * sizesEl.fs}px`,
          });
        }
      });
      this.painter_wrap.hidden = !visible;
    },
  };

  // Fabric canvas
  let canvasPainter = document.createElement("canvas");
  node.painter = new Painter(node, canvasPainter);

  node.painter.canvas.setWidth(node.painter.currentCanvasSize.width);
  node.painter.canvas.setHeight(node.painter.currentCanvasSize.height);

  resizeCanvas(node, node.painter.canvas);

  widget.painter_wrap = node.painter.canvas.wrapperEl;
  widget.parent = node;

  node.painter.image.value = node.name;

  node.painter.propertiesLS();
  node.painter.makeElements();

  document.body.appendChild(widget.painter_wrap);

  node.addWidget("button", "Clear Canvas", "clear_painer", () => {
    node.painter.list_objects_panel__items.innerHTML = "";
    node.painter.clearCanvas();
  });

  // Add customWidget to node
  node.addCustomWidget(widget);

  node.onRemoved = () => {
    //this.LS_Cls.removeData();

    // When removing this node we need to remove the input from the DOM
    for (let y in node.widgets) {
      if (node.widgets[y].painter_wrap) {
        node.widgets[y].painter_wrap.remove();
      }
    }
  };

  widget.onRemove = () => {
    widget.painter_wrap?.remove();
  };

  node.onResize = function () {
    let [w, h] = this.size;
    let aspect_ratio = 1;

    if (node?.imgs && typeof this.imgs !== undefined) {
      aspect_ratio = this.imgs[0].naturalHeight / this.imgs[0].naturalWidth;
    }
    let buffer = 90;

    if (w > this.painter.maxNodeSize) w = w - (w - this.painter.maxNodeSize);
    if (w < 600) w = 600;

    h = w * aspect_ratio + buffer;

    this.size = [w, h];
  };

  node.onDrawBackground = function (ctx) {
    if (!this.flags.collapsed) {
      node.painter.canvas.wrapperEl.hidden = false;
      if (this.imgs && this.imgs.length) {
        if (app.canvas.ds.scale > 0.8) {
          let [dw, dh] = this.size;

          let w = this.imgs[0].naturalWidth;
          let h = this.imgs[0].naturalHeight;

          const scaleX = dw / w;
          const scaleY = dh / h;
          const scale = Math.min(scaleX, scaleY, 1);

          w *= scale / 8;
          h *= scale / 8;

          let x = 5;
          let y = dh - h - 5;

          ctx.drawImage(this.imgs[0], x, y, w, h);
          ctx.font = "10px serif";
          ctx.strokeStyle = "white";
          ctx.strokeRect(x, y, w, h);
          ctx.fillStyle = "rgba(255,255,255,0.7)";
          ctx.fillText("Mask", w / 2, dh - 10);
        }
      }
    } else {
      node.painter.canvas.wrapperEl.hidden = true;
    }
  };

  node.onConnectInput = () => console.log(`Connected input ${node.name}`);

  // DragDrop past image
  node.onDragOver = function (e) {
    if (e.dataTransfer && e.dataTransfer.items) {
      const image = [...e.dataTransfer.items].find((f) => f.kind === "file");
      return !!image;
    }

    return false;
  };

  node.onDragDrop = function (e) {
    let handled = false;
    for (const file of e.dataTransfer.files) {
      if (file.type.startsWith("image/")) {
        node.painter.addImageToCanvas(file);
        handled = true;
      }
    }

    return handled;
  };
  // end - DragDrop past image

  // Get piping image input, when node executing...
  api.addEventListener("alekpet_get_image", async ({ detail }) => {
    const { images, unique_id } = detail;

    if (
      !images.length ||
      !node.LS_Cls.LS_Painters.settings.pipingSettings.pipingUpdateImage ||
      +unique_id !== node.id
    ) {
      return;
    }

    await new Promise((res) => {
      const img = new Image();
      img.onload = () => {
        // Change size piping input image
        const { naturalWidth: w, naturalHeight: h } = img;
        if (
          node.LS_Cls.LS_Painters.settings.pipingSettings.pipingChangeSize &&
          (w !== node.painter.currentCanvasSize.width ||
            h !== node.painter.currentCanvasSize.height)
        ) {
          node.painter.setCanvasSize(w, h);
        } else {
          node.title = `${node.type} - ${node.painter.currentCanvasSize.width}x${node.painter.currentCanvasSize.height}`;
        }

        const img_ = new fabric.Image(img, {
          left: 0,
          top: 0,
          angle: 0,
          strokeWidth: 1,
          originX: "left",
          originY: "top",
          pipingImage: true,
        });
        res(img_);
      };
      img.src = images[0];
    })
      .then(async (result) => {
        switch (node.LS_Cls.LS_Painters.settings.pipingSettings.action.name) {
          case "image":
            await new Promise(async (res) => {
              let { scale, sendToBack = true } =
                node.LS_Cls.LS_Painters.settings.pipingSettings.action.options;

              if (typeof scale === "number") result.scale(scale);

              node.painter.canvas.add(result);
              sendToBack && node.painter.canvas.sendToBack(result);
              node.painter.canvas.renderAll();

              if (node.painter.mode) {
                node.painter.viewListObjects(
                  node.painter.list_objects_panel__items
                );
              }

              await node.painter.uploadPaintFile(node.name);
              res(true);
            });
            break;
          case "background":
          default:
            await new Promise((res) => {
              node.painter.canvas.setBackgroundImage(
                result,
                async () => {
                  node.painter.canvas.renderAll();
                  await node.painter.uploadPaintFile(node.name);
                  res(true);
                },
                {
                  scaleX: node.painter.canvas.width / result.width,
                  scaleY: node.painter.canvas.height / result.height,
                  strokeWidth: 0,
                }
              );
            });
        }
      })
      .then(() => {
        api
          .fetchApi("/alekpet/check_canvas_changed", {
            method: "POST",
            body: JSON.stringify({
              unique_id: node.id.toString(),
              is_ok: true,
            }),
          })
          .then((res) => res.json())
          .then((res) =>
            res?.status === "Ok"
              ? console.log(
                  `%cChange canvas ${node.name}: ${res.status}`,
                  "color: green; font-weight: 600;"
                )
              : console.error(`Error change canvas: ${res.status}`)
          )
          .catch((err) => console.error(`Error change canvas: ${err}`));
      });
  });

  app.canvas.onDrawBackground = function () {
    // Draw node isnt fired once the node is off the screen
    // if it goes off screen quickly, the input may not be removed
    // this shifts it off screen so it can be moved back if the node is visible.
    for (let n in app.graph._nodes) {
      const currnode = app.graph._nodes[n];
      for (let w in currnode.widgets) {
        let wid = currnode.widgets[w];
        if (Object.hasOwn(wid, "painter_widget")) {
          wid.painter_wrap.style.left = -8000 + "px";
          wid.painter_wrap.style.position = "absolute";
        }
      }
    }
  };

  app.graph.setDirtyCanvas(true, false);
  node.onResize();

  return { widget: widget };
}
// ================= END CREATE PAINTER WIDGET ============

// ================= CREATE EXTENSION ================

const extensionName = "alekpet.PainterNode";

app.registerExtension({
  name: extensionName,
  async init(app) {
    // Add styles
    addStylesheet("css/painternode/painter_node_styles.css", import.meta.url);

    // Add settings params painter node
    app.ui.settings.addSetting({
      id: `${extensionName}.SaveSettingsJson`,
      name: "🔸 Painter Node",
      defaultValue: false,
      type: (name, sett, val) => {
        const newUI = document.querySelector(".p-dialog-header");
        return makeElement("tr", {
          children: [
            !newUI
              ? makeElement("td", {
                  children: [
                    makeElement("label", {
                      textContent: name,
                      for: convertIdClass(
                        `${extensionName}.save_settings_json_checkbox`
                      ),
                    }),
                  ],
                })
              : "",
            makeElement("td", {
              children: [
                makeElement("label", {
                  style: { display: "block" },
                  textContent: "Save settings to json file: ",
                  for: convertIdClass(
                    `${extensionName}.save_settings_json_checkbox`
                  ),
                  children: [
                    makeElement("input", {
                      id: convertIdClass(
                        `${extensionName}.save_settings_json_checkbox`
                      ),
                      type: "checkbox",
                      checked: val,
                      onchange: (e) => {
                        const checked = !!e.target.checked;
                        painters_settings_json = checked;

                        // Settings all painter nodes save in the JSON or LocalStorage
                        const PainerNodes = app.graph._nodes.filter(
                          (wi) => wi.type == "PainterNode"
                        );

                        if (PainerNodes.length) {
                          PainerNodes.map((n) => {
                            n.LS_Cls.painters_settings_json =
                              painters_settings_json;
                          });
                        }
                        //

                        sett(checked);
                      },
                    }),
                  ],
                }),
                makeElement("button", {
                  textContent: "Managing Data",
                  onclick: () => {
                    app.ui.settings.element.close();
                    new PainterStorageDialog().show(painters_settings_json);
                  },
                  style: {
                    display: "block",
                  },
                }),
              ],
            }),
          ],
        });
      },
    });
  },
  async setup(app) {
    let PainerNode = app.graph._nodes.filter((wi) => wi.type == "PainterNode");

    if (PainerNode.length) {
      PainerNode.map(async (n) => {
        console.log(`Setup PainterNode: ${n.name}`);
        // Resize window
        window.addEventListener("resize", (e) => resizeCanvas(n), false);
      });
    }
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PainterNode") {
      // Create node
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = async function () {
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        const node_title = await this.getTitle();
        const node_id = this.id; // used node id as image name,instead of PainterNode's quantity

        const nodeName = `Paint_${node_id}`;
        const nodeNamePNG = `${nodeName}.png`;

        console.log(`Create PainterNode: ${nodeName}`);

        this.LS_Cls = new LS_Class(nodeNamePNG, painters_settings_json);

        // Find widget update_node and hide him
        for (const w of this.widgets) {
          if (w.name === "update_node") {
            w.type = "converted-widget";
            w.value =
              this.LS_Cls.LS_Painters.settings?.pipingSettings
                ?.pipingUpdateImage ?? true;
            w.computeSize = () => [0, -4];
            if (!w.linkedWidgets) continue;
            for (const l of w.linkedWidgets) {
              l.type = "converted-widget";
              l.computeSize = () => [0, -4];
            }
          }
        }

        await PainterWidget.apply(this, [this, nodeNamePNG, {}, app]);
        await this.LS_Cls.LS_Init(this);
        let painter_ls = this.LS_Cls.LS_Painters;

        const widgetImage = this.widgets.find((w) => w.name == "image");

        if (painter_ls && typeof lsData === "string") {
          painter_ls = JSON.parse(painter_ls);
        }

        if (widgetImage && painter_ls && !isEmptyObject(painter_ls)) {
          // Load settings elements
          this.painter.setValueElementsLS();

          painter_ls.hasOwnProperty("objects_canvas") &&
            delete painter_ls.objects_canvas; // remove old property

          if (painter_ls?.settings?.currentCanvasSize) {
            this.painter.currentCanvasSize =
              painter_ls.settings.currentCanvasSize;

            this.painter.setCanvasSize(
              this.painter.currentCanvasSize.width,
              this.painter.currentCanvasSize.height
            );
          }
          this.painter.canvasLoadSettingPainter();
        }

        this.painter.canvas.renderAll();
        this.painter.uploadPaintFile(nodeNamePNG);
        this.title = `${this.type} - ${this.painter.currentCanvasSize.width}x${this.painter.currentCanvasSize.height}`;

        return r;
      };

      // ExtraMenuOptions
      const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
      nodeType.prototype.getExtraMenuOptions = async function (_, options) {
        getExtraMenuOptions?.apply(this, arguments);
        await this.getTitle();

        const past_index = options.findIndex(
            (m) => m?.content === "Paste (Clipspace)"
          ),
          past = options[past_index];

        if (!!past) {
          // Past as image
          const past_callback = past.callback;
          past.callback = () => {
            past_callback.apply(this, arguments);
            if (!this.imgs.length) return;

            this.painter.pastAsImage(this.imgs[0]);
          };

          // Past as background
          options.splice(past_index + 1, 0, {
            content: "Paste background (Clipspace)",
            callback: () => {
              past_callback.apply(this, arguments);
              if (!this.imgs.length) return;

              this.painter.pastAsBackground(this.imgs[0]);
            },
          });
        }

        const removeIndex = options.findIndex((m) => m?.content === "Remove"),
          removeButton = options[removeIndex];
        if (!!removeButton) {
          const remove_callback = removeButton.callback;
          const self = this;
          removeButton.callback = function () {
            remove_callback.apply(this, arguments);

            if (confirm("Remove storage data?")) {
              self.LS_Cls.removeData();
            }
          };
        }
      };
      // end - ExtraMenuOptions
    }
  },
});
// ================= END CREATE EXTENSION ================
