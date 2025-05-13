/*
 * Title: PainterNode ComflyUI from ControlNet
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { fabric } from "./lib/painternode/fabric.js";
import "./lib/painternode/mybrush.js";
import { svgSymmetryButtons } from "./lib/painternode/brushes.js";
import {
  toRGBA,
  getColorHEX,
  StorageClass,
} from "./lib/painternode/helpers.js";
import { PainterStorageDialog } from "./lib/painternode/dialogs.js";
import { addStylesheet } from "../../scripts/utils.js";
import {
  showHide,
  makeElement,
  makeModal,
  animateClick,
  createWindowModal,
  THEMES_MODAL_WINDOW,
  comfyuiDesktopConfirm,
  comfyuiDesktopPrompt,
  comfyuiDesktopAlert,
} from "./utils.js";
import "./lib/painternode/fontfaceobserver.js";
import { MyPaintManager } from "./lib/painternode/manager_mypaint.js";

// ================= FUNCTIONS ================

const DEBUG = !false;
const extensionName = "alekpet.PainterNode";

// Save settings in JSON file on the extension folder [big data settings includes images] if true else localStorage
let painters_settings_json = JSON.parse(
  localStorage.getItem(`${extensionName}.SaveSettingsJson`, false)
);
//

const removeIcon =
  "data:image/svg+xml,%3Csvg version='1.1' id='Ebene_1' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3C/defs%3E%3Crect x='125.3' y='264.6' width='350.378' height='349.569' style='fill: rgb(237, 0, 0); stroke: rgb(197, 2, 2);' rx='58.194' ry='58.194'%3E%3C/rect%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18' rx='32.772' ry='32.772'%3E%3C/rect%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179' rx='32.772' ry='32.772'%3E%3C/rect%3E%3C/g%3E%3C/svg%3E";

const removeImg = makeElement("img");
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
  const { width, height } =
    sizes ??
    node.painter.storageCls.settings_painter_node.settings.currentCanvasSize;

  node.painter.canvas.setDimensions({
    width: width,
    height: height,
  });

  node.painter.canvas.getElement().width = width;
  node.painter.canvas.getElement().height = height;

  node.painter.canvas.renderAll();
  setTimeout(() => {
    node.onResize();
    app.graph.setDirtyCanvas(true, false);
  }, 1000);
}

const FONTS = {};
const STATES = {
  fontsLoaded: false,
};

async function getLoadedFonts() {
  const getListFonts = async () => {
    const fontFaces = await document.fonts.ready;
    const loadedFonts = [];

    document.fonts.forEach((font) => {
      loadedFonts.push(font.family);
    });

    return [...new Set(loadedFonts)];
  };

  await getListFonts().then((fonts) => {
    fonts.forEach((font) => {
      FONTS[font] = { type: "custom" };
    });
  });
}
// ================= END FUNCTIONS ================

// ================= CLASS PAINTER ================
class Painter {
  constructor(node, canvas) {
    this.node = node;

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

    this.maxNodeSize = 1024;

    this.max_history_steps = 20;
    this.undo_history = [];
    this.redo_history = [];

    this.storageCls = this.node.storageCls;

    this.fonts = {
      Arial: { type: "default" },
      "Times New Roman": { type: "default" },
      Verdana: { type: "default" },
      Georgia: { type: "default" },
      Courier: { type: "default" },
      "Comic Sans MS": { type: "default" },
      Impact: { type: "default" },
      ...FONTS,
    };

    this.bringFrontSelected = true;

    this.history_change = false;
    this.canvas = this.initCanvas(canvas);
    this.image = node.widgets.find((w) => w.name === "image");
    this.image.value = this.node.name;

    const self = this;
    const callb = this.node.callback;

    this.image.callback = function () {
      self.image.value = self.node.name;
      if (callb) {
        return callb.apply(this, arguments);
      }
    };
  }

  async saveSettingsPainterNode() {
    this.canvasSaveSettingsPainter();
    // Save data
    app?.extensionManager?.workflow?.activeWorkflow?.changeTracker?.checkState();

    if (painters_settings_json) await this.node.storageCls.saveData();
  }

  initCanvas(canvasEl) {
    this.canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: true,
      backgroundColor: "transparent",
      width:
        this.storageCls.settings_painter_node.settings.currentCanvasSize.width,
      height:
        this.storageCls.settings_painter_node.settings.currentCanvasSize.height,
      enablePointerEvents: true,
      containerClass: "canvas-container-painter",
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

  makeElements(wrapperPainter) {
    // Main panelpaint box
    this.panelPaintBoxLeft = makeElement("div", {
      class: ["panelPaintBoxLeft"],
    });

    this.panelPaintBoxRight = makeElement("div", {
      class: ["panelPaintBoxRight"],
    });

    const panelPaintBoxRight_options = makeElement("div", {
      class: ["panelPaintBoxRight_options"],
    });

    this.undo_button = makeElement("button", {
      id: "history_undo",
      title: "Undo",
      disabled: true,
      textContent: "⟲",
    });

    this.redo_button = makeElement("button", {
      id: "history_redo",
      title: "Redo",
      disabled: true,
      textContent: "⟳",
    });

    this.painter_history_panel = makeElement("div", {
      class: ["painter_history_panel", "comfy-menu-btns"],
      children: [this.undo_button, this.redo_button],
    });

    this.canvas.wrapperEl.appendChild(this.painter_history_panel);

    this.panelPaintBoxRight.append(
      panelPaintBoxRight_options,
      this.canvas.wrapperEl
    );

    wrapperPainter.append(this.panelPaintBoxLeft, this.panelPaintBoxRight);

    this.manipulation_box = makeElement("div", {
      class: ["painter_manipulation_box"],
      f_name: "Locks",
      style: { display: "none" },
      innerHTML: `<div class="comfy-menu-btns">
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
        </div>`,
    });

    this.painter_drawning_box_property = makeElement("div", {
      class: ["painter_drawning_box_property"],
      style: { display: "flex" },
    });

    this.painter_drawning_box = makeElement("div", {
      class: ["painter_drawning_box"],
      innerHTML: `<div class="painter_mode_box fieldset_box comfy-menu-btns" f_name="Mode">
            <button class="painter_change_mode" title="Enable selection mode">Selection</button>
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
        </div>`,
    });

    this.panelPaintBoxLeft.append(
      this.manipulation_box,
      this.painter_drawning_box_property,
      this.painter_drawning_box
    );

    panelPaintBoxRight_options.append(
      this.manipulation_box,
      this.painter_drawning_box_property
    );

    // Modify in change mode
    this.painter_shapes_box_modify = this.painter_drawning_box.querySelector(
      ".painter_shapes_box_modify"
    );
    this.painter_drawning_elements = this.painter_drawning_box.querySelector(
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
    });
    this.painter_settings_box.append(mainSettingsNode);

    this.change_mode = this.painter_drawning_box.querySelector(
      ".painter_change_mode"
    );
    this.painter_shapes_box = this.painter_drawning_box.querySelector(
      ".painter_shapes_box"
    );
    this.strokeWidth = this.painter_drawning_box.querySelector("#strokeWidth");
    this.eraseWidth = this.painter_drawning_box.querySelector("#eraseWidth");
    this.strokeColor = this.painter_drawning_box.querySelector("#strokeColor");
    this.fillColor = this.painter_drawning_box.querySelector("#fillColor");

    this.list_objects_panel__items = this.painter_drawning_box.querySelector(
      ".list_objects_panel__items"
    );

    this.strokeColorTransparent = this.painter_drawning_box.querySelector(
      "#strokeColorTransparent"
    );
    this.fillColorTransparent = this.painter_drawning_box.querySelector(
      "#fillColorTransparent"
    );

    this.buttonSetCanvasSize = this.painter_drawning_box.querySelector(
      "#painter_canvas_size"
    );

    this.bgColor = this.painter_drawning_box.querySelector("#bgColor");

    this.painter_bg_setting = this.painter_drawning_box.querySelector(
      ".painter_bg_setting"
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
        this.storageCls.settings_painter_node.settings?.pipingSettings
          ?.pipingChangeSize ?? true,
      onchange: (e) => {
        this.storageCls.settings_painter_node.settings.pipingSettings.pipingChangeSize =
          !!e.target.checked;

        this.saveSettingsPainterNode();
      },
    });

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
        this.storageCls.settings_painter_node.settings?.pipingSettings
          ?.pipingUpdateImage ?? true,
      onchange: (e) => {
        const checked = !!e.target.checked;
        this.storageCls.settings_painter_node.settings.pipingSettings.pipingUpdateImage =
          checked;

        // Get hidden widget update_node
        const update_node_widget = this.node.widgets.find(
          (w) => w.name === "update_node"
        );
        update_node_widget.value = checked;
        this.saveSettingsPainterNode();
      },
    });

    labelPipingUpdateImage.append(pipingUpdateImageCheckbox);
    // end - Piping update image

    // === Settings box ===

    // Function click on the radio and show/hide custom settings
    function checkRadioOptionsSelect(currentTarget) {
      custom_options_piping_box.style.display =
        currentTarget.value !== "image" ? "none" : "flex";
    }

    // Radios click
    function radiosClick(e) {
      const { currentTarget } = e;
      checkRadioOptionsSelect.call(this, currentTarget);

      this.storageCls.settings_painter_node.settings.pipingSettings.action.name =
        currentTarget.value;
      this.saveSettingsPainterNode();
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

    // Panel custom_options_piping_box
    const custom_options_piping_box = makeElement("div", {
      class: ["custom_options_piping_box"],
      style:
        "border: 1px solid #0069ff; padding: 6px; display: none; flex-direction: column; gap: 3px; justify-content: center; align-items: flex-end; text-align: right; border-radius: 6px;",
    });

    // Scale option image
    const scale = makeElement("input", {
      type: "number",
      value:
        this.storageCls.settings_painter_node.settings.pipingSettings.action
          .options.scale ?? 1.0,
      min: 0,
      step: 0.01,
      style: "width: 30%;",
      onchange: (e) => {
        e.stopPropagation();
        this.storageCls.settings_painter_node.settings.pipingSettings.action.options.scale =
          +e.currentTarget.value;
        this.saveSettingsPainterNode();
      },
    });

    const scaleLabel = makeElement("label", {
      textContent: "Scale: ",
      title: "Change image size (default: 1)",
      id: "painter_input_scale",
    });
    scaleLabel.append(scale);

    // sendToBack image canvas
    const backwardsImage = makeElement("input", {
      type: "checkbox",
      class: ["pipingBackSendImage_checkbox"],
      checked:
        this.storageCls.settings_painter_node.settings.pipingSettings.action
          .options.sendToBack ?? true,
      onchange: (e) => {
        this.storageCls.settings_painter_node.settings.pipingSettings.action.options.sendToBack =
          !!e.target.checked;
        this.saveSettingsPainterNode();
      },
    });
    const sendToBackLabel = makeElement("label", {
      textContent: "Send to back: ",
      title: "Sending to back image on the canvas (default: true)",
    });
    sendToBackLabel.append(backwardsImage);

    custom_options_piping_box.append(scaleLabel, sendToBackLabel);

    // end - Panel custom_options_piping_box

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
        this.storageCls.settings_painter_node.settings.pipingSettings.action
          .name === value
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
      custom_options_piping_box,
      labelPipingChangeSize,
      labelPipingUpdateImage
    );

    this.painter_wrapper_settings = createWindowModal({
      textTitle: "Settings",
      textBody: [pipingSettingsBox],
      stylesBox: {
        borderColor: "#13e9c5ad",
        boxShadow: "2px 2px 4px #13e9c5ad",
      },
      stylesClose: { background: "#13e9c5ad" },
      stylesBody: { width: "100%", alignItems: "auto" },
    });

    this.panelPaintBoxRight.append(this.painter_wrapper_settings);
    // === end - Settings box ===
  }

  async clearCanvas() {
    if (await comfyuiDesktopConfirm("Reset canvas size by default 512x512?")) {
      this.setCanvasSize(512, 512);
    }
    this.canvas.clear();
    this.canvas.backgroundColor = this.bgColor.value || "#000000";
    this.canvas.requestRenderAll();

    this.addToHistory();
    this.saveSettingsPainterNode(true);
    this.uploadPaintFile(this.node.name);
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
      this.elemX = null;
      this.elemY = null;
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
      dataset: { prop: "prop_fontFamily" },
      class: ["font_family_select"],
    });

    for (let font in this.fonts) {
      const option = makeElement("option");
      if (font === "Arial") option.setAttribute("selected", true);
      option.value = font;
      option.textContent = font;
      selectFontFamily.appendChild(option);
    }

    // Select front event
    selectFontFamily.onchange = (e) => {
      if (this.getActiveStyle("fontFamily") != selectFontFamily.value) {
        if (this.fonts[selectFontFamily.value].type == "default") {
          this.setActiveStyle("fontFamily", selectFontFamily.value);
          return;
        }

        const font = new FontFaceObserver(selectFontFamily.value);
        font.load().then(
          () => {
            // console.log("Font is available");
            this.setActiveStyle("fontFamily", selectFontFamily.value);
          },
          () => {
            // console.log("Font not is available");
          }
        );

        this.uploadPaintFile(this.node.name);
      }
    };

    const infoFontsButton = makeElement("button", {
      style: {},
      textContent: "?",
      title: "Info for fonts",
      onclick: (e) =>
        createWindowModal({
          textTitle: "NOTE",
          textBody:
            "<b>If fonts not loaded in the canvas, refresh page browser!😅</b>",
          ...THEMES_MODAL_WINDOW.warning,
          options: {
            auto: { autohide: true, autoshow: true, autoremove: true },
            parent: this.canvas.wrapperEl,
            overlay: {
              overlay_enabled: true,
              overlayStyles: {
                position: "absolute",
              },
            },
          },
        }),
    });

    property_textbox.append(
      buttonItalic,
      buttonBold,
      buttonUnderline,
      separator,
      selectFontFamily,
      infoFontsButton
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

    const buttonBrushSymmetry = makeElement("button", {
      dataset: [{ shape: "BrushSymmetry" }, { prop: "prop_BrushSymmetry" }],
      title: "Symmetry Brush",
      textContent: "S",
    });

    const separator = makeElement("div", { class: ["separator"] });

    // Second panel setting brushes
    this.property_brushesSecondBox = makeElement("div", {
      class: ["property_brushesSecondBox", "comfy-menu-btns"],
    });

    property_brushesBox.append(BrushMyPaint, buttonBrushSymmetry, separator);

    this.painter_drawning_box_property.append(
      property_brushesBox,
      this.property_brushesSecondBox
    );
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
      this.painter_drawning_box_property.style.display = "flex";

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

  async setCanvasSize(new_width, new_height, confirmChange = false) {
    if (
      confirmChange &&
      this.node.isInputConnected(0) &&
      this.storageCls.settings_painter_node.settings.pipingSettings
        .pipingChangeSize &&
      (new_width !==
        this.storageCls.settings_painter_node.settings.currentCanvasSize
          .width ||
        new_height !==
          this.storageCls.settings_painter_node.settings.currentCanvasSize
            .height)
    ) {
      if (await comfyuiDesktopConfirm("Disable change size piping?")) {
        this.canvas.wrapperEl.querySelector(
          ".pipingChangeSize_checkbox"
        ).checked = false;
        this.storageCls.settings_painter_node.settings.pipingSettings.pipingChangeSize = false;
        this.saveSettingsPainterNode();
      }
    }

    resizeCanvas(this.node, {
      width: new_width,
      height: new_height,
    });

    Object.assign(
      this.storageCls.settings_painter_node.settings.currentCanvasSize,
      { width: new_width, height: new_height }
    );

    this.node.title = `${this.node.type} - ${new_width}x${new_height}`;
    this.canvas.renderAll();
    app.graph.setDirtyCanvas(true, false);
    this.node.onResize();
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
      this.uploadPaintFile(this.node.name);
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

    this.bgColor.oninput = () => {
      this.reset_set_bg();
    };

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
            this.bgImageFile.func = async (img) => {
              if (
                await comfyuiDesktopConfirm("Change canvas size equal image?")
              ) {
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
    this.buttonSetCanvasSize.addEventListener("click", async () => {
      async function checkSized(prop = "", defaultVal = 512) {
        let inputSize;
        let correct = false;
        while (!correct) {
          inputSize = await comfyuiDesktopPrompt(
            "Canvas size",
            `Enter canvas ${prop}:`,
            defaultVal
          );

          if (inputSize === null) return defaultVal;

          inputSize = +inputSize;
          if (
            Number(inputSize) === inputSize &&
            inputSize % 1 === 0 &&
            inputSize > 0
          ) {
            return inputSize;
          }

          comfyuiDesktopAlert(
            `[${prop}] Invalid number "${inputSize}" or <=0!`
          );
        }
      }

      const { width: curWidth, height: curHeight } =
        this.storageCls.settings_painter_node.settings.currentCanvasSize;

      let new_width = await checkSized("width", curWidth),
        new_height = await checkSized("height", curHeight);

      if (new_width === curWidth && new_height === curHeight) return;

      this.setCanvasSize(new_width, new_height, true);
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
      const setProps = (style, value) => {
        const propEl = this.painter_drawning_box_property.querySelector(
          `[data-prop=prop_${style}]`
        );

        if (propEl) {
          switch (propEl.dataset.prop) {
            case "prop_fontFamily": {
              propEl.value = value;
            }
            default:
              propEl.classList[value ? "remove" : "add"]("active");
          }
        }
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

          setProps("fontFamily", this.getActiveStyle("fontFamily", target));
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
          this.canvas.renderAll();
          this.addToHistory();
          this.uploadPaintFile(this.node.name);
        }
      },

      "object:added": (o) => {},

      // Object moving event
      "object:moving": (o) => {
        this.canvas.isDrawingMode = false;
        this.canvas.renderAll();
      },

      "object:scaling": (o) => {
        this.canvas.renderAll();
      },
      "object:rotating": (o) => {
        this.canvas.renderAll();
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
    try {
      Object.assign(
        this.storageCls.settings_painter_node.canvas_settings,
        this.canvas.toJSON(["mypaintlib"])
      );
    } catch (e) {}
  }

  undoRedoLoadData(data) {
    this.canvas.loadFromJSON(data, () => {
      this.canvas.renderAll();
      this.bgColor.value = getColorHEX(data.background).color || "";
    });
  }

  // Load canvas data from localStorage or JSON
  canvasLoadSettingPainter(data_canvas) {
    return new Promise((res) => {
      try {
        if (!data_canvas) {
          res({ success: false, error: new Error("Invalid canvas data!") });
          return;
        }

        const data =
          typeof data_canvas === "string" || data_canvas instanceof String
            ? JSON.parse(data_canvas)
            : data_canvas;

        if (data && data.hasOwnProperty("canvas_settings")) {
          this.canvas.loadFromJSON(data.canvas_settings, () => {
            this.canvas.renderAll();
            this.uploadPaintFile(this.node.name);
            this.bgColor.value = getColorHEX(data.background).color || "";
            this.addToHistory();
            res({ success: true });
          });
        }
      } catch (e) {
        res({ success: false, error: e });
      }
    });
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

  async pastAsBackground(image, options = {}) {
    if (!image) return;

    if (await comfyuiDesktopConfirm("Resize Painter node canvas?")) {
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

  async pastAsImage(image, options = {}) {
    if (!image) return;

    const painterSize = await comfyuiDesktopConfirm(
      "Resize Painter node canvas?"
    );
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

    if (
      !painterSize &&
      (await comfyuiDesktopConfirm("Stretch image to fit canvas Painter node?"))
    ) {
      img_.scaleToHeight(
        this.storageCls.settings_painter_node.settings.currentCanvasSize.width
      );
      img_.scaleToWidth(
        this.storageCls.settings_painter_node.settings.currentCanvasSize.height
      );
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

  getImageByName(image_name) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = (e) => resolve(new Error("Image not load!"));

      let name = image_name;
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
  }

  async addImageToCanvas(image, options = {}) {
    const formData = new FormData();
    formData.append("image", image);

    this.uploadFileToServer(formData)
      .then(async (jsonData) => {
        if (!jsonData.success) {
          throw new Error(jsonData.error);
        }
        const data = jsonData.data;
        let path = data.name;
        if (data.subfolder) path = data.subfolder + "/" + path;

        this.getImageByName(path).then(async (image) => {
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

          if (await comfyuiDesktopConfirm("Past as background?")) {
            this.pastAsBackground(image, options);
          } else if (await comfyuiDesktopConfirm("Past as image?")) {
            this.pastAsImage(image, options);
          }
        });
      })
      .catch((err) => console.error(err));
  }

  async uploadFileToServer(formData) {
    try {
      const resp = await api.fetchApi("/upload/image", {
        method: "POST",
        body: formData,
      });

      if (resp.status !== 200) {
        return { success: false, error: `${resp.status} - ${resp.statusText}` };
      }

      return { success: true, data: await resp.json() };
    } catch (error) {
      return { success: false, error };
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
      }
    }

    this.canvasSaveSettingsPainter();

    await new Promise((res) => {
      this.canvas.lowerCanvasEl.toBlob((blob) => {
        const formData = new FormData();
        formData.append("image", blob, fileName);
        formData.append("overwrite", "true");
        //formData.append("type", "temp");

        this.uploadFileToServer(formData)
          .then((jsonData) => {
            if (!jsonData.success) {
              throw new Error(jsonData.error);
            }

            const { name } = jsonData.data;

            if (!this.image.options.values.includes(name)) {
              this.image.options.values.push(name);
            }

            // this.image.value = name;
            this.showImage(name);

            if (activeObj && !this.drawning) {
              activeObj.hasControls = true;
              activeObj.hasBorders = true;

              this.canvas.getActiveObjects().forEach((a_obs) => {
                a_obs.hasControls = true;
                a_obs.hasBorders = true;
              });
              this.canvas.renderAll();
            }
            this.saveSettingsPainterNode(false);
            res(true);
          })
          .catch((error) => {
            console.log(error);
            res(false);
          });
      }, "image/png");
    });

    // - end
  }
}
// ================= END CLASS PAINTER ================

// ================= CREATE PAINTER WIDGET ============
function PainterWidget(node, inputName, inputData, app) {
  node.addWidget("button", "Clear Canvas", "clear_painer", () => {
    node.painter.list_objects_panel__items.innerHTML = "";
    node.painter.clearCanvas();
  });

  const wrapperPainter = makeElement("div", {
    class: ["wrapperPainter"],
  });

  // Fabric canvas
  const canvasPainter = makeElement("canvas", {
    width: 512,
    height: 512,
  });
  node.painter = new Painter(node, canvasPainter);

  const widget = node.addDOMWidget(
    "painter_widget",
    "painter",
    wrapperPainter,
    {
      setValue(v) {
        node.painter.storageCls.settings_painter_node = v;
      },
      getValue() {
        return node.painter.storageCls.settings_painter_node;
      },
    }
  );

  widget.callback = function (v) {};

  widget.wrapperPainter = wrapperPainter;
  widget.painter_wrap = node.painter.canvas.wrapperEl;
  widget.parent = node;

  node.painter.makeElements(wrapperPainter);

  node.onResize = function () {
    const minSize = 600;
    let [w, h] = this.size;
    let aspect_ratio = 1;

    if (node?.imgs && typeof this.imgs !== undefined) {
      aspect_ratio = this.imgs[0].naturalHeight / this.imgs[0].naturalWidth;
    }
    let buffer = 90;

    if (w > this.painter.maxNodeSize) w = w - (w - this.painter.maxNodeSize);
    if (w < minSize) w = minSize;

    h = w * aspect_ratio + buffer;

    if (h < minSize) h = minSize + h / 2;

    this.size = [w, h];
  };

  node.onDrawBackground = function (ctx) {
    if (!this.flags.collapsed) {
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
    }
  };

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

  // Node serialize
  node.onSerialize = (n) => {
    if (painters_settings_json) {
      n.widgets_values[3] = null;
    }
  };

  // Get piping image input, when node executing...
  api.addEventListener("alekpet_get_image", async ({ detail }) => {
    const { images, unique_id } = detail;

    if (
      !images.length ||
      !node.painter.storageCls.settings_painter_node.settings.pipingSettings
        .pipingUpdateImage ||
      +unique_id !== node.id
    ) {
      return;
    }

    await new Promise((res) => {
      const img = new Image();
      img.onload = async () => {
        // Change size piping input image
        const { naturalWidth: w, naturalHeight: h } = img;
        if (
          node.painter.storageCls.settings_painter_node.settings.pipingSettings
            .pipingChangeSize &&
          (w !==
            node.painter.storageCls.settings_painter_node.settings
              .currentCanvasSize.width ||
            h !==
              node.painter.storageCls.settings_painter_node.settings
                .currentCanvasSize.height)
        ) {
          node.painter.setCanvasSize(w, h);
        } else {
          node.title = `${node.type} - ${node.painter.storageCls.settings_painter_node.settings.currentCanvasSize.width}x${node.painter.storageCls.settings_painter_node.settings.currentCanvasSize.height}`;
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
        switch (
          node.painter.storageCls.settings_painter_node.settings.pipingSettings
            .action.name
        ) {
          case "image":
            await new Promise(async (res) => {
              let { scale, sendToBack = true } =
                node.painter.storageCls.settings_painter_node.settings
                  .pipingSettings.action.options;

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

  node.onResize();
  app.graph.setDirtyCanvas(true, false);

  return widget;
}
// ================= END CREATE PAINTER WIDGET ============

// ================= CREATE EXTENSION ================

let setEventsPromise = null;

app.registerExtension({
  name: extensionName,
  async init(app) {
    // Add styles
    addStylesheet("css/painternode/painter_node_styles.css", import.meta.url);
    addStylesheet("css/painternode/painter_node_fonts.css", import.meta.url);

    // -- Settings
    // Managing data
    app.ui.settings.addSetting({
      id: `${extensionName}.ManagingData`,
      name: "🔸 Managing JSON data storage",
      defaultValue: false,
      type: (name, sett, val) => {
        return makeElement("tr", {
          children: [
            makeElement("td", {
              children: [
                makeElement("button", {
                  textContent: "Managing Data",
                  onclick: () => {
                    new PainterStorageDialog().show();
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

    // Add settings params painter node
    app.ui.settings.addSetting({
      id: `${extensionName}.SaveSettingsJson`,
      name: "🔸 Save settings to JSON file (BETA)",
      defaultValue: false,
      type: "boolean",
      onChange: (e) => {
        painters_settings_json = !!e;
        localStorage.setItem(
          `${extensionName}.SaveSettingsJson`,
          painters_settings_json
        );
      },
    });
    // end -- Settings
  },
  async setup(app) {},
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PainterNode") {
      if (!STATES.fontsLoaded) {
        await getLoadedFonts().then(() => {
          STATES.fontsLoaded = true;
          console.log("PainterNode: Loading fonts completed");
        });
      }

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

        this.name = nodeNamePNG;

        console.log(`🔨 Created PainterNode: ${this.name}`);

        // Find widget update_node and hide him
        for (const w of this.widgets) {
          if (w.name === "update_node") {
            w.type = "converted-widget";
            w.computeSize = () => [0, -4];
            if (!w.linkedWidgets) continue;
            for (const l of w.linkedWidgets) {
              l.type = "converted-widget";
              l.computeSize = () => [0, -4];
            }
          }
        }

        this.storageCls = new StorageClass(this, DEBUG);

        const widget = PainterWidget.apply(this, [this, nodeNamePNG, {}, app]);

        //this.painter.uploadPaintFile(nodeNamePNG);
        this.title = `${this.type} - ${this.painter.storageCls.settings_painter_node.settings.currentCanvasSize.width}x${this.painter.storageCls.settings_painter_node.settings.currentCanvasSize.height}`;

        // Resize window
        window.addEventListener("resize", (e) => resizeCanvas(this), false);
        return r;
      };

      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = async function (widget) {
        onConfigure?.apply(this, arguments);

        await this.getTitle();

        if (painters_settings_json) {
          if (this.storageCls.workflowStateManager.currentWorkflow) {
            DEBUG &&
              console.log(
                `⚠️ [PainterNode] currentWorkflow is already set, skip: ${this.name} -> ${this.storageCls.workflowStateManager.currentWorkflow}`
              );
          }

          // Если `setEvents` уже выполняется, ждем его завершения
          if (setEventsPromise) {
            DEBUG &&
              console.log(
                `⏳ [PainterNode] Waiting for setEvents to complete...`
              );

            await setEventsPromise;
            DEBUG &&
              console.log(`✅ [PainterNode] setEvents completed, continue`);
          } else {
            // Если это первый узел, запускаем `setEvents`
            DEBUG &&
              console.log(`🚀 [PainterNode] The first node calls setEvents...`);
            setEventsPromise = this.storageCls.workflowStateManager.setEvents();
            await setEventsPromise;
            DEBUG && console.log(`✅ [PainterNode] setEvents completed`);
          }
        }

        setTimeout(async () => {
          console.log(`🔧 Configure PainterNode: ${this.name}`);

          const painter_idx = this.widgets.findIndex(
            (w) => w.type === "painter"
          );

          if (painter_idx < 0) return;
          let data = widget.widgets_values[painter_idx];

          if (painters_settings_json && data === null) {
            data = await this.painter.storageCls.getData();

            if (!data) {
              data = JSON.parse(
                JSON.stringify(
                  this.painter.storageCls.settings_painter_node_default
                )
              );
            }

            this.painter.storageCls.settings_painter_node = data;
          }

          Object.assign(this.widgets[painter_idx].value, data);

          if (data) {
            if (data?.settings) {
              const {
                currentCanvasSize: { width, height },
              } = data.settings;

              // -- Settings piping
              this.painter.setValueElementsLS();

              // -- Settings size
              if (width && height) {
                this.painter.storageCls.settings_painter_node.settings.currentCanvasSize =
                  {
                    width,
                    height,
                  };

                this.painter.setCanvasSize(width, height);
              }
            }

            // Loading canvas data
            if (data?.canvas_settings) {
              this.painter.canvasLoadSettingPainter(data).then((result) => {
                if (result) {
                  this.painter.canvas.renderAll();
                  this.painter.uploadPaintFile(this.name);
                }
              });
            }

            this.setSize(arguments[0].size);
            app.graph.setDirtyCanvas(true, false);
          }
        });
      };

      // ExtraMenuOptions
      const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
      nodeType.prototype.getExtraMenuOptions = async function (_, options) {
        getExtraMenuOptions?.apply(this, arguments);

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

        setTimeout(() => {
          const removeIndex = options.findIndex((m) => m?.content === "Remove"),
            removeButton = options[removeIndex];

          if (!!removeButton) {
            const remove_callback = removeButton.callback;
            const self = this;

            removeButton.callback = async function () {
              const nodeName = Array.from(arguments).find((f) => f?.name).name;
              remove_callback.apply(this, arguments);

              if (!painters_settings_json) return;

              if (
                await comfyuiDesktopConfirm(
                  `Remove data ${nodeName} from JSON?`
                )
              ) {
                self.storageCls.workflowStateManager.removeData(null, [
                  nodeName,
                ]);
              }
            };
          }
        }, 0);
      };
      // end - ExtraMenuOptions
    }
  },
});
// ================= END CREATE EXTENSION ================
