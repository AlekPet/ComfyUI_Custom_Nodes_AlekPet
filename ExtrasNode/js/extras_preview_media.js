/*
 * Title: Extras extension - Preview Media (image, audio, video)
 * Author: AlekPet
 * Github: https://github.com/AlekPet/ComfyUI_Custom_Nodes_AlekPet/tree/master/ExtrasNode
 */

import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { $el } from "../../scripts/ui.js";

const idExt = "alekpet.ExtrasNode";

// LocalStorage settings - Preview image, video and audio select list combo
const PreviewImageVideoComboLS = localStorage.getItem(
  `Comfy.Settings.${idExt}.PreviewImageVideoCombo`
);

// Settings set values from LS or default - Preview image, video and audio select list combo
let PreviewImageVideoCombo = PreviewImageVideoComboLS
  ? JSON.parse(PreviewImageVideoComboLS)
  : true;

// Preview image, video and audio content loading function
const SUPPORTS_FORMAT = {
  image: ["jpg", "jpeg", "bmp", "png", "gif", "tiff", "avif"],
  video: ["mp4", "webm"],
  audio: ["ogg", "wav", "mp3", "webm"],
};

const loadingContent = (src) => {
  return new Promise((res, rej) => {
    let ext = src.slice(src.lastIndexOf(".") + 1).toLowerCase();
    ext = /\w+/.exec(ext)[0];

    if (SUPPORTS_FORMAT.image.includes(ext)) {
      const img = new Image();
      img.crossOrigin = "";
      img.onload = (e) => res({ raw: img, type: "image", src });
      img.onerror = (err) => rej(err);
      img.src = src;
    }

    if (SUPPORTS_FORMAT.video.includes(ext)) {
      const video = document.querySelector(".preview_vid");
      video.onerror = (err) => rej(err);

      video.addEventListener("canplay", (e) => {
        if (video.videoWidth !== 0) {
          res({ raw: video, type: "video", src });
        }
      });
      video.src = src;
    }

    if (SUPPORTS_FORMAT.audio.includes(ext)) {
      const audio = document.querySelector(".preview_audio");
      audio.onerror = (err) => rej(err);

      audio.addEventListener("canplaythrough", (e) => {
        res({ raw: audio, type: "audio", src });
      });
      audio.src = src;
    }
  });
};

function drawVid(raw, canvas, ctx, type) {
  ctx.drawImage(raw, 0, 0, canvas.width, canvas.height);

  canvas.requanim = requestAnimationFrame(
    drawVid.bind(this, raw, canvas, ctx, type)
  );
}
//

