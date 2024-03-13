import { makeElement, rgbToHsv, getDataJSON } from "./utils.js";

// Menu select brush in the menu
class MenuBrushes {
  constructor(managerMyPaint) {
    if (!managerMyPaint) {
      throw new Error("Class MyPaintManager not found!");
    }

    this.currentDir = "";
    this.managerMyPaint = managerMyPaint;

    // Slide dir variables
    this.pos = 0;
    this.currentSlide = 0;
    this.step = 150;
    this.listBrushes = managerMyPaint.brushesData;
    this.keysDir = Object.keys(this.listBrushes);
    //
    this.selectedBrushIndex = null;
    this.prevSelected = null;
  }

  init() {
    this.createLayout();
    this.createDirList();
    this.createBrushList();
    this.bindEvents();
  }

  createLayout() {
    this.wrepper__kistey = makeElement("div", { class: ["wrepper__kistey"] });
    this.wrepper__kistey.style.display = "none";

    const box__kistey = makeElement("div", { class: ["box__kistey"] });

    const kistey__title = makeElement("div", { class: ["kistey__title"] });

    const kistey__left = makeElement("div", {
      class: ["kistey__arrow", "kistey__left"],
      textContent: "◀",
    });
    const kistey__right = makeElement("div", {
      class: ["kistey__arrow", "kistey__right"],
      textContent: "▶",
    });

    const kistey_dir__name_wrapper = makeElement("div", {
      class: ["kistey_dir__name_wrapper"],
    });
    const kistey_directory_slider = makeElement("div", {
      class: ["kistey_directory_slider"],
    });
    const kistey__body = makeElement("div", {
      class: ["kistey__body"],
      textContent: "Loading...",
    });

    kistey_dir__name_wrapper.append(kistey_directory_slider);
    kistey__title.append(kistey__left, kistey_dir__name_wrapper, kistey__right);
    box__kistey.append(kistey__title, kistey__body);

    this.wrepper__kistey.append(box__kistey);

    this.managerMyPaint.viewMenuBrushes.parentElement.append(
      this.wrepper__kistey
    );
  }

  createDirList() {
    const kistey_directory_slider = this.wrepper__kistey.querySelector(
      ".kistey_directory_slider"
    );
    this.currentDir = this.keysDir[0];
    this.keysDir.forEach((dir, idx) => {
      const kistey_dir__name = document.createElement("div");
      kistey_dir__name.className = "kistey_dir__name";
      if (idx === this.currentSlide)
        kistey_dir__name.classList.add("pop_active");

      kistey_dir__name.textContent = dir;
      kistey_dir__name.title = dir[0].toUpperCase() + dir.slice(1);

      kistey_directory_slider.append(kistey_dir__name);
    });
  }

  createBrushList() {
    const kistey__body = this.wrepper__kistey.querySelector(".kistey__body");
    const kistey_dir__name_wrapper = this.wrepper__kistey.querySelector(
      ".kistey_dir__name_wrapper"
    );
    const kistey_directory_slider = this.wrepper__kistey.querySelector(
      ".kistey_directory_slider"
    );

    kistey__body.innerHTML = "";
    kistey__body.style.display = "grid";
    if (this.listBrushes[this.currentDir].length) {
      this.listBrushes[this.currentDir].forEach((brush, idx) => {
        const { filename, path } = brush;

        const kistey__item = makeElement("div", {
          class: ["kistey__item"],
          title: filename,
        });

        const kistey__img = makeElement("div", {
          class: ["kistey__img"],
        });

        const imageBrush = makeElement("img", {
          src: `${this.managerMyPaint.basePath}/brushes/${path}${filename}_prev.png`,
          alt: filename,
        });
        kistey__img.append(imageBrush);

        // const brushName = makeElement("div", {
        //   class: ["kistey__name"], textContent: filename});

        imageBrush.onerror = () => {
          imageBrush.src = `${this.managerMyPaint.basePath}/img/no_image.svg`;
        };

        kistey__item.append(kistey__img /* brushName */);
        kistey__body.append(kistey__item);
      });
    } else {
      kistey__body.style.display = "block";
      kistey__body.textContent = "No brush this directory...";
    }

    // Popup
    const kistey_directory_popup = kistey_directory_slider.cloneNode(true);
    kistey_directory_popup.className = "kistey_directory_popup";
    kistey_directory_popup.style.display = "none";
    Array.from(kistey_directory_popup.children).forEach((dir) =>
      dir.classList.add("kistey_dir__name-popup")
    );
    kistey_dir__name_wrapper.append(kistey_directory_popup);
  }

