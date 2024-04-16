/*
 * Title: PainterNode ComflyUI from ControlNet
 * Author: AlekPet
 * Version: 2024.04.16
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { fabric } from "./lib/painternode/fabric.js";
import "./lib/painternode/mybrush.js";
import { svgSymmetryButtons } from "./lib/painternode/brushes.js";
import { toRGBA, getColorHEX } from "./lib/painternode/helpers.js";
import { showHide, makeElement } from "./utils.js";
import { MyPaintManager } from "./lib/painternode/manager_mypaint.js";

// ================= FUNCTIONS ================
const painters_settings_json = false; // save settings in JSON file on the extension folder [big data settings includes images] if true else localStorage
const removeIcon =
  "data:image/svg+xml,%3Csvg version='1.1' id='Ebene_1' x='0px' y='0px' width='595.275px' height='595.275px' viewBox='200 215 230 470' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3C/defs%3E%3Crect x='125.3' y='264.6' width='350.378' height='349.569' style='fill: rgb(237, 0, 0); stroke: rgb(197, 2, 2);' rx='58.194' ry='58.194'%3E%3C/rect%3E%3Cg%3E%3Crect x='267.162' y='307.978' transform='matrix(0.7071 -0.7071 0.7071 0.7071 -222.6202 340.6915)' style='fill:white;' width='65.545' height='262.18' rx='32.772' ry='32.772'%3E%3C/rect%3E%3Crect x='266.988' y='308.153' transform='matrix(0.7071 0.7071 -0.7071 0.7071 398.3889 -83.3116)' style='fill:white;' width='65.544' height='262.179' rx='32.772' ry='32.772'%3E%3C/rect%3E%3C/g%3E%3C/svg%3E";

const removeImg = document.createElement("img");
removeImg.src = removeIcon;

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

window.LS_Painters = {};
function LS_Save() {
  if (painters_settings_json) {
    saveData();
  } else {
    localStorage.setItem("ComfyUI_Painter", JSON.stringify(LS_Painters));
  }
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

    // this.undo_history = LS_Painters[node.name].undo_history || [];
    // this.redo_history = LS_Painters[node.name].redo_history || [];

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

    return this.canvas;
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

    // LS save checkbox
    // const labelLSSave = makeElement("label", {
    //   textContent: "LS Save:",
    //   style: "font-size: 10px; display: block;",
    //   alt: "localStorage save canvas",
    // });
    // this.checkBoxLSSave = makeElement("input", {
    //   type: "checkbox",
    //   class: ["lsSave_checkbox"],
    //   checked: true,
    // });
    // this.checkBoxLSSave.customSize = { w: 10, h: 10, fs: 10 };
    // labelLSSave.append(this.checkBoxLSSave);
    // this.painter_settings_box.append(labelLSSave);

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

      obEl.addEventListener("click", () => {
        // Style active
        this.setActiveElement(obEl, list_body);
        // Select element
        this.canvas.discardActiveObject();
        this.canvas.setActiveObject(o);
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
      this.painter_shapes_box_modify.appendChild(this.painter_colors_box);
      this.painter_shapes_box_modify.appendChild(this.painter_stroke_box);
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
    }

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

  setCanvasSize(new_width, new_height) {
    this.canvas.setDimensions({
      width: new_width,
      height: new_height,
    });

    this.currentCanvasSize = { width: new_width, height: new_height };
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
                  this.MyBrushPaintManager.currentBrushSettings
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
                this.setCanvasSize(img.width, img.height);
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

      this.setCanvasSize(width, height);
      this.uploadPaintFile(this.node.name);
    });

    // History undo, redo
    this.undo_button.onclick = (e) => {
      this.undo();
    };
    this.redo_button.onclick = (e) => {
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
        if (!this.canvas.isDrawingMode) return;

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

      "object:added": (o) => {
        if (["BrushMyPaint"].includes(this.type)) {
          if (o.target.type !== "group") this.canvas.remove(o.target);
          this.addToHistory();
          this.canvas.renderAll();
          this.uploadPaintFile(this.node.name);
        }
      },

      // Object moving event
      "object:moving": (o) => {
        this.canvas.isDrawingMode = false;
      },

      // Object modify event
      "object:modified": () => {
        this.canvas.isDrawingMode = false;
        this.canvas.renderAll();
        this.uploadPaintFile(this.node.name);
      },
    });
    // ----- Canvas Events -----
  }

  addToHistory() {
    // if (!this.checkBoxLSSave.checked) return;
    // Undo / rendo
    const objs = this.canvas.toJSON();

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
      const data = this.canvas.toJSON(["mypaintlib"]);
      if (LS_Painters && LS_Painters.hasOwnProperty(this.node.name)) {
        LS_Painters[this.node.name].canvas_settings = painters_settings_json
          ? data
          : JSON.stringify(data);

        LS_Painters[this.node.name].settings["currentCanvasSize"] =
          this.currentCanvasSize;

        LS_Save();
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
        LS_Painters &&
        LS_Painters.hasOwnProperty(this.node.name) &&
        LS_Painters[this.node.name].hasOwnProperty("canvas_settings")
      ) {
        const data =
          typeof LS_Painters[this.node.name] === "string" ||
          LS_Painters[this.node.name] instanceof String
            ? JSON.parse(LS_Painters[this.node.name])
            : LS_Painters[this.node.name];
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

  uploadPaintFile(fileName) {
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
          // if (this.checkBoxLSSave.checked) this.canvasSaveSettingsPainter();
          this.canvasSaveSettingsPainter();
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
        left: `${transform.a * margin * left_offset + transform.e}px`,
        top: `${transform.d + transform.f + top_offset}px`,
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

  widget.painter_wrap = node.painter.canvas.wrapperEl;
  widget.parent = node;

  node.painter.makeElements();

  document.body.appendChild(widget.painter_wrap);

  node.addWidget("button", "Clear Canvas", "clear_painer", () => {
    node.painter.list_objects_panel__items.innerHTML = "";
    node.painter.clearCanvas();
  });

  // Add customWidget to node
  node.addCustomWidget(widget);

  node.onRemoved = () => {
    if (Object.hasOwn(LS_Painters, node.name)) {
      delete LS_Painters[node.name];
      LS_Save();
    }

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

  return { widget: widget };
}
// ================= END CREATE PAINTER WIDGET ============

// ================= CREATE EXTENSION ================
async function saveData() {
  try {
    const rawResponse = await fetch("/alekpet/save_node_settings", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(LS_Painters),
    });
    if (rawResponse.status !== 200)
      throw new Error(`Error painter save settings: ${rawResponse.statusText}`);
  } catch (e) {
    console.log(`Error painter save settings: ${e}`);
  }
}

async function loadData() {
  try {
    const rawResponse = await api.fetchApi("/alekpet/loading_node_settings");
    if (rawResponse.status !== 200)
      throw new Error(`Error painter save settings: ${rawResponse.statusText}`);

    const data = await rawResponse?.json();
    if (!data) return {};

    return data.settings_nodes;
  } catch (e) {
    console.log(`Error painter load settings: ${e}`);
    return {};
  }
}

function createMessage(title, decriptions, parent, func) {
  const message = document.createElement("div");
  message.className = "show_message_info";
  message.style = `width: 300px;
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
display: flex;
background: #3b2222;
z-index: 9999;
justify-content: center;
flex-direction: column;
align-items: stretch;
text-align: center;
border-radius: 6px;
box-shadow: 3px 3px 6px #141414;
border: 1px solid #f91b1b;
color: white; 
padding: 6px;
opacity: .8;
font-family: sans-serif;
line-height: 1.5`;
  message.innerHTML = `<div style="background: #8f210f; padding: 5px; border-radius: 6px; margin-bottom: 5px;">${title}</div><div>${decriptions}</div>`;
  parent && parent?.nodeType && parent.nodeType === 1
    ? parent.appendChild(message)
    : document.body.appendChild(message);

  if (func && typeof func === "function") {
    func.apply();
  }

  return message;
}

app.registerExtension({
  name: "Comfy.PainterNode",
  async init(app) {
    const style = document.createElement("style");
    style.innerText = `.panelPaintBox {
      position: absolute;
      width: 100%;
    }
    .comfy-menu-btns button.active {
      color: var(--error-text) !important;
      font-weight: bold;
      border: 1px solid;
    }
    .painter_manipulation_box {
      position: absolute;
      left: 50%;
      top: -40px;
      transform: translateX(-50%);
    }
    .painter_manipulation_box > div {
      display: grid;
      gap: 2px;
      grid-template-columns: 0.1fr 0.1fr 0.1fr 0.1fr 0.1fr;
      justify-content: center;
      margin-bottom: 2px;
    }
    .painter_manipulation_box > div button {
      font-size: 0.5rem;
    }
    .painter_manipulation_box > div button[id^=zpos]:active {
      background-color: #484848;
    }
    .painter_drawning_box {
      position: absolute;
      top: -64px;
      width: 88px;
    }
    .painter_drawning_box button {
      width: 24px;
    }
    .painter_drawning_box_property {
      position: absolute;
      top: -60px;
      width: 100%;
    }
    .painter_drawning_box_property select {
      color: var(--input-text);
      background-color: var(--comfy-input-bg);
      border-radius: 4px;
      border-color: var(--border-color);
      border-style: solid;
    }
    .separator {
      width: 1px;
      height: 25px;
      background-color: var(--border-color);
      display: inline-block;
      vertical-align: middle;
      margin: 0 4px 0 4px;
  }
    .painter_drawning_box > div {
      display: flex;
      flex-direction: column;
      gap: 2px;
      align-items: center;
    }
    .painter_drawning_box input[type="number"] {
      width: 2.6rem;
      color: var(--input-text);
      background-color: var(--comfy-input-bg);
      border-radius: 8px;
      border-color: var(--border-color);
      border-style: solid;
      font-size: inherit;
    }
    .painter_colors_box input[type="color"], .painter_bg_setting input[type="color"] {
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      margin-bottom: 5px;
      color: var(--input-text);
      background-color: var(--comfy-input-bg);
      border-radius: 8px;
      border-color: var(--border-color);
      border-style: solid;
      font-size: inherit;
    }

    .painter_bg_setting button{
      width: 40px;
      height: 20px;
    }
    .painter_bg_setting #bgColor:after {
      content: attr(data-label);
      position: absolute;
      color: var(--input-text);
      left: 70%;
      font-size: 0.5rem;
      margin-top: -18%;
    }
    .painter_colors_box input[type="color"]::-webkit-color-swatch-wrapper, .painter_bg_setting input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 1px !important;
    }
    .painter_grid_style {
      display: grid;
      gap: 3px;
      font-size: 0.55rem;
      text-align: center;
      align-items: start;
      justify-items: center;
    }
    .painter_shapes_box {
      grid-template-columns: 1fr 1fr 1fr;
    }
    .painter_colors_alpha {
      grid-template-columns: 0.7fr 0.7fr;
    }
    .fieldset_box {
      padding: 2px;
      margin: 15px 0 2px 0;
      position: relative;
      text-align: center;
    }
    .fieldset_box:before {
      content: attr(f_name) ":";
      font-size: 0.6rem;
      position: absolute;
      top: -10px;
      color: yellow;
      left: 0;
      right: 0;
    }
    .list_objects_panel {
      width: 90%;
      font-size: 0.7rem;
    }
    .list_objects_panel__items {
      display: flex;
      flex-direction: column;
      align-items: center;
      overflow-y: auto;
      max-height: 350px;
    }
    .list_objects_panel__items button {
      width: 80% !important;
    }
    .list_objects_panel__items::-webkit-scrollbar, .kistey__body::-webkit-scrollbar {
      width: 8px;
    }
    .list_objects_panel__items::-webkit-scrollbar-track, .kistey__body::-webkit-scrollbar-track {
      background-color: var(--descrip-text);
    }
    .list_objects_panel__items::-webkit-scrollbar-thumb, .kistey__body::-webkit-scrollbar-thumb {
      background-color: var(--fg-color);
    }
    .list_objects_align {
      display: flex;
      flex-direction: column;
      text-align: center;
      justify-content: space-between;
      height: 430px;
   }
   .list_objects_align > div{
    flex: 1;
   }
   .viewlist__itembox {
    flex-direction: row;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2px;
    }
    .viewlist__itembox > img {
      width: 12px;
      cursor: pointer;
    }
    .viewlist__itembox > img:hover{
      opacity: 0.8;
    }
   .painter_history_panel {
    position: absolute;
    padding: 4px;
    display: flex;
    gap: 4px;
    right: 0;
    opacity: 0.8;
    flex-direction: row;
    width: fit-content;
  }
  .painter_history_panel > button {
    background: transparent;
  }
  .painter_history_panel > button:hover:enabled {
    opacity: 1;
    border-color: var(--error-text);
    color: var(--error-text) !important;
  }
  .painter_history_panel > button:disabled {
    opacity: .5;
  }
  .painter_stroke_box {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
  .painter_stroke_box > label span {
    margin-right: 9px;
    vertical-align: middle;
    font-size: 10px;
    color: var(--input-text);
  }
  .property_brushesBox, .property_brushesSecondBox {
    display: flex;
    gap: 5px;
    flex-wrap: wrap;
    flex: 1 0;
  }
  .property_brushesSecondBox > button {
    min-width: 30px;
    font-size: 0.5rem;
  }
  .property_brushesSecondBox svg {
    width: 100%;
    height: 100%;
  }
  .active svg > .cls-2 {
    fill: var(--error-text);
  }
  .active svg > * {
    stroke: var(--error-text);
  }

  /* -- Styles Kistey */
  .close__box__button {
    position: absolute;
    top: -10px;
    right: -10px;
    background: #3aa108;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    cursor: pointer;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 0.8rem;    
  }

  .close__box__button:hover {
    opacity: 0.8;
  }

  .viewMenuBrushes {
    position: absolute;
    opacity: 0.9;
    z-index: 3;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    left: 101%;
  }

  .wrapper__kistey {
    max-width: 300px;
    position: relative;
  }
  
  .box__kistey, .box__kistey_settings {
    display: flex;
    flex-direction: column;
    background: #0e0e0e;
    padding: 10px;
    justify-content: center;
    align-items: center;
    gap: 10px;
    text-align: center;
    border-radius: 6px;
    color: white;
    border: 2px solid #00ff00ab;
    font-family: monospace;
    box-shadow: 2px 2px 4px #00ff00ab;
  }

  .close__box__button_box__kistey {
    background: #3aa108;
  }
  
  .kistey__title {
    display: flex;
    gap: 5px;
    justify-content: space-evenly;
    width: 100%;
    align-items: center;
  }
  
  .kistey__body {
    display: grid;
    grid-auto-rows: auto;
    grid-template-columns: repeat(4, 1fr);
    gap: 5px;
    background: #2d2d2d;
    padding: 5px;
    max-height: 230px;
    overflow-y: auto;
    min-width: 250px;  
  }
  .kistey__img {
    width: 50px;
  }
  
  .kistey__img img {
    max-width: 100%;
  }
  
  .kistey__item {
    display: flex;
    flex-direction: column;
    align-items: center;
    transition: 0.6s all;
    cursor: pointer;
    user-select: none;
  }
  
  .kistey__item:hover,
  .kistey__arrow:hover {
    transform: scale(1.05);
  }
  
  .selected {
    outline: 3px solid #4003fd;
  }
  
  .kistey__name {
    background: #2a272b;
    font-size: 0.5rem;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    width: 50px;    
  }
  
  .kistey__arrow {
    transition: 0.6s transform;
    cursor: pointer;
    user-select: none;
    color: silver;
  }
  
  .kistey__arrow:hover {
    color: white;
    transform: scale(1.25);
  }
  
  .kistey_dir__name {
    font-weight: bold;
    text-transform: capitalize;
    min-width: 150px;
    user-select: none;
    cursor: pointer;
  }
  
  .kistey_dir__name_wrapper {
    display: flex;
    max-width: 50%;
    flex: 1 0 0;
    overflow: hidden;
    align-items: center;
    justify-content: flex-start;
  }
  
  .kistey_directory_slider {
    display: flex;
    justify-content: flex-start;
    align-items: flex-start;
    position: relative;
    transition: 1s all;
  }
  
  .kistey_directory_popup {
    position: absolute;
    top: 35px;
    left: 70%;
    background: black;
    display: none;
    flex-direction: column;
    gap: 5px;
    padding: 10px 5px;
    border-radius: 6px;
    border: 2px solid #4300e7;
    opacity: 0.9;
    transform: translateX(-50%);
    z-index: 2;
    box-shadow: 4px 4px 8px #4300e7;
  }
  
  .kistey_dir__name-popup:hover {
    background: #4300e7;
  }
  
  .pop_active {
    color: #38ffc1;
  }
  /* -- end Styles Kistey -- */
  
  /* -- Styles Settigs Kistey -- */
  .kistey_wrapper_settings {
    max-width: 250px;
    position: relative;
  }
  
  .box__kistey_settings {
    gap: 5px;
    transition: 0.5s opacity;
    border: 2px solid #4313e9ad;
    box-shadow: 2px 2px 4px #4313e9ad;
  }

  .close__box__button__box__kistey_settings {
    background: #4313e9ad;
  }
  
  .kistey_settings_body {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
  }

  .kistey_setting__item {
    display: flex;
    align-items: center;
  }

  .kistey_settings_body input[type="range"] {
    width: 100px;
  }
  .kistey_settings_body input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    background: linear-gradient(
      to right,
      #15539e 0%,
      #15539e 50%,
      #282828 50%,
      #282828 100%
    );
    cursor: pointer;
    border-radius: 16px;
    border: 1px solid black;
    transition: background 400ms ease-in;
  }
  
  .kistey_settings_body input[type="range"]::-webkit-slider-runnable-track {
    -webkit-appearance: none;
    appearance: none;
    border-radius: 16px;
    height: 3.2px;
  }
  
  .kistey_settings_body input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    margin-top: -6.4px;
    background: #2b2b2b;
    border: 1px solid black;
    height: 1rem;
    width: 1rem;
    border-radius: 50%;
  }
  
  .kistey_settings_body input[type="range"]::-webkit-slider-thumb:hover {
    background-color: rgb(49 49 49);
  }
  /* -- end Styles Settigs Kistey -- */  