// -- Extension: Preview image, audio, video --
app.registerExtension({
  name: `${idExt}.PreviewMedia`,
  init() {
    // Preview image, video and audio settings ui
    app.ui.settings.addSetting({
      id: `${idExt}.PreviewImageVideoCombo`,
      name: "🔸 Preview images and videos in the list",
      defaultValue: true,
      type: "boolean",
      onChange(value) {
        PreviewImageVideoCombo = value;
      },
    });

    // -- Preview image, audio, video --

    // Close when click on item inside context menu
    function closePreviewContextClick() {
      if (this.root?.preview_content_combo) {
        this.root.preview_content_combo.remove();
        this.root.preview_content_combo = null;
      }
    }

    // Add preview element
    function addPreviewModule(params, element) {
      if (!PreviewImageVideoCombo) return;

      const [name, value, options] = params;

      if (value instanceof Object) return;

      if (!this.root?.preview_content_combo) {
        const preview_content_combo = $el(
          "div.preview_content_combo",
          {
            style: {
              position: "absolute",
              maxWidth: "160px",
              zIndex: 9999999,
            },
            parent: document.body,
          },
          [
            $el("canvas.preview_img", {
              style: { width: "100%" },
            }),
            $el("video.preview_vid", {
              style: { opacity: 0, width: 0, height: 0 },
              crossOrigin: "anonymous",
              autoplay: false,
              muted: false,
              preload: "auto",
            }),
            $el("audio.preview_audio", {
              style: { opacity: 0, position: "absolute", left: 0 },
              crossOrigin: "anonymous",
              autoplay: false,
              muted: false,
              preload: "auto",
              controls: true,
            }),
          ]
        );

        this.root.preview_content_combo = preview_content_combo;
      }

      LiteGraph.pointerListenerAdd(element, "enter", (e) => {
        if (element?.dataset?.value) {
          const body_rect = document.body.getBoundingClientRect();
          const root_rect = this.root.getBoundingClientRect();
          const { x, y } = element.getBoundingClientRect();
          //const preview_rect = this.root.preview_content_combo.getBoundingClientRect();

          //const scale = app.graph.extra.ds.scale;

          const canvas = this.root.preview_content_combo.children[0];
          const ctx = canvas.getContext("2d");

          loadingContent(
            api.apiURL(
              `/view?filename=${encodeURIComponent(
                element.dataset.value
              )}&type=input`
            )
          ).then(({ raw, type, src }) => {
            this.root.preview_content_combo.style.maxWidth =
              type === "audio" ? "300px" : "160px";

            const previewWidth = parseInt(
              this.root.preview_content_combo.style.maxWidth
            );

            // if (scale >= 1) {
            // this.root.preview_content_combo.style.top = `${
            // (y - root_rect.top) / scale
            // }px`;
            // } else {
            // this.root.preview_content_combo.style.top = `${
            // y - root_rect.top
            // }px`;
            // }

            this.root.preview_content_combo.style.top = `${y}px`;

            if (
              body_rect.width &&
              root_rect.right + previewWidth > body_rect.width
            ) {
              this.root.preview_content_combo.style.left = `${
                root_rect.left - previewWidth - 10
              }px`;
            } else {
              this.root.preview_content_combo.style.left = `${
                root_rect.left + root_rect.width + 10
              }px`;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const video = document.querySelector(".preview_vid");
            const audio = document.querySelector(".preview_audio");

            if (type === "image") {
              canvas.width = raw.naturalWidth;
              canvas.height = raw.naturalHeight;
              if (!video.paused) {
                video.pause();
                video.currentTime = 0;
              }
              cancelAnimationFrame(canvas.requanim);
            } else if (type === "video") {
              canvas.width = raw.videoWidth;
              canvas.height = raw.videoHeight;
              video.play();
            } else if (type === "audio") {
              Object.assign(audio.style, {
                opacity: 1,
                display: "",
              });
              audio.play();
            }

            if (type === "video" || type === "image") {
              Object.assign(audio.style, {
                opacity: 0,
                display: "none",
              });
              !audio.paused && audio.pause();
              ctx.drawImage(raw, 0, 0, canvas.width, canvas.height);
            }

            if (type === "video")
              canvas.requanim = requestAnimationFrame(
                drawVid.bind(this, raw, canvas, ctx, type)
              );
          });
        }
      });

      LiteGraph.pointerListenerAdd(element, "leave", (e) => {
        if (element?.dataset?.value) {
          const canvas = this.root.preview_content_combo.children[0];
          const video = document.querySelector(".preview_vid");
          if (!video.paused) {
            video.pause();
            video.currentTime = 0;
          }
          cancelAnimationFrame(canvas.requanim);
        }
      });
    }

    // AddItem
    const addItem = ContextMenu.prototype.addItem;
    ContextMenu.prototype.addItem = function () {
      const element = addItem?.apply(this, arguments);

      addPreviewModule.call(this, arguments, element);
    };

    // CloseItem
    const closeItem = ContextMenu.prototype.close;
    ContextMenu.prototype.close = function () {
      closeItem?.apply(this, arguments);

      closePreviewContextClick.call(this);
    };

    // Old verison comfyui, support context menu LiteGraph path...
    // AddItem
    const addItemLitegraph = LiteGraph.ContextMenu.prototype.addItem;
    LiteGraph.ContextMenu.prototype.addItem = function () {
      const element = addItemLitegraph?.apply(this, arguments);

      addPreviewModule.call(this, arguments, element);
    };

    // CloseItem
    const closeItemLitegraph = LiteGraph.ContextMenu.prototype.close;
    LiteGraph.ContextMenu.prototype.close = function () {
      closeItemLitegraph?.apply(this, arguments);

      closePreviewContextClick.call(this);
    };

    const originalCloseAllContextMenus = LiteGraph.closeAllContextMenus;
    LiteGraph.closeAllContextMenus = function () {
      originalCloseAllContextMenus?.apply(this, arguments);

      const previewCombo = document.querySelector(".preview_content_combo");
      if (previewCombo) {
        previewCombo.remove();
      }
    };
    // -- end - Preview image, audio, video --
  },
});
