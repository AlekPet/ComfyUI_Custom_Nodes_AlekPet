/*
 * Title: PainterNode ComflyUI from ControlNet
 * Author: AlekPet
 * Version: 2023.09.02
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";
import { fabric } from "../../lib/fabric.js";

// ================= FUNCTIONS ================
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

function showHide({ elements = [], hide = null }) {
  Array.from(elements).forEach((el) => {
    if (hide !== null) {
      el.style.display = !hide ? "block" : "none";
    } else {
      el.style.display =
        !el.style.display || el.style.display == "none" ? "block" : "none";
    }
  });
}

window.LS_Painters = {};
function LS_Save() {
  // console.log("Save:", LS_Painters);
  localStorage.setItem("ComfyUI_Painter", JSON.stringify(LS_Painters));
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
    this.undo_history = LS_Painters[node.name].undo_history || [];
    this.redo_history = LS_Painters[node.name].redo_history || [];
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
    <div class="painter_drawning_box_property" style="display: block;">
    <div class="property_textBox comfy-menu-btns" style="display:none;">
    <button id="prop_fontStyle" title="Italic" style="font-style:italic;">I</button>
    <button id="prop_fontWeight" title="Bold" style="font-weight:bold;">B</button>
    <button id="prop_underline" title="Underline" style="text-decoration: underline;">U</button>
    <div class="separator"></div>
    <select class="font_family_select"></select>
    </div>
    </div>
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
    <div class="painter_stroke_box fieldset_box" f_name="Brush width">
    <input id="strokeWidth" type="number" min="0" max="150" value="5" step="1" title="Brush width">
    </div>
    <div class="painter_grid_style painter_bg_setting fieldset_box comfy-menu-btns" f_name="Background">
    <input id="bgColor" type="color" value="#000000" data-label="BG" title="Background color">
    <button bgImage="img_load" title="Add background image">IMG</button>
    <button bgImage="img_reset" title="Remove background image">IMG <span style="color: var(--error-text);">✖</span></button>
    </div>
    </div>
    <div>
    </div>`;

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
    this.property_textBox =
      this.painter_drawning_box_property.querySelector(".property_textBox");

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
    ] = this.painter_drawning_elements.children;

    // Make select font
    this.font_family_select = this.property_textBox.querySelector(
      ".font_family_select"
    );

    for (let f in this.fonts) {
      let option = document.createElement("option");
      if (f === "Arial") option.setAttribute("selected", true);
      option.value = this.fonts[f];
      option.textContent = f;
      this.font_family_select.appendChild(option);
    }
    //
    this.change_mode = panelPaintBox.querySelector("#painter_change_mode");
    this.painter_shapes_box = panelPaintBox.querySelector(
      ".painter_shapes_box"
    );
    this.strokeWidth = panelPaintBox.querySelector("#strokeWidth");
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

    this.bgImageFile = document.createElement("input");
    Object.assign(this.bgImageFile, {
      accept: "image/jpeg,image/png,image/webp",
      type: "file",
      style: "display:none",
    });

    this.painter_bg_setting.appendChild(this.bgImageFile);
    this.changePropertyBrush();
    this.bindEvents();
  }

  clearCanvas() {
    this.canvas.clear();
    this.canvas.backgroundColor = this.bgColor.value;
    this.canvas.requestRenderAll();
    LS_Painters[this.node.name].canvas_settings = [];
    LS_Save();
  }

  viewListObjects(list_body) {
    list_body.innerHTML = "";

    let objectNames = [];
    this.canvas.getObjects().forEach((o) => {
      let type = o.type,
        obEl = document.createElement("button"),
        countType = objectNames.filter((t) => t == type).length + 1,
        text_value = type + `_${countType}`;

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

      list_body.appendChild(obEl);
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

      if (!["Brush", "Erase", "Image", "Textbox"].includes(this.type))
        this.canvas.isDrawingMode = false;
    }

    if (!this.mode) {
      target.textContent = "Drawing";
      target.title = "Enable drawing mode";
      this.viewListObjects(this.list_objects_panel__items);
      showHide({
        elements: [
          this.manipulation_box,
          nextElement,
          panelListObjects,
          this.painter_drawning_box_property,
        ],
      });
      this.clearLocks();
      this.painter_shapes_box_modify.appendChild(this.painter_colors_box);
      this.painter_shapes_box_modify.appendChild(this.painter_stroke_box);
    } else {
      target.textContent = "Selection";
      target.title = "Enable selection mode";
      showHide({
        elements: [
          this.manipulation_box,
          nextElement,
          panelListObjects,
          this.painter_drawning_box_property,
        ],
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

  // Chancge properties brush and shapes, when change color and strokeWidth
  changePropertyBrush(type = "Brush") {
    if (type == "Brush") {
      this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
      this.canvas.freeDrawingBrush.color = toRGBA(
        this.strokeColor.value,
        this.strokeColorTransparent.value
      );
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
      this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas);
    }
    this.canvas.freeDrawingBrush.width = parseInt(this.strokeWidth.value, 10);
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

  selectPropertyToolbar(type) {
    if (["Textbox"].includes(this.type)) {
      this.property_textBox.style.display = "block";
    } else {
      this.property_textBox.style.display = "none";
    }
  }

  bindEvents() {
    // Button tools select
    this.painter_shapes_box.onclick = (e) => {
      let target = e.target,
        currentTarget = target.dataset?.shape;
      if (currentTarget) {
        this.type = currentTarget;

        switch (currentTarget) {
          case "Erase":
          case "Brush":
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
        this.setActiveElement(target, this.painter_shapes_box);
        this.selectPropertyToolbar(this.type);
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
          this.locks[buttonSel] = !this[buttonSel];
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

    this.painter_drawning_box_property.onclick = (e) => {
      let target = e.target,
        listButtonsStyles = [
          "prop_fontStyle",
          "prop_fontWeight",
          "prop_underline",
        ],
        index = listButtonsStyles.indexOf(target.id);
      if (index != -1) {
        if (listButtonsStyles[index].includes("prop_")) {
          let buttonSelStyle = listButtonsStyles[index].replace("prop_", ""),
            activeOb = this.canvas.getActiveObject();

          if (activeOb.type === "textbox") {
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

                this.setActiveStyle("fill", toRGBA(this.fillColor.value));

                break;
            }
          }
        }
      }
    };

    // Select front event
    this.font_family_select.onchange = (e) => {
      if (this.getActiveStyle("fontFamily") != this.font_family_select.value)
        this.setActiveStyle("fontFamily", this.font_family_select.value);
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

    // Event inputs stroke, fill colors and transparent
    this.strokeColorTransparent.oninput =
      this.strokeColor.oninput =
      this.fillColor.oninput =
      this.fillColorTransparent.oninput =
        () => {
          if (
            ["Brush", "Textbox", "Image", "Erase"].includes(this.type) ||
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

    // Event change stroke width
    this.strokeWidth.onchange = () => {
      if (
        ["Brush", "Erase", "Textbox", "Image"].includes(this.type) ||
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
        this.painter_drawning_box_property
          .querySelector(`#prop_${style}`)
          .classList[check ? "remove" : "add"]("active");
      };

      targets.forEach((target) => {
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

        if (!this.drawning && !["Erase", "Brush"].includes(target.type)) {
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

        if (["Brush", "Erase"].includes(this.type)) return;

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

        if (["Brush", "Erase"].includes(this.type)) return;

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

        if (!["Brush", "Erase", "Image", "Textbox"].includes(this.type))
          this.canvas.isDrawingMode = false;

        this.canvas.renderAll();
        this.uploadPaintFile(this.node.name);
      },

      // Object moving event
      "object:moving": (o) => {
        this.canvas.isDrawingMode = false;
      },

      // Object modify event
      "object:modified": () => {
        this.canvas.isDrawingMode = false;
        this.uploadPaintFile(this.node.name);
      },
    });
    // ----- Canvas Events -----
  }

  // Save canvas data to localStorage
  canvasSaveLocalStorage() {
    try {
      const data = this.canvas.toJSON();
      LS_Painters[this.node.name].canvas_settings = JSON.stringify(data);
      LS_Save();
    } catch (e) {
      console.error(e);
    }
  }
  // Load canvas data to localStorage
  canvasLoadLocalStorage(json) {
    try {
      if (
        json.hasOwnProperty("canvas_settings") &&
        json.canvas_settings.length > 0
      ) {
        const data = JSON.parse(LS_Painters[this.node.name].canvas_settings);
        this.canvas.loadFromJSON(data, () => {
          this.canvas.renderAll();
          this.bgColor.value = getColorHEX(data.background).color || "";
        });
      }
    } catch (e) {
      console.error(e);
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
          this.canvasSaveLocalStorage();
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
        top_offset = 30,
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
        height: w + "px",
      });

      Object.assign(this.painter_wrap.children[1].style, {
        transformOrigin: "0 0",
        transform: scale,
        width: w + "px",
        height: w + "px",
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

          if (element.id.includes("lock")) sizesEl = { w: 75, h: 15, fs: 10 };
          if (element.id.includes("zpos")) sizesEl = { w: 80, h: 15, fs: 7 };
          if (element.id.includes("painter_change_mode")) sizesEl.w = 75;
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

  node.painter.canvas.setWidth(512);
  node.painter.canvas.setHeight(512);

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
    if (w <= 531) w = 530;
    if (h <= 571) h = 570;

    if (w > 531) {
      h = w + 40;
    }

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

          let x = w / 2 - 20;
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
      n = graph._nodes[n];
      for (let w in n.widgets) {
        let wid = n.widgets[w];
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
app.registerExtension({
  name: "Comfy.PainterNode",
  async init(app) {
    // Any initial setup to run as soon as the page loads
    let style = document.createElement("style");
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
      top: -40px;
      width: 88px;
    }
    .painter_drawning_box button {
      width: 24px;
    }
    .painter_drawning_box_property {
      position: absolute;
      top: -36px;
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
      margin: 0 2px 0 2px;
  }
    .painter_colors_box,
    .painter_mode_box,
    .painter_stroke_box {
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
    }
    .fieldset_box:before {
      content: attr(f_name) ":";
      font-size: 0.6rem;
      position: absolute;
      top: -10px;
      color: yellow;
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
    .list_objects_panel__items::-webkit-scrollbar {
      width: 8px;
    }
    .list_objects_panel__items::-webkit-scrollbar-track {
      background-color: var(--descrip-text);
    }
    .list_objects_panel__items::-webkit-scrollbar-thumb {
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
    `;
    document.head.appendChild(style);
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
          n.setSize([530, 570]);
          n.painter.canvasLoadLocalStorage(painter_ls);
        }
      });
    }
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PainterNode") {
      const onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = function () {
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        let PainerNode = app.graph._nodes.filter(
            (wi) => wi.type == "PainterNode"
          ),
          nodeName = `Paint_${PainerNode.length}`,
          nodeNamePNG = `${nodeName}.png`;

        console.log(`Create PainterNode: ${nodeName}`);

        LS_Painters =
          localStorage.getItem("ComfyUI_Painter") &&
          JSON.parse(localStorage.getItem("ComfyUI_Painter"));
        if (!LS_Painters) {
          localStorage.setItem("ComfyUI_Painter", JSON.stringify({}));
          LS_Painters = JSON.parse(localStorage.getItem("ComfyUI_Painter"));
        }

        if (!Object.hasOwn(LS_Painters, nodeNamePNG)) {
          LS_Painters[nodeNamePNG] = {
            undo_history: [],
            redo_history: [],
            canvas_settings: [],
            settings: {},
          };
          LS_Save();
        }

        PainterWidget.apply(this, [this, nodeNamePNG, {}, app]);
        setTimeout(() => {
          this.painter.uploadPaintFile(nodeNamePNG);
        }, 1);

        this.setSize([530, 570]);

        return r;
      };
    }
  },
});
// ================= END CREATE EXTENSION ================