`;
    document.head.append(style);
  },
  async setup(app) {
    let PainerNode = app.graph._nodes.filter((wi) => wi.type == "PainterNode");

    if (PainerNode.length) {
      PainerNode.map((n) => {
        console.log(`Setup PainterNode: ${n.name}`);
        let widgetImage = n.widgets.find((w) => w.name == "image");
        if (widgetImage && Object.hasOwn(LS_Painters, n.name)) {
          const painter_ls = LS_Painters[n.name];
          painter_ls.hasOwnProperty("objects_canvas") &&
            delete painter_ls.objects_canvas; // remove old property
          n.painter.canvasLoadSettingPainter();
        }
      });
    }
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PainterNode") {
      // Get settings node
      if (painters_settings_json) {
        const message = createMessage(
          "Loading",
          "Please wait, <span style='font-weight: bold; color: orange'>Painter node</span> settings are loading. Loading times may take a long time if large images have been added to the canvas!"
        );
        LS_Painters = await loadData();
        document.body.removeChild(message);
      } else {
        LS_Painters =
          localStorage.getItem("ComfyUI_Painter") &&
          JSON.parse(localStorage.getItem("ComfyUI_Painter"));

        if (!LS_Painters || LS_Painters === undefined) {
          localStorage.setItem("ComfyUI_Painter", JSON.stringify({}));
          LS_Painters = JSON.parse(localStorage.getItem("ComfyUI_Painter"));
        }
      }

      // Create node
      const onNodeCreated = nodeType.prototype.onNodeCreated;
      nodeType.prototype.onNodeCreated = async function () {
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        let PainerNode = app.graph._nodes.filter(
            (wi) => wi.type == "PainterNode"
          ),
          nodeName = `Paint_${PainerNode.length}`,
          nodeNamePNG = `${nodeName}.png`;

        console.log(`Create PainterNode: ${nodeName}`);

        if (LS_Painters && !Object.hasOwn(LS_Painters, nodeNamePNG)) {
          LS_Painters[nodeNamePNG] = {
            undo_history: [],
            redo_history: [],
            canvas_settings: { background: "#000000" },
            settings: {},
          };
          LS_Save();
        }

        PainterWidget.apply(this, [this, nodeNamePNG, {}, app]);
        setTimeout(() => {
          if (
            LS_Painters.hasOwnProperty(nodeNamePNG) &&
            LS_Painters[nodeNamePNG]?.settings?.currentCanvasSize
          ) {
            this.painter.currentCanvasSize =
              LS_Painters[nodeNamePNG].settings.currentCanvasSize;

            this.painter.setCanvasSize(
              this.painter.currentCanvasSize.width,
              this.painter.currentCanvasSize.height
            );
          }
          this.painter.uploadPaintFile(nodeNamePNG);
        }, 1);

        return r;
      };

      // ExtraMenuOptions
      const getExtraMenuOptions = nodeType.prototype.getExtraMenuOptions;
      nodeType.prototype.getExtraMenuOptions = function (_, options) {
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

            const img_ = new fabric.Image(this.imgs[0], {
              left: 0,
              top: 0,
              angle: 0,
              strokeWidth: 1,
            }).scale(0.3);
            this.painter.canvas.add(img_).renderAll();
            this.painter.uploadPaintFile(this.painter.node.name);
            this.painter.canvas.isDrawingMode = false;
            this.painter.drawning = false;
          };

          // Past as background
          options.splice(past_index + 1, 0, {
            content: "Paste background (Clipspace)",
            callback: () => {
              past_callback.apply(this, arguments);
              if (!this.imgs.length) return;

              const img_ = new fabric.Image(this.imgs[0], {
                left: 0,
                top: 0,
                angle: 0,
                strokeWidth: 1,
              });

              this.painter.canvas.setBackgroundImage(
                img_,
                () => {
                  this.painter.canvas.renderAll();
                  this.painter.uploadPaintFile(this.painter.node.name);
                },
                {
                  scaleX: this.painter.canvas.width / img_.width,
                  scaleY: this.painter.canvas.height / img_.height,
                  strokeWidth: 0,
                }
              );
            },
          });
        }
      };
      // end - ExtraMenuOptions
    }
  },
});
// ================= END CREATE EXTENSION ================
