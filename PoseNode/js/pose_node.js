/*
 * Title: Set Poses in ComflyUI from ControlNet
 * Author: AlekPet
 * Description: I rewrote the main.js file as a class, from fkunn1326's openpose-editor (https://github.com/fkunn1326/openpose-editor/blob/master/javascript/main.js)
 * Version: 2024.07.21
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { app } from "../../scripts/app.js";
import { $el } from "../../../scripts/ui.js";
import { addStylesheet } from "../../scripts/utils.js";
import { fabric } from "./lib/posenode/fabric.js";

fabric.Object.prototype.transparentCorners = false;
fabric.Object.prototype.cornerColor = "#108ce6";
fabric.Object.prototype.borderColor = "#108ce6";
fabric.Object.prototype.cornerSize = 10;

const connect_keypoints = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [1, 5],
  [5, 6],
  [6, 7],
  [1, 8],
  [8, 9],
  [9, 10],
  [1, 11],
  [11, 12],
  [12, 13],
  [0, 14],
  [14, 16],
  [0, 15],
  [15, 17],
];

const connect_color = [
  [0, 0, 255],
  [255, 0, 0],
  [255, 170, 0],
  [255, 255, 0],
  [255, 85, 0],
  [170, 255, 0],
  [85, 255, 0],
  [0, 255, 0],
  [0, 255, 85],
  [0, 255, 170],
  [0, 255, 255],
  [0, 170, 255],
  [0, 85, 255],
  [85, 0, 255],
  [170, 0, 255],
  [255, 0, 255],
  [255, 0, 170],
  [255, 0, 85],
];

const default_keypoints = [
  [241, 77],
  [241, 120],
  [191, 118],
  [177, 183],
  [163, 252],
  [298, 118],
  [317, 182],
  [332, 245],
  [225, 241],
  [213, 359],
  [215, 454],
  [270, 240],
  [282, 360],
  [286, 456],
  [232, 59],
  [253, 60],
  [225, 70],
  [260, 72],
];

window.LS_Poses = {};

function LS_Save() {
  localStorage.setItem("ComfyUI_Poses", JSON.stringify(LS_Poses));
}

function resizeCanvas(node, sizes) {
  const { width, height } = sizes ?? node.openPose.currentCanvasSize;

  node.openPose.canvas.setDimensions({
    width: width,
    height: height,
  });

  node.openPose.canvas.getElement().width = width;
  node.openPose.canvas.getElement().height = height;

  node.openPose.canvas.renderAll();
  app.graph.setDirtyCanvas(true, false);
}

class OpenPose {
  constructor(node, canvasElement) {
    this.lockMode = false;
    this.visibleEyes = true;
    this.flipped = false;
    this.node = node;
    this.undo_history = LS_Poses[node.name].undo_history || [];
    this.redo_history = LS_Poses[node.name].redo_history || [];
    this.history_change = false;
    this.currentCanvasSize = { width: 512, height: 512 };

    this.canvas = this.initCanvas(canvasElement);
    this.image = node.widgets.find((w) => w.name === "image");
  }

  setCanvasSize(new_width, new_height, resetPose = false) {
    resizeCanvas(this.node, {
      width: new_width,
      height: new_height,
    });

    this.currentCanvasSize = { width: new_width, height: new_height };

    // Check isset local storage key currentCanvasSize
    if (!LS_Poses[this.node.name].hasOwnProperty("currentCanvasSize"))
      LS_Poses[this.node.name]["currentCanvasSize"] = {};

    LS_Poses[this.node.name]["currentCanvasSize"] = this.currentCanvasSize;

    this.node.title = `${this.node.type} - ${new_width}x${new_height}`;
    resetPose && this.resetCanvas();
    this.canvas.renderAll();
    app.graph.setDirtyCanvas(true, false);
    this.node.onResize();
    LS_Save();
  }

  setPose(keypoints) {
    const tmpImage = this.canvas.backgroundImage;
    this.canvas.clear();

    if (tmpImage) this.setBackground(tmpImage);

    this.canvas.backgroundColor = "#000";
    this.canvas.renderAll();

    const res = [];
    for (let i = 0; i < keypoints.length; i += 18) {
      const chunk = keypoints.slice(i, i + 18);
      res.push(chunk);
    }

    for (let item of res) {
      this.addPose(item);
      this.canvas.discardActiveObject();
    }
  }

  addPose(keypoints = undefined) {
    if (keypoints === undefined) {
      keypoints = default_keypoints;
    }

    const group = new fabric.Group();

    const makeCircle = (
      color,
      left,
      top,
      line1,
      line2,
      line3,
      line4,
      line5
    ) => {
      let c = new fabric.Circle({
        left: left,
        top: top,
        strokeWidth: 1,
        radius: 5,
        fill: color,
        stroke: color,
      });

      c.hasControls = c.hasBorders = false;
      c.line1 = line1;
      c.line2 = line2;
      c.line3 = line3;
      c.line4 = line4;
      c.line5 = line5;

      return c;
    };

    const makeLine = (coords, color) => {
      return new fabric.Line(coords, {
        fill: color,
        stroke: color,
        strokeWidth: 10,
        selectable: false,
        evented: false,
      });
    };

    const lines = [];
    const circles = [];

    for (let i = 0; i < connect_keypoints.length; i++) {
      // 接続されるidxを指定　[0, 1]なら0と1つなぐ
      const item = connect_keypoints[i];
      const line = makeLine(
        keypoints[item[0]].concat(keypoints[item[1]]),
        `rgba(${connect_color[i].join(", ")}, 0.7)`
      );
      lines.push(line);
      this.canvas.add(line);
    }

    for (let i = 0; i < keypoints.length; i++) {
      let list = [];

      connect_keypoints.filter((item, idx) => {
        if (item.includes(i)) {
          list.push(lines[idx]);
          return idx;
        }
      });
      const circle = makeCircle(
        `rgb(${connect_color[i].join(", ")})`,
        keypoints[i][0],
        keypoints[i][1],
        ...list
      );
      circle["id"] = i;
      circles.push(circle);
      group.addWithUpdate(circle);
    }

    this.canvas.discardActiveObject();
    this.canvas.setActiveObject(group);
    this.canvas.add(group);
    group.toActiveSelection();
    this.canvas.requestRenderAll();
  }

  initCanvas() {
    this.canvas = new fabric.Canvas(this.canvas, {
      backgroundColor: "#000",
      preserveObjectStacking: true,
    });

    const updateLines = (target) => {
      if ("_objects" in target) {
        const flipX = target.flipX ? -1 : 1;
        const flipY = target.flipY ? -1 : 1;
        this.flipped = flipX * flipY === -1;
        const showEyes = this.flipped ? !this.visibleEyes : this.visibleEyes;

        if (target.angle === 0) {
          const rtop = target.top;
          const rleft = target.left;
          for (const item of target._objects) {
            let p = item;
            p.scaleX = 1;
            p.scaleY = 1;
            const top =
              rtop +
              p.top * target.scaleY * flipY +
              (target.height * target.scaleY) / 2;
            const left =
              rleft +
              p.left * target.scaleX * flipX +
              (target.width * target.scaleX) / 2;
            p["_top"] = top;
            p["_left"] = left;
            if (p["id"] === 0) {
              p.line1 && p.line1.set({ x1: left, y1: top });
            } else {
              p.line1 && p.line1.set({ x2: left, y2: top });
            }
            if (p["id"] === 14 || p["id"] === 15) {
              p.radius = showEyes ? 5 : 0;
              if (p.line1) p.line1.strokeWidth = showEyes ? 10 : 0;
              if (p.line2) p.line2.strokeWidth = showEyes ? 10 : 0;
            }
            p.line2 && p.line2.set({ x1: left, y1: top });
            p.line3 && p.line3.set({ x1: left, y1: top });
            p.line4 && p.line4.set({ x1: left, y1: top });
            p.line5 && p.line5.set({ x1: left, y1: top });
          }
        } else {
          const aCoords = target.aCoords;
          const center = {
            x: (aCoords.tl.x + aCoords.br.x) / 2,
            y: (aCoords.tl.y + aCoords.br.y) / 2,
          };
          const rad = (target.angle * Math.PI) / 180;
          const sin = Math.sin(rad);
          const cos = Math.cos(rad);

          for (const item of target._objects) {
            let p = item;
            const p_top = p.top * target.scaleY * flipY;
            const p_left = p.left * target.scaleX * flipX;
            const left = center.x + p_left * cos - p_top * sin;
            const top = center.y + p_left * sin + p_top * cos;
            p["_top"] = top;
            p["_left"] = left;
            if (p["id"] === 0) {
              p.line1 && p.line1.set({ x1: left, y1: top });
            } else {
              p.line1 && p.line1.set({ x2: left, y2: top });
            }
            if (p["id"] === 14 || p["id"] === 15) {
              p.radius = showEyes ? 5 : 0.3;
              if (p.line1) p.line1.strokeWidth = showEyes ? 10 : 0;
              if (p.line2) p.line2.strokeWidth = showEyes ? 10 : 0;
            }
            p.line2 && p.line2.set({ x1: left, y1: top });
            p.line3 && p.line3.set({ x1: left, y1: top });
            p.line4 && p.line4.set({ x1: left, y1: top });
            p.line5 && p.line5.set({ x1: left, y1: top });
          }
        }
      } else {
        var p = target;
        if (p["id"] === 0) {
          p.line1 && p.line1.set({ x1: p.left, y1: p.top });
        } else {
          p.line1 && p.line1.set({ x2: p.left, y2: p.top });
        }
        p.line2 && p.line2.set({ x1: p.left, y1: p.top });
        p.line3 && p.line3.set({ x1: p.left, y1: p.top });
        p.line4 && p.line4.set({ x1: p.left, y1: p.top });
        p.line5 && p.line5.set({ x1: p.left, y1: p.top });
      }
      this.canvas.renderAll();
    };

    this.canvas.on("object:moving", (e) => {
      updateLines(e.target);
      this.canvas.renderAll();
    });

    this.canvas.on("object:scaling", (e) => {
      updateLines(e.target);
      this.canvas.renderAll();
    });

    this.canvas.on("object:rotating", (e) => {
      updateLines(e.target);
      this.canvas.renderAll();
    });

    this.canvas.on("object:modified", (e) => {
      if (
        this.lockMode ||
        this.canvas.getActiveObject().type == "activeSelection"
      ) {
        this.uploadPoseFile(this.node.name);
        return;
      }

      this.undo_history.push(this.getJSON());
      this.redo_history.length = 0;
      this.history_change = true;
      this.uploadPoseFile(this.node.name);
    });

    if (!LS_Poses[this.node.name].undo_history.length) {
      this.setPose(default_keypoints);
      this.undo_history.push(this.getJSON());
    }
    return this.canvas;
  }

  undo() {
    if (this.undo_history.length > 0) {
      this.lockMode = true;
      if (this.undo_history.length > 1)
        this.redo_history.push(this.undo_history.pop());

      const content = this.undo_history[this.undo_history.length - 1];
      this.loadPreset(content);
      this.canvas.renderAll();
      this.lockMode = false;
      this.history_change = true;
      this.uploadPoseFile(this.node.name);
    }
  }

  redo() {
    if (this.redo_history.length > 0) {
      this.lockMode = true;
      const content = this.redo_history.pop();
      this.undo_history.push(content);
      this.loadPreset(content);

      this.canvas.renderAll();
      this.lockMode = false;
      this.history_change = true;
      this.uploadPoseFile(this.node.name);
    }
  }

  resetCanvas(reset_size = false) {
    if (reset_size && confirm("Reset canvas size?")) {
      this.setCanvasSize(512, 512);
    }

    const backgroundImg = this.canvas.backgroundImage;
    this.canvas.clear();
    this.canvas.backgroundColor = "#000";
    this.addPose();

    this.setBackground(backgroundImg);
    this.uploadPoseFile(this.node.name);
  }

  setBackground(backgroundImg) {
    if (backgroundImg) {
      this.canvas.setBackgroundImage(
        backgroundImg,
        this.canvas.renderAll.bind(this.canvas),
        {
          scaleX: this.canvas.width / backgroundImg.width,
          scaleY: this.canvas.height / backgroundImg.height,
        }
      );
    }
  }

  updateHistoryData() {
    if (this.history_change) {
      LS_Poses[this.node.name].undo_history = this.undo_history;
      LS_Poses[this.node.name].redo_history = this.redo_history;
      LS_Save();
      this.history_change = false;
    }
  }

  uploadPoseFile(fileName) {
    // Upload pose to temp folder ComfyUI
    const hideShowControls = (show) => {
      if (!this.canvas.isDrawingMode) {
        const activeObj = this.canvas.getActiveObject();

        if (activeObj?.type === "activeSelection") {
          activeObj.hasControls = show;
          activeObj.hasBorders = show;
          this.canvas.renderAll();
        }
      }
    };

    hideShowControls(false);

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
          this.updateHistoryData();

          hideShowControls(true);
        } else {
          alert(resp.status + " - " + resp.statusText);
        }
      } catch (error) {
        hideShowControls(true);
        console.log(error);
      }
    };

    //Temporarily hide background image
    let tmp_BackgroundImg = this.canvas.backgroundImage;
    this.canvas.backgroundImage = null;
    this.canvas.renderAll();

    this.canvas.lowerCanvasEl.toBlob(function (blob) {
      let formData = new FormData();
      formData.append("image", blob, fileName);
      formData.append("overwrite", "true");
      formData.append("type", "temp");
      uploadFile(formData);
    }, "image/png");
    // - end

    //Set the background back
    this.setBackground(tmp_BackgroundImg);

    const callb = this.node.callback,
      self = this;
    this.image.callback = function () {
      this.image.value = self.node.name;
      if (callb) {
        return callb.apply(this, arguments);
      }
    };
  }

  onLoadBackground(e) {
    try {
      const file = this.backgroundInput.files[0];
      const url = URL.createObjectURL(file);
      fabric.Image.fromURL(url, (img) => {
        img.set({
          originX: "left",
          originY: "top",
          opacity: 0.5,
        });
        this.canvas.setBackgroundImage(
          img,
          this.canvas.renderAll.bind(this.canvas),
          {
            scaleX: this.canvas.width / img.width,
            scaleY: this.canvas.height / img.height,
          }
        );
      });
    } catch (err) {}
  }

  getJSON() {
    const json = {
      keypoints: this.canvas
        .getObjects()
        .filter((item) => {
          if (item.type === "circle") return item;
        })
        .map((item) => {
          return [Math.round(item.left), Math.round(item.top)];
        }),
    };

    return json;
  }

  loadPreset(json) {
    try {
      if (json["keypoints"].length % 18 === 0) {
        this.setPose(json["keypoints"]);
      } else {
        throw new Error("keypoints is invalid");
      }
    } catch (e) {
      console.error(e);
    }
  }
}

// Create OpenPose widget
function createOpenPose(node, inputName, inputData, app) {
  node.name = inputName;
  const widget = {
    type: "openpose",
    name: `w${inputName}`,

    draw: function (ctx, _, widgetWidth, y, widgetHeight) {
      const margin = 10,
        visible = app.canvas.ds.scale > 0.5 && this.type === "openpose",
        clientRectBound = ctx.canvas.getBoundingClientRect(),
        transform = new DOMMatrix()
          .scaleSelf(
            clientRectBound.width / ctx.canvas.width,
            clientRectBound.height / ctx.canvas.height
          )
          .multiplySelf(ctx.getTransform())
          .translateSelf(margin, margin + y),
        w = (widgetWidth - margin * 2 - 3) * transform.a;

      let aspect_ratio = 1;
      if (node.openPose.canvas.width !== node.openPose.canvas.height) {
        aspect_ratio = node.openPose.canvas.width / node.openPose.canvas.height;
      }

      Object.assign(this.openpose.style, {
        left: `${transform.a * margin + transform.e}px`,
        top: `${transform.d + transform.f}px`,
        width: w + "px",
        height: w / aspect_ratio + "px",
        position: "absolute",
        zIndex: app.graph._nodes.indexOf(node),
      });

      Object.assign(this.openpose.children[0].style, {
        width: w + "px",
        height: w / aspect_ratio + "px",
      });

      Object.assign(this.openpose.children[1].style, {
        width: w + "px",
        height: w / aspect_ratio + "px",
      });

      Array.from(this.openpose.children[2].children).forEach((element) => {
        Object.assign(element.style, {
          width: `${28.0 * transform.a}px`,
          height: `${22.0 * transform.d}px`,
          fontSize: `${transform.d * 10.0}px`,
        });

        if (element.classList.contains("posenode_cnavas_size")) {
          const svg = element.children[0];

          Object.assign(element.style, {
            height: `${28.0 * transform.d}px`,
          });

          Object.assign(svg.style, {
            width: `${20.0 * transform.a}px`,
            height: `${20.0 * transform.d}px`,
          });
        }

        element.hidden = !visible;
      });
    },
  };

  // Fabric canvas
  let canvasOpenPose = document.createElement("canvas");
  node.openPose = new OpenPose(node, canvasOpenPose);

  node.openPose.canvas.setWidth(512);
  node.openPose.canvas.setHeight(512);

  let widgetCombo = node.widgets.filter((w) => w.type === "combo");
  widgetCombo[0].value = node.name;

  widget.openpose = node.openPose.canvas.wrapperEl;
  widget.parent = node;

  // Create elements undo, redo, clear history
  let panelButtons = $el("div.pose_panelButtons.comfy-menu-btns", [
    $el("button", {
      textContent: "Ref",
      title: "Reference Image (Right click remove)",
      onclick: () => {
        node.openPose.backgroundInput.value = "";
        node.openPose.backgroundInput.click();
      },
      oncontextmenu: (e) => {
        e.preventDefault();

        let menu = panelButtons.querySelector(".pose_context_menu");
        if (menu) {
          menu.remove();
        }

        menu = $el(
          "div.pose_context_menu",
          {
            onclick: (event) => {
              let { target } = event;

              if (!target.classList.contains("pose_btn_context")) return;

              if (target.classList.contains("remBG")) {
                node.openPose.canvas.backgroundImage = null;
                node.openPose.canvas.renderAll();
              }
            },
            onmouseleave: () => menu && menu.remove(),
          },
          [
            $el("div.pose_btn_context.remBG", {
              textContent: "Remove background",
            }),
          ]
        );

        panelButtons.append(menu);
        app.graph.setDirtyCanvas(true, false);
      },
    }),
    $el("button", {
      textContent: "⟲",
      title: "Undo",
      onclick: () => node.openPose.undo(),
    }),
    $el("button", {
      textContent: "⟳",
      title: "Redo",
      onclick: () => node.openPose.redo(),
    }),
    $el("button.clear_history", {
      textContent: "✖",
      title: "Clear History",
      onclick: () => {
        if (confirm(`Delete all pose history of a node "${node.name}"?`)) {
          node.openPose.undo_history = [];
          node.openPose.redo_history = [];
          node.openPose.setPose(default_keypoints);
          node.openPose.undo_history.push(node.openPose.getJSON());
          node.openPose.history_change = true;
          node.openPose.updateHistoryData();
        }
      },
    }),
    $el("button.posenode_cnavas_size", {
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
  <path d="m15.8,18.93q0,0.22 -0.17,0.4l-5.73,5.73l2.48,2.48q0.33,0.33 0.33,0.78t-0.33,0.78q-0.33,0.33 -0.78,0.33l-7.73,0q-0.45,0 -0.78,-0.33t-0.33,-0.78l0,-7.73q0,-0.45 0.33,-0.78t0.78,-0.33q0.45,0 0.78,0.33l2.48,2.48l5.73,-5.73q0.17,-0.17 0.4,-0.17t0.4,0.17l1.97,1.97q0.17,0.17 0.17,0.4zm13.47,-14.91l0,7.73q0,0.45 -0.33,0.78t-0.78,0.33q-0.45,0 -0.78,-0.33l-2.48,-2.48l-5.73,5.73q-0.17,0.17 -0.4,0.17t-0.4,-0.17l-1.97,-1.97q-0.17,-0.17 -0.17,-0.4t0.17,-0.4l5.73,-5.73l-2.48,-2.48q-0.33,-0.33 -0.33,-0.78t0.33,-0.78q0.33,-0.33 0.78,-0.33l7.73,0q0.45,0 0.78,0.33t0.33,0.78z" fill="currentColor" id="posenode_svg_canvas_size"/>
</svg>`,
      title: "Change canvas size",
      onclick: () => {
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

        const width = checkSized("width", node.openPose.canvas.width),
          height = checkSized("height", node.openPose.canvas.height);

        node.openPose.setCanvasSize(width, height, true);
        node.openPose.uploadPoseFile(node.name);
      },
    }),
  ]);

  // Background image
  node.openPose.backgroundInput = $el("input", {
    type: "file",
    accept: "image/jpeg,image/png,image/webp",
    style: { display: "none" },
    onchange: node.openPose.onLoadBackground.bind(node.openPose),
  });

  node.openPose.canvas.wrapperEl.append(
    panelButtons,
    node.openPose.backgroundInput
  );

  document.body.appendChild(widget.openpose);

  // Add buttons add, reset, undo, redo poses
  node.addWidget("button", "Add pose", "add_pose", () => {
    node.openPose.addPose();
  });

  node.addWidget("button", "Reset pose", "reset_pose", () => {
    node.openPose.resetCanvas(true);
  });

  // Add customWidget to node
  node.addCustomWidget(widget);

  node.onRemoved = () => {
    if (Object.hasOwn(LS_Poses, node.name)) {
      delete LS_Poses[node.name];
      LS_Save();
    }

    // When removing this node we need to remove the input from the DOM
    for (let y in node.widgets) {
      if (node.widgets[y].openpose) {
        node.widgets[y].openpose.remove();
      }
    }
  };

  widget.onRemove = () => {
    widget.openpose?.remove();
  };

  app.canvas.onDrawBackground = function () {
    // Draw node isnt fired once the node is off the screen
    // if it goes off screen quickly, the input may not be removed
    // this shifts it off screen so it can be moved back if the node is visible.
    for (let n in app.graph._nodes) {
      const currNode = app.graph._nodes[n];
      for (let w in currNode.widgets) {
        let wid = currNode.widgets[w];
        if (Object.hasOwn(wid, "openpose")) {
          wid.openpose.style.left = -8000 + "px";
          wid.openpose.style.position = "absolute";
        }
      }
    }
  };
  return { widget: widget };
}

// Register extension Pose
app.registerExtension({
  name: "alekpet.PoseNode",
  async init(app) {
    addStylesheet("css/posenode/pose_node_styles.css", import.meta.url);
  },
  async setup(app) {
    let openPoseNode = app.graph._nodes.filter((wi) => wi.type == "PoseNode");

    if (openPoseNode.length) {
      openPoseNode.map((n) => {
        console.log(`Setup PoseNode: ${n.name}`);
        let widgetImage = n.widgets.find((w) => w.name == "image");
        if (widgetImage && Object.hasOwn(LS_Poses, n.name)) {
          let pose_ls = LS_Poses[n.name].undo_history;
          n.openPose.loadPreset(
            pose_ls.length > 0
              ? pose_ls[pose_ls.length - 1]
              : { keypoints: default_keypoints }
          );
        }
      });
    }
  },
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PoseNode") {
      const onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = function () {
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        let openPoseNode = app.graph._nodes.filter(
            (wi) => wi.type == "PoseNode"
          ),
          nodeName = `Pose_${openPoseNode.length}`,
          nodeNamePNG = `${nodeName}.png`;

        console.log(`Create PoseNode: ${nodeNamePNG}`);

        LS_Poses =
          localStorage.getItem("ComfyUI_Poses") &&
          JSON.parse(localStorage.getItem("ComfyUI_Poses"));
        if (!LS_Poses) {
          localStorage.setItem("ComfyUI_Poses", JSON.stringify({}));
          LS_Poses = JSON.parse(localStorage.getItem("ComfyUI_Poses"));
        }

        if (!Object.hasOwn(LS_Poses, nodeNamePNG)) {
          LS_Poses[nodeNamePNG] = {
            undo_history: [],
            redo_history: [],
            currentCanvasSize: { width: 512, height: 512 },
          };
          LS_Save();
        }

        createOpenPose.apply(this, [this, nodeNamePNG, {}, app]);

        setTimeout(() => {
          if (LS_Poses[nodeNamePNG]?.currentCanvasSize) {
            this.openPose.currentCanvasSize =
              LS_Poses[nodeNamePNG]?.currentCanvasSize;

            this.openPose.setCanvasSize(
              this.openPose.currentCanvasSize.width,
              this.openPose.currentCanvasSize.height
            );
          }

          this.openPose.uploadPoseFile(nodeNamePNG);
          // Resize window
          window.addEventListener("resize", (e) => resizeCanvas(this), false);
        }, 1);

        this.setSize([530, 620]);

        return r;
      };
    }
  },
});