  setActiveDir() {
    const kistey_directory_popup = this.wrepper__kistey.querySelector(
      ".kistey_directory_popup"
    );
    const kistey_directory_slider = this.wrepper__kistey.querySelector(
      ".kistey_directory_slider"
    );

    Array.from(kistey_directory_slider.children).forEach((dir, idx) =>
      this.currentSlide === idx
        ? dir.classList.add("pop_active")
        : dir.classList.remove("pop_active")
    );

    Array.from(kistey_directory_popup.children).forEach((dir, idx) =>
      this.currentSlide === idx
        ? dir.classList.add("pop_active")
        : dir.classList.remove("pop_active")
    );
  }

  moveSlide(target) {
    const kistey_directory_popup = this.wrepper__kistey.querySelector(
      ".kistey_directory_popup"
    );
    const kistey_directory_slider = this.wrepper__kistey.querySelector(
      ".kistey_directory_slider"
    );

    kistey_directory_popup.style.display = "none";

    const len = this.keysDir.length - 1;

    if (target) {
      if (target.classList.contains("kistey__left")) {
        this.currentSlide -= 1;
        if (this.currentSlide < 0) {
          this.pos = -len * this.step;
          this.currentSlide = len;
        }
      } else {
        this.currentSlide += 1;
        if (this.currentSlide > len) this.pos = this.currentSlide = 0;
      }
    }

    this.pos = -this.currentSlide * this.step;
    kistey_directory_slider.style.left = `${this.pos}px`;
    this.currentDir = this.keysDir[this.currentSlide];
    this.createBrushList();
  }

  bindEvents() {
    const kistey_directory_popup = this.wrepper__kistey.querySelector(
      ".kistey_directory_popup"
    );
    const kistey__body = this.wrepper__kistey.querySelector(".kistey__body");

    this.wrepper__kistey
      .querySelector(".box__kistey")
      .addEventListener("click", (e) => {
        let target = e.target;

        while (target !== e.currentTarget) {
          if (
            target.classList.contains("kistey__body") &&
            kistey_directory_popup.style.display === "flex"
          ) {
            kistey_directory_popup.style.display = "none";
          }

          // Items
          if (target.classList.contains("kistey__item")) {
            const idx_item = Array.from(kistey__body.children).findIndex(
              (item) => target === item
            );
            // console.log(
            //   "Selected:",
            //   this.currentDir,
            //   this.listBrushes[this.currentDir][idx_item]
            // );

            this.managerMyPaint.setBrush(
              this.listBrushes[this.currentDir][idx_item]
            );

            if (this.prevSelected !== target.children[0].children[0]) {
              if (this.prevSelected)
                this.prevSelected.classList.remove("selected");
              target.children[0].children[0].classList.add("selected");
              this.prevSelected = target.children[0].children[0];
            }
          }

          // Arrows slide
          if (target.classList.contains("kistey__arrow")) {
            this.moveSlide(target);
          }

          // Popup
          if (target.classList.contains("kistey_directory_slider")) {
            this.setActiveDir();
            kistey_directory_popup.style.display =
              kistey_directory_popup.style.display === "none" ? "flex" : "none";
          }

          if (target.classList.contains("kistey_dir__name-popup")) {
            const index = Array.from(target.parentElement.children).findIndex(
              (el) => el === target
            );
            if (this.currentDir === index) return;
            this.currentDir = this.keysDir[index];
            this.currentSlide = index;
            this.moveSlide();
            this.setActiveDir();
          }

          target = target.parentNode;
        }
      });
  }
}

// Manager MyPaint
class MyPaintManager {
  constructor(painterNode, brushName = "charcoal") {
    if (!painterNode) return new Error("Link to PainterNode not exist!");

    this.painterNode = painterNode;

    this.basePath = "extensions/AlekPet_Nodes/assets/painternode";
    this.brushName = brushName;
    this.currentBrushSettings = null;
  }

