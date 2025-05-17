/*
 * Title: Set Poses in ComflyUI from ControlNet
 * Author: AlekPet
 * Description: I rewrote the main.js file as a class, from fkunn1326's openpose-editor (https://github.com/fkunn1326/openpose-editor/blob/master/javascript/main.js)
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet
 */

import { api } from "../../scripts/api.js";
import { app } from "../../scripts/app.js";
import { $el } from "../../scripts/ui.js";
import { addStylesheet } from "../../scripts/utils.js";
import {
  comfyuiDesktopConfirm,
  comfyuiDesktopPrompt,
  comfyuiDesktopAlert,
} from "./utils.js";
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

function resizeCanvas(node, sizes) {
  const { width, height } = sizes ?? node.openPose.settings.currentCanvasSize;

  node.openPose.canvas.setDimensions(
    {
      width: width,
      height: height,
    },
    { cssOnly: false, backstoreOnly: true }
  );

  node.openPose.canvas.getElement().width = width;
  node.openPose.canvas.getElement().height = height;

  node.openPose.canvas.renderAll();
  app.graph.setDirtyCanvas(true, false);
}

class OpenPose {
  constructor(node, canvasElement) {
    this.visibleEyes = true;
    this.flipped = false;
    this.node = node;

    this.maxSizeNodeW = 1024;
    this.maxSizehNodeH = 200;

    this.settings = {
      undo_history: [],
      redo_history: [],
      currentCanvasSize: { width: 512, height: 512 },
      background: null,
    };

    this.canvas = this.initCanvas(canvasElement);
    this.image = node.widgets.find((w) => w.name === "image");

    const callb = this.node?.callback,
      self = this;
    this.image.callback = function () {
      self.image.value = self.node.name;
      if (callb) {
        return callb.apply(this, arguments);
      }
    };
  }

  getSettings() {
    return this.settings;
  }

