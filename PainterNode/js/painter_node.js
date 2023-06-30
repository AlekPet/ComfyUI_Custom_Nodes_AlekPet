/*
 * Title: PainterNode ComflyUI from ControlNet
 * Author: AlekPet
 * Version: 2023.06.30
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { app } from "../scripts/app.js";
import { fabric } from "/lib/fabric.js";

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

function showHide() {
  Array.from(arguments).forEach(
    (el) =>
      (el.style.display =
        !el.style.display || el.style.display == "none" ? "block" : "none")
  );
}

window.LS_Painters = {};
function LS_Save() {
  ///console.log("Save:", LS_Painters);
  localStorage.setItem("ComfyUI_Painter", JSON.stringify(LS_Painters));
}
// ================= END FUNCTIONS ================

// ================= CLASS PAINTER ================
class Painter {
  constructor(node, canvas) {
    this.origX = 0;
    this.origY = 0;
    this.drawning = true;
    this.type = "Brush";

    this.lockX = false;
    this.lockY = false;
    this.lockScaleX = false;
    this.lockScaleY = false;
    this.lockRotate = false;

    this.node = node;
    this.undo_history = LS_Painters[node.name].undo_history || [];
    this.redo_history = LS_Painters[node.name].redo_history || [];
    this.history_change = false;
    this.canvas = this.initCanvas(canvas);
    this.image = node.widgets.find((w) => w.name === "image");
  }

  initCanvas(canvasEl) {
    this.canvas = new fabric.Canvas(canvasEl, {
      isDrawingMode: true,
      backgroundColor: "transparent",
    });

    this.canvas.setWidth(512);
    this.canvas.setHeight(512);

    this.canvas.backgroundColor = "#000000";

    return this.canvas;
  }

  makeElements() {
    const panelPaintBox = document.createElement("div");
    panelPaintBox.innerHTML = `<div class="painter_manipulation_box" f_name="Locks" style="display:none;">
    <div>
    <button id="lockX">Lock X</button>
    <button id="lockY">Lock Y</button>
    <button id="lockScaleX">Lock ScaleX</button>
    <button id="lockScaleY">Lock ScaleY</button>
    <button id="lockRotate">Lock Rotate</button>
    </div>
    </div>
    <div class="painter_drawning_box">
    <div class="painter_mode_box fieldset_box" f_name="Mode">
    <button id="painter_change_mode" title="Enable selection mode">Selection</button>
    </div>
    <div class="painter_drawning_elements" style="display:block;">
    <div class="painter_grid_style painter_shapes_box fieldset_box" f_name="Shapes">
    <button class="active" data-shape='Brush' title="Brush">B</button>
    <button data-shape='Erase' title="Erase">E</button>
    <button data-shape='Circle' title="Draw circle">◯</button>
    <button data-shape='Rect' title="Draw rectangle">▭</button>
    <button data-shape='Triangle' title="Draw triangle">△</button>
    <button data-shape='Line' title="Draw line">|</button>
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
    <input id="bgColor" type="color" value="#000000" data-label="BG" title="Background color">  
    </div>
    <div class="painter_stroke_box fieldset_box" f_name="Brush width">
    <input id="strokeWidth" type="number" min="0" max="150" value="5" step="1" title="Brush width">
    </div>
    </div>
    <div>
    </div>`;
    panelPaintBox.className = "panelPaintBox";

    this.canvas.wrapperEl.appendChild(panelPaintBox);

    this.manipulation_box = panelPaintBox.querySelector(
      ".painter_manipulation_box"
    );
    this.change_mode = panelPaintBox.querySelector("#painter_change_mode");
    this.shapes_box = panelPaintBox.querySelector(".painter_shapes_box");
    this.strokeWidth = panelPaintBox.querySelector("#strokeWidth");
    this.strokeColor = panelPaintBox.querySelector("#strokeColor");
    this.fillColor = panelPaintBox.querySelector("#fillColor");

    this.strokeColorTransparent = panelPaintBox.querySelector(
      "#strokeColorTransparent"
    );
    this.fillColorTransparent = panelPaintBox.querySelector(
      "#fillColorTransparent"
    );
    this.bgColor = panelPaintBox.querySelector("#bgColor");
    this.clear = panelPaintBox.querySelector("#clear");

    this.changePropertyBrush();
    this.bindEvents();
  }

  clearCanvas() {
    this.canvas.clear();
    this.canvas.backgroundColor = this.bgColor.value;
  }

  changeMode(b) {
    let target = b.target,
      nextElement = target.parentElement.nextElementSibling;

    if (this.drawning) {
      this.canvas.isDrawingMode = this.drawning = false;
      target.textContent = "Drawing";
      target.title = "Enable drawing mode";
      showHide(this.manipulation_box, nextElement);
    } else {
      this.canvas.discardActiveObject();
      this.canvas.isDrawingMode = this.drawning = true;

      if (!["Brush", "Erase"].includes(this.type))
        this.canvas.isDrawingMode = false;

      target.textContent = "Selection";
      target.title = "Enable selection mode";
      showHide(this.manipulation_box, nextElement);
      this.canvas.renderAll();
    }
  }

  setActiveElement(element_active) {
    let elementActive = this.shapes_box.querySelector(".active");
    if (elementActive) elementActive.classList.remove("active");
    element_active.classList.add("active");
  }

  changePropertyBrush(type = "Brush") {
    if (type == "Brush") {
      this.canvas.freeDrawingBrush = new fabric.PencilBrush(this.canvas);
      this.canvas.freeDrawingBrush.color = toRGBA(
        this.strokeColor.value,
        this.strokeColorTransparent.value
      );
    } else {
      this.canvas.freeDrawingBrush = new fabric.EraserBrush(this.canvas);
    }
    this.canvas.freeDrawingBrush.width = parseInt(this.strokeWidth.value, 10);
  }

  bindEvents() {
    // Button tools select
    this.shapes_box.onclick = (e) => {
      let target = e.target,
        currentTarget = target.dataset?.shape;

      if (currentTarget) {
        this.type = currentTarget;

        switch (currentTarget) {
          case "Erase":
          case "Brush":
            this.changePropertyBrush(currentTarget);
            this.canvas.isDrawingMode = true;
            break;
          default:
            this.canvas.isDrawingMode = false;
            break;
        }
        this.setActiveElement(target);
      }
    };
    // Button Mode select
    this.change_mode.onclick = (e) => this.changeMode(e);

    // Buttons Lock events
    this.manipulation_box.onclick = (e) => {
      let target = e.target,
        listButtons = [
          "lockX",
          "lockY",
          "lockScaleX",
          "lockScaleY",
          "lockRotate",
        ],
        index = listButtons.indexOf(target.id);
      if (index != -1) {
        let buttonSel = listButtons[index];
        this[buttonSel] = !this[buttonSel];
        if (this[buttonSel]) {
          target.classList.add("active");
        } else {
          target.classList.remove("active");
        }
      }
    };
    // Event input bgcolor
    this.bgColor.oninput = () => {
      this.canvas.backgroundColor = this.bgColor.value;
      this.canvas.renderAll();
    };
    // Event input stroke transparent
    this.strokeColorTransparent.oninput = () => {
      if (this.type == "Brush") {
        this.changePropertyBrush();
      }
    };
    // Event change stroke width
    this.strokeWidth.onchange = () => {
      if (["Brush", "Erase"].includes(this.type)) {
        this.changePropertyBrush(this.type);
      }
      this.canvas.renderAll();
    };

    this.canvas.on("mouse:down", (o) => {
      this.canvas.isDrawingMode = this.drawning;
      if (!this.canvas.isDrawingMode) return;

      let pointer = this.canvas.getPointer(o.e),
        shape = null;
      this.origX = pointer.x;
      this.origY = pointer.y;
      let colors = ["red", "blue", "green", "yellow", "purple", "orange"],
        strokeWidth = +this.strokeWidth.value,
        strokeColor =
          strokeWidth == 0
            ? "transparent"
            : toRGBA(
                this.strokeColor.value,
                this.strokeColorTransparent.value
              ) || colors[Math.floor(Math.random() * colors.length)],
        fillColor = toRGBA(
          this.fillColor.value,
          this.fillColorTransparent.value
        );

      if (this.type == "Rect") {
        shape = new fabric.Rect({
          left: this.origX,
          top: this.origY,
          originX: "left",
          originY: "top",
          width: pointer.x - this.origX,
          height: pointer.y - this.origY,
          angle: 0,
          fill: fillColor,
          strokeWidth: strokeWidth,
          stroke: strokeColor,
          transparentCorners: false,
          hasBorders: false,
          hasControls: false,
        });
      } else if (this.type == "Circle") {
        shape = new fabric.Circle({
          left: this.origX,
          top: this.origY,
          radius: 1,
          originX: "left",
          originY: "top",
          angle: 0,
          fill: fillColor,
          strokeWidth: strokeWidth,
          stroke: strokeColor,
          hasBorders: false,
          hasControls: false,
        });
      } else if (this.type == "Triangle") {
        shape = new fabric.Triangle({
          left: this.origX,
          top: this.origY,
          originX: "left",
          originY: "top",
          angle: 0,
          fill: fillColor,
          strokeWidth: strokeWidth,
          stroke: strokeColor,
          hasBorders: false,
          hasControls: false,
        });
      } else if (this.type == "Line") {
        let points = [pointer.x, pointer.y, pointer.x, pointer.y];
        shape = new fabric.Line(points, {
          fill: fillColor,
          strokeWidth: strokeWidth,
          stroke: strokeColor,
          hasBorders: false,
          hasControls: false,
        });
      }
      if (shape) {
        this.canvas.add(shape).renderAll().setActiveObject(shape);
      }
    });

    this.canvas.on("mouse:move", (o) => {
      if (!this.drawning) {
        try {
          let activeObjManipul = this.canvas.getActiveObject();
          activeObjManipul.set({
            hasControls: true,
            lockMovementX: this.lockX,
            lockMovementY: this.lockY,
            lockScalingX: this.lockScaleX,
            lockScalingY: this.lockScaleY,
            lockRotation: this.lockRotate,
          });
        } catch (e) {}
      }
      if (!this.canvas.isDrawingMode) {
        return;
      }

      if (["Brush", "Erase"].includes(this.type)) return;

      let pointer = this.canvas.getPointer(o.e),
        activeObj = this.canvas.getActiveObject();

      if (!activeObj) return;

      if (this.origX > pointer.x) {
        activeObj.set({ left: Math.abs(pointer.x) });
      }
      if (this.origY > pointer.y) {
        activeObj.set({ top: Math.abs(pointer.y) });
      }

      if (this.type == "Circle") {
        let radius =
          Math.max(
            Math.abs(this.origY - pointer.y),
            Math.abs(this.origX - pointer.x)
          ) / 2;
        if (radius > activeObj.strokeWidth) radius -= activeObj.strokeWidth / 2;
        activeObj.set({ radius: radius });
      } else if (this.type == "Line") {
        activeObj.set({ x2: pointer.x, y2: pointer.y });
      } else {
        activeObj.set({ width: Math.abs(this.origX - pointer.x) });
        activeObj.set({ height: Math.abs(this.origY - pointer.y) });
      }
      activeObj.setCoords();
      this.canvas.renderAll();
    });

    this.canvas.on("mouse:up", (o) => {
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
              mouseUpHandler: removeObject,
              render: renderIcon(removeImg),
              cornerSize: 24,
            }),
          };
        }
      });

      if (!["Brush", "Erase"].includes(this.type)) {
        this.canvas.isDrawingMode = false;
      }
      this.canvas.renderAll();
      this.uploadPaintFile(this.node.name);
    });

    this.canvas.on("object:moving", (o) => {
      this.canvas.isDrawingMode = false;
    });

    this.canvas.on("object:modified", () => {
      this.canvas.isDrawingMode = false;
      this.uploadPaintFile(this.node.name);
    });
  }

  uploadPaintFile(fileName) {
    // Upload paint to temp folder ComfyUI

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
      formData.append("type", "temp");
      uploadFile(formData);
    }, "image/png");
    // - end

    const callb = this.node.callback,
      self = this;
    this.image.callback = function () {
      this.image.value = self.node.name;
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

    draw: function (ctx, _, widgetWidth, y, widgetHeight) {
      const t = ctx.getTransform(),
        margin = 10,
        left_offset = 9,
        top_offset = 30,
        visible = app.canvas.ds.scale > 0.6 && this.type === "painter_widget",
        w = (widgetWidth - margin * 2 - 80) * t.a;

      Object.assign(this.painter_wrap.style, {
        left: `${t.a * margin * left_offset + t.e}px`,
        top: `${t.d * (y + widgetHeight - margin - 3 + top_offset) + t.f}px`,
        width: w + "px",
        height: w + "px",
        position: "absolute",
        zIndex: app.graph._nodes.indexOf(node),
      });

      Object.assign(this.painter_wrap.children[0].style, {
        width: w + "px",
        height: w + "px",
      });

      Object.assign(this.painter_wrap.children[1].style, {
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
            width: `${40 * t.a}px`,
            height: `${21 * t.d}px`,
            fontSize: `${t.d * 10.0}px`,
          });
        } else if (element.tagName == "SPAN") {
          // NOPE
        } else if (element.tagName == "DIV") {
          Object.assign(element.style, {
            width: `${88 * t.a}px`,
            left: `${-90 * t.a}px`,
          });
        } else {
          Object.assign(element.style, {
            cursor: "pointer",
            width: `${
              (element.id.includes("lock")
                ? 75
                : element.id.includes("painter_change_mode")
                ? 84
                : 25) * t.a
            }px`,
            height: `${(element.id.includes("lock") ? 15 : 25) * t.d}px`,
            fontSize: `${t.d * 10.0}px`,
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

  let widgetCombo = node.widgets.filter((w) => w.type === "combo");
  widgetCombo[0].value = node.name;

  widget.painter_wrap = node.painter.canvas.wrapperEl;
  widget.parent = node;

  node.painter.makeElements();

  // Create elements undo, redo, clear history
  // let panelButtons = document.createElement("div"),
  //   undoButton = document.createElement("button"),
  //   redoButton = document.createElement("button"),
  //   historyClearButton = document.createElement("button");

  // panelButtons.className = "panelButtons";
  // undoButton.textContent = "⟲";
  // redoButton.textContent = "⟳";
  // historyClearButton.textContent = "✖";
  // undoButton.title = "Undo";
  // redoButton.title = "Redo";
  // historyClearButton.title = "Clear History";

  // undoButton.addEventListener("click", () => node.painter.undo());
  // redoButton.addEventListener("click", () => node.painter.redo());
  // historyClearButton.addEventListener("click", () => {
  //   if (confirm(`Delete all pose history of a node "${node.name}"?`)) {
  //     node.painter.undo_history = [];
  //     node.painter.redo_history = [];

  //     node.painter.undo_history.push(node.openPose.getJSON());
  //     node.painter.history_change = true;
  //     node.painter.updateHistoryData();
  //   }
  // });

  // panelButtons.appendChild(undoButton);
  // panelButtons.appendChild(redoButton);
  // panelButtons.appendChild(historyClearButton);
  // node.painter.canvas.wrapperEl.appendChild(panelButtons);
  document.body.appendChild(widget.painter_wrap);

  node.addWidget("button", "Clear Canvas", "clear_painer", () => {
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
    .active {
      color: red;
      font-weight: bold;
      border: 1px solid;
    }
    .painter_manipulation_box {
      position: absolute;
      left: 50%;
      top: -20px;
      transform: translateX(-50%);
      width: 100%;
    }
    .painter_manipulation_box > div {
      display: flex;
      gap: 2px;
      justify-content: center;
    }
    .painter_manipulation_box > div button {
      font-size: 0.5rem;
    }
    .painter_drawning_box {
      position: absolute;
      top: 0;
      //left: -20%;
      width: 88px;
    }
    .painter_drawning_box button {
      width: 24px;
    }
    .painter_colors_box, .painter_mode_box, .painter_stroke_box {
      display: flex;
      flex-direction: column;
      gap: 2px;
      align-items: center;
    }
    .painter_drawning_box input[type="number"] {
      width: 2.6rem;
    }
    .painter_colors_box input[type="color"] {
      width: 1.5rem;
      height: 1.5rem;
      padding: 0;
      margin-bottom: 5px;
    }    
    .painter_colors_box #bgColor:after
    {
      content: attr(data-label);
      position: absolute;
      color: white;
      left: 70%;
      font-size: 0.5rem;
      margin-top: -18%;
    }
    .painter_colors_box input[type="color"]::-webkit-color-swatch-wrapper {
      padding: 1px !important;
    }
    .painter_grid_style{
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
    .painter_colors_alpha{
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
    }`;
    document.head.appendChild(style);
  },
  async setup(app) {
    let PainerNode = app.graph._nodes.filter((wi) => wi.type == "PainterNode");

    if (PainerNode.length) {
      PainerNode.map((n) => {
        console.log(`Setup PainterNode: ${n.name}`);
        let widgetImage = n.widgets.find((w) => w.name == "image");
        if (widgetImage && Object.hasOwn(LS_Painters, n.name)) {
          let painter_ls = LS_Painters[n.name].undo_history;
          n.setSize([530, 550]);
          /*n.painter.loadPreset(
            painter_ls.length > 0
              ? painter_ls[painter_ls.length - 1]
              : { keypoints: [] }
          );*/
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
          };
          LS_Save();
        }

        PainterWidget.apply(this, [this, nodeNamePNG, {}, app]);
        setTimeout(() => {
          this.painter.uploadPaintFile(nodeNamePNG);
        }, 1);

        this.setSize([530, 550]);

        return r;
      };
    }
  },
});
// ================= END CREATE EXTENSION ================