  async createElements() {
    // Open menu brushes
    this.viewMenuBrushes = makeElement("button", { textContent: "Brushes" });
    this.viewMenuBrushes.customSize = { w: 60, h: 25, fs: 10 };
    this.viewMenuBrushes.addEventListener("click", () => {
      this.menuBrushes.wrepper__kistey.style.display =
        this.menuBrushes.wrepper__kistey.style.display === "none"
          ? "block"
          : "none";
    });

    // Mouse Pressure
    this.labelMousePressure = makeElement("label", {
      textContent: "Pressure: ",
      style:
        "display: flex;  align-items: center; font-size: 10px; margin-left: 3px",
      title: "Mouse pressure",
    });

    this.mousepressure = makeElement("input", {
      class: ["mypaint_mousepressure"],
      type: "range",
      min: 1,
      max: 100,
      value: 50,
    });
    this.mousepressure.customSize = { w: 60, h: 25, fs: 10 };

    this.labelMousePressure.append(
      this.mousepressure,
      makeElement("span", { textContent: this.mousepressure.value / 100 })
    );

    // Load size for settings brush
    this.labelCheckboxDefSize = makeElement("label", {
      textContent: "Default Size: ",
      style:
        "display: flex;  align-items: center; font-size: 10px; margin-left: 3px",
      title: "Apply size from brush settings",
    });

    this.CheckboxDefSize = makeElement("input", {
      type: "checkbox",
      class: ["mypaint_checkboxDefSize"],
      checked:
        window.LS_Painters[this.painterNode.node.name].settings
          ?.mypaint_settings?.preset_brush_size ?? true,
    });

    this.CheckboxDefSize.customSize = { w: 15, h: 15, fs: 10 };

    this.CheckboxDefSize.addEventListener("change", () => {
      const lsPainter = window.LS_Painters[this.painterNode.node.name].settings;
      if (!lsPainter.hasOwnProperty("mypaint_settings"))
        window.LS_Painters[
          this.painterNode.node.name
        ].settings.mypaint_settings = {};

      window.LS_Painters[
        this.painterNode.node.name
      ].settings.mypaint_settings.preset_brush_size =
        this.CheckboxDefSize.checked;

      // Save to localStorage
      localStorage.setItem(
        "ComfyUI_Painter",
        JSON.stringify(window.LS_Painters)
      );
    });

    this.labelCheckboxDefSize.append(this.CheckboxDefSize);

    // Select brush items
    this.brushesData = await getDataJSON(
      `${this.basePath}/json/brushes_data.json`
    );
    this.menuBrushes = new MenuBrushes(this);

    await this.loadBrushSetting("", "charcoal");
  }

  appendElements(parent) {
    const separator = makeElement("div", { class: ["separator"] });

    parent.append(
      // this.labelSetBrush,
      separator,
      this.viewMenuBrushes,
      separator.cloneNode(true),
      this.labelMousePressure,
      separator.cloneNode(true),
      this.labelCheckboxDefSize
    );

    this.menuBrushes.init();
    this.setPropertyBrush();
  }

  async loadBrushSetting(pathToBrush, brushName) {
    if (pathToBrush === "") pathToBrush = "brushes/";

    const pathToJsonBrush = `${this.basePath}/${pathToBrush}${brushName}`;
    this.currentBrushSettings = await getDataJSON(
      `${pathToJsonBrush}.myb.json`
    );
    this.currentBrushImg = `${pathToJsonBrush}.png`;
  }

  setColorBrush(colorvalue) {
    const source = new fabric.Color(colorvalue);
    const [r, g, b] = source._source;
    const [h, s, v] = rgbToHsv(r, g, b);
    const bs = this.currentBrushSettings;
    bs.color_h.base_value = h;
    bs.color_s.base_value = s;
    bs.color_v.base_value = v;

    this.painterNode.canvas.freeDrawingBrush.brush.readmyb_json(bs);
  }

  setSizeBrush(sizevalue) {
    this.currentBrushSettings.radius_logarithmic.base_value =
      parseFloat(sizevalue);
    this.painterNode.canvas.freeDrawingBrush.brush.readmyb_json(
      this.currentBrushSettings
    );
  }

  setPropertyBrush() {
    // Set brush property: color, width
    this.painterNode.strokeWidth.max = 7;
    this.painterNode.strokeWidth.min = 0.2;
    this.painterNode.strokeWidth.step = 0.01;

    if (this.CheckboxDefSize.checked)
      this.painterNode.strokeWidth.value =
        this.currentBrushSettings.radius_logarithmic.base_value;

    this.painterNode.changePropertyBrush(this.painterNode.type);
  }

  hello() {
    console.log("Hello!");
  }

  async setBrush(data) {
    const { filename: brushName, path: pathToBrush } = data;

    if (brushName === "separator") return;

    if (pathToBrush === null || pathToBrush === undefined) {
      return new Error("No exist path in dataset!");
    }

    this.brushName = brushName;
    await this.loadBrushSetting(pathToBrush, brushName);

    this.painterNode.canvas.freeDrawingBrush.brush = new MypaintBrush(
      this.currentBrushSettings,
      this.painterNode.canvas.freeDrawingBrush.surface
    );
    this.setPropertyBrush();
  }
}

export { MyPaintManager };