  setCanvasSize(new_width, new_height, resetPose = false) {
    resizeCanvas(this.node, {
      width: new_width,
      height: new_height,
    });

    this.settings.currentCanvasSize = { width: new_width, height: new_height };

    this.node.title = `${this.node.type} - ${new_width}x${new_height}`;
    resetPose && this.resetCanvas();

    this.canvas.renderAll();

    app.graph.setDirtyCanvas(true, false);
    this.node.onResize();
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
      containerClass: "canvas_container_openpose",
      width: this.settings.currentCanvasSize.width,
      height: this.settings.currentCanvasSize.height,
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
      if (this.canvas.getActiveObject().type == "activeSelection") {
        this.uploadPoseFile(this.node.name);
        return;
      }

      this.settings.redo_history.length = 0;
      this.uploadPoseFile(this.node.name);
    });

    if (!this.settings.undo_history.length) {
      this.setPose(default_keypoints);
      this.settings.undo_history.push(this.getJSON());
    }
    return this.canvas;
  }

  undo() {
    if (this.settings.undo_history.length > 0) {
      if (this.settings.undo_history.length > 1)
        this.settings.redo_history.push(this.settings.undo_history.pop());

      const content =
        this.settings.undo_history[this.settings.undo_history.length - 1];
      this.loadPreset(content);
      this.canvas.renderAll();

      this.uploadPoseFile(this.node.name);
    }
  }

  redo() {
    if (this.settings.redo_history.length > 0) {
      const content = this.settings.redo_history.pop();
      this.settings.undo_history.push(content);
      this.loadPreset(content);

      this.canvas.renderAll();

      this.uploadPoseFile(this.node.name);
    }
  }

  async resetCanvas(reset_size = false) {
    if (reset_size) {
      if (await comfyuiDesktopConfirm("Clear undo/redo?")) {
        this.settings.undo_history = [];
        this.settings.redo_history = [];
      }

      if (await comfyuiDesktopConfirm("Reset canvas size?")) {
        this.setCanvasSize(512, 512);

        const backgroundImg = this.canvas.backgroundImage;
        this.canvas.clear();
        this.canvas.backgroundColor = "#000";
        this.addPose();

        this.setBackground(backgroundImg);
        this.uploadPoseFile(this.node.name);
      }
    }
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
      `/view?filename=${name}&type=input&subfolder=${subfolder}${app.getPreviewFormatParam()}&${app.getRandParam()}`
    );
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

    //Temporarily hide background image
    let tmp_BackgroundImg = this.canvas.backgroundImage;
    this.canvas.backgroundImage = null;
    this.canvas.renderAll();

    this.settings.undo_history.push(this.getJSON());

    this.canvas.lowerCanvasEl.toBlob((blob) => {
      const formData = new FormData();
      formData.append("image", blob, fileName);
      formData.append("overwrite", "true");
      formData.append("type", "input");

      this.uploadFileToServer(formData)
        .then((jsonData) => {
          if (!jsonData.success) {
            throw new Error(jsonData.error);
          }

          const { name } = jsonData.data;

          if (!this.image.options.values.includes(name)) {
            this.image.options.values.push(name);
          }

          this.image.value = name;
          this.showImage(name);
          hideShowControls(true);
        })
        .catch(() => hideShowControls(true));
    }, "image/png");
    // - end

    //Set the background back
    this.setBackground(tmp_BackgroundImg);
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

  getImageUrlByName(jsonData) {
    return {
      url: api.apiURL(
        `/view?filename=${encodeURIComponent(
          jsonData.name
        )}&type=input&subfolder=${
          jsonData.subfolder
        }${app.getPreviewFormatParam()}${app.getRandParam()}`
      ),
      name: jsonData.name,
      subfolder: jsonData.subfolder,
    };
  }

  onLoadBackground(e) {
    try {
      const file = this.backgroundInput.files[0];

      const formData = new FormData();
      formData.append("image", file);
      formData.append("overwrite", "true");
      formData.append("type", "input");

      this.uploadFileToServer(formData)
        .then((jsonData) => {
          if (!jsonData.success) {
            throw new Error(jsonData.error);
          }
          return this.getImageUrlByName(jsonData.data);
        })
        .then((image_data) => {
          if (!image_data) {
            console.log("Invalid data image!");
            return;
          }
          this.settings.background = image_data.url;

          fabric.Image.fromURL(image_data.url, (img) => {
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
        });
    } catch (err) {
      console.error(err);
    }
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

  // Fabric canvas
  const openPoseWrapper = $el("div.openPoseWrapper");
  const canvasOpenPose = $el("canvas");
  node.openPoseWrapper = openPoseWrapper;

  // Add buttons add, reset, undo, redo poses
  node.addWidget("button", "Add pose", "add_pose", () => {
    node.openPose.addPose();
  });

  node.addWidget("button", "Reset pose", "reset_pose", () => {
    node.openPose.resetCanvas(true);
  });

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
      onclick: async () => {
        if (
          await comfyuiDesktopConfirm(
            `Delete all pose history of a node "${node.name}"?`
          )
        ) {
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
      innerHTML: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 32 32">
<path d="m15.8,18.93q0,0.22 -0.17,0.4l-5.73,5.73l2.48,2.48q0.33,0.33 0.33,0.78t-0.33,0.78q-0.33,0.33 -0.78,0.33l-7.73,0q-0.45,0 -0.78,-0.33t-0.33,-0.78l0,-7.73q0,-0.45 0.33,-0.78t0.78,-0.33q0.45,0 0.78,0.33l2.48,2.48l5.73,-5.73q0.17,-0.17 0.4,-0.17t0.4,0.17l1.97,1.97q0.17,0.17 0.17,0.4zm13.47,-14.91l0,7.73q0,0.45 -0.33,0.78t-0.78,0.33q-0.45,0 -0.78,-0.33l-2.48,-2.48l-5.73,5.73q-0.17,0.17 -0.4,0.17t-0.4,-0.17l-1.97,-1.97q-0.17,-0.17 -0.17,-0.4t0.17,-0.4l5.73,-5.73l-2.48,-2.48q-0.33,-0.33 -0.33,-0.78t0.33,-0.78q0.33,-0.33 0.78,-0.33l7.73,0q0.45,0 0.78,0.33t0.33,0.78z" fill="currentColor" id="posenode_svg_canvas_size"/>
</svg>`,
      style: { margin: 0, padding: 0 },
      title: "Change canvas size",
      onclick: async () => {
        async function checkSized(prop = "", defaultVal = 512) {
          let inputSize;

          while (true) {
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

        const width = await checkSized("width", node.openPose.canvas.width),
          height = await checkSized("height", node.openPose.canvas.height);

        node.openPose.setCanvasSize(width, height, true);
        node.openPose.uploadPoseFile(node.name);

        // Save data
        app?.extensionManager?.workflow?.activeWorkflow?.changeTracker?.checkState();
      },
    }),
  ]);

  node.openPose = new OpenPose(node, canvasOpenPose);
  const widget = node.addDOMWidget(
    "widget_openpose",
    "openpose",
    openPoseWrapper,
    {
      setValue(v) {
        node.openPose.settings = v;
      },
      getValue() {
        return node.openPose.getSettings();
      },
    }
  );

  widget.callback = (v) => {};

  const origDraw = widget.draw;
  widget.draw = function () {
    origDraw?.apply(this, arguments);
    const [ctx, node, widgetHeight, widgetWidth, y] = arguments;
    Object.assign(openPoseWrapper.style, {
      height: widgetHeight + "px",
    });
  };

  try {
    const data = node.widgets_values[3];
    if (data) widget.value = JSON.parse(JSON.stringify(data));
  } catch (error) {}

  widget.openpose = node.openPose.canvas.wrapperEl;
  widget.parent = node;

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

  openPoseWrapper.appendChild(widget.openpose);

  node.onResize = function () {
    let [w, h] = this.size;

    let aspect_ratio = 1;

    aspect_ratio = node.openPose.canvas.height / node.openPose.canvas.width;

    const buffer = 140;

    if (w > 1024) w = w - (w - 1024);
    if (w < 200) w = 200;

    h = w * aspect_ratio + buffer;

    if (h < 200) h = 200 + h / 2;

    this.size = [w, h];
  };

  node.onDrawBackground = function (ctx) {};

  return { widget: widget };
}

// Register extension Pose
app.registerExtension({
  name: "alekpet.PoseNode",
  async init(app) {
    addStylesheet("css/posenode/pose_node_styles.css", import.meta.url);
  },
  async setup(app) {},
  async beforeRegisterNodeDef(nodeType, nodeData, app) {
    if (nodeData.name === "PoseNode") {
      const onNodeCreated = nodeType.prototype.onNodeCreated;

      nodeType.prototype.onNodeCreated = async function () {
        const r = onNodeCreated
          ? onNodeCreated.apply(this, arguments)
          : undefined;

        const node_title = await this.getTitle();
        const node_id = this.id;

        const nodeName = `Pose_${node_id}`;
        const nodeNamePNG = `${nodeName}.png`;

        console.log(`Create PoseNode: ${nodeNamePNG}`);

        createOpenPose.apply(this, [this, nodeNamePNG, {}, app]);

        this.openPose.uploadPoseFile(nodeNamePNG);

        // Resize window
        window.addEventListener("resize", (e) => resizeCanvas(this), false);
        return r;
      };

      const onConfigure = nodeType.prototype.onConfigure;
      nodeType.prototype.onConfigure = async function (widget) {
        onConfigure?.apply(this, arguments);

        setTimeout(() => {
          const data = widget.widgets_values[3];

          if (data) {
            const {
              currentCanvasSize,
              background,
              undo_history,
              redo_history,
            } = data;
            if (currentCanvasSize) {
              const { width, height } = currentCanvasSize;
              this.openPose.setCanvasSize(width, height);
            }

            this.openPose.loadPreset(
              undo_history.length
                ? undo_history[undo_history.length - 1]
                : { keypoints: default_keypoints }
            );

            if (background) {
              fabric.Image.fromURL(background, (img) => {
                img.set({
                  originX: "left",
                  originY: "top",
                  opacity: 0.5,
                });

                this.openPose.canvas.setBackgroundImage(
                  img,
                  this.openPose.canvas.renderAll.bind(this.openPose.canvas),
                  {
                    scaleX: this.openPose.canvas.width / img.width,
                    scaleY: this.openPose.canvas.height / img.height,
                  }
                );
              });
            }

            this.openPose.canvas.renderAll();
            this.openPose.uploadPoseFile(this.name);

            this.setSize(arguments[0].size);
            app.graph.setDirtyCanvas(true, false);
          }
        }, 0);
      };
    }
  },
});
