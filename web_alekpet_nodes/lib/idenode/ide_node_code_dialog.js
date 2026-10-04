import { api } from "../../../../scripts/api.js";
import { app } from "../../../../scripts/app.js";
import { comfyuiDesktopConfirm, formatBytes } from "../../utils.js";

const extensionName = "alekpet.IDENode";

function waitForIDENode(node, timeout = 5000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (node.clsIdeNodeEditor?.getEditor())
        return resolve(node.clsIdeNodeEditor);
      if (Date.now() - started >= timeout) return resolve(null);
      setTimeout(tick, 50);
    };
    tick();
  });
}

export class IdeNodeCodeDialog {
  constructor() {
    this.overlay = null;
    this.items = null;
    this.language = "python";
    this.theme = "monokai";
  }

  show() {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "alekpet_storage_overlay";

    const box = document.createElement("div");
    box.className = "alekpet_storage_box";

    const header = document.createElement("div");
    header.className = "alekpet_storage_header";
    header.innerHTML = `<strong>IDENode codes</strong>`;

    const close = document.createElement("button");
    close.textContent = "✕";
    close.onclick = () => this.close();
    header.appendChild(close);

    const toolbar = document.createElement("div");
    toolbar.className = "alekpet_storage_toolbar";

    const refresh = document.createElement("button");
    refresh.textContent = "Refresh";
    refresh.onclick = () => this.load();
    toolbar.appendChild(refresh);

    this.items = document.createElement("div");
    this.items.className = "alekpet_storage_items";
    this.items.style =
      "grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));";

    box.append(header, toolbar, this.items);
    this.overlay.appendChild(box);
    this.overlay.addEventListener("click", (event) => {
      if (event.target === this.overlay) this.close();
    });
    document.body.appendChild(this.overlay);
    this.load();
  }

  close() {
    this.overlay?.remove();
    this.overlay = null;
  }

  async load() {
    if (!this.items) return;
    this.items.innerHTML = "<div class='alekpet_storage_item'>Loading...</div>";

    this.theme =
      localStorage.getItem(`${extensionName}.SyntaxHighlightTheme`) ??
      "monokai";

    try {
      const response = await api.fetchApi(`/alekpet/ide_node_get_codes`);
      if (!response.ok)
        throw new Error(`${response.status} ${response.statusText}`);
      const result = await response.json();
      const codes = Array.isArray(result?.codes) ? result.codes : [];

      this.items.innerHTML = "";
      if (!codes.length) {
        this.items.innerHTML =
          "<div class='alekpet_storage_item'>No IDENode codes</div>";
        return;
      }

      for (const code_asset of codes) {
        this.renderAsset(code_asset);
      }
    } catch (error) {
      this.items.innerHTML = `<div class='alekpet_storage_item' style='text-align:left;color:var(--error-text,#f66);'>${escapeHtml(error.message)}</div>`;
      console.error("[IDENodeCodeDialog] Failed to load codes:", error);
    }
  }

  renderAsset(code_asset) {
    const card = document.createElement("div");
    card.className = "alekpet_storage_item_card";

    // Preview canvas saved data
    const previewWrap = document.createElement("div");
    previewWrap.className = "alekpet_storage_item_preview_wrapper";

    let obj_code = code_asset.code;
    try {
      obj_code = JSON.parse(obj_code);
    } catch (error) {
      console.error(error);
    }

    const codeEl = document.createElement("pre");
    codeEl.textContent = obj_code.code;

    codeEl.style.minWidth = "100%";
    codeEl.style.minHeight = "100%";
    previewWrap.appendChild(codeEl);

    card.editor = ace.edit(codeEl);
    card.editor.setOptions({
      mode: `ace/mode/${code_asset.language}`,
      theme: `ace/theme/${this.theme}`,
      readOnly: true,
      highlightActiveLine: false,
      highlightGutterLine: false,
      value: obj_code.code,
    });

    // Metadata
    const meta = document.createElement("div");
    meta.className = "alekpet_storage_item_meta";

    const language = document.createElement("div");
    language.title = "Programming language";
    language.innerHTML = `Language: <span style="color: #0af400">${code_asset.language}</span>`;
    language.className =
      "alekpet_storage_item_skew_box alekpet_storage_item_language";
    language.style.cssText =
      "background: linear-gradient(90deg, #305d0c 60%, transparent);";

    const size = document.createElement("div");
    size.title = "Data size";
    size.innerHTML = `Size: <span>${formatBytes(code_asset.size)}</span>`;
    size.className = "alekpet_storage_item_skew_box alekpet_storage_item_size";

    const code_name = document.createElement("div");
    code_name.innerHTML = `Name: <span>${code_asset.filename}</span>`;
    code_name.title = `Code filename: ${code_asset.filename}`;
    code_name.className =
      "alekpet_storage_item_skew_box alekpet_storage_item_id";

    // Buttons panel
    const buttons = document.createElement("div");
    Object.assign(buttons.style, { display: "flex", gap: "6px", zIndex: 7 });

    const add = document.createElement("button");
    add.textContent = "➕ Add as copy";
    add.title = "Add to workflow as copy.";
    add.onclick = () => this.addToWorkflow(code_asset);

    const remove = document.createElement("button");
    remove.textContent = "🗑️";
    remove.title = "Remove canvas data";
    remove.className = "alekpet_storage_button_close";
    remove.onclick = () => this.deleteAsset(code_asset, card);

    buttons.append(add, remove);
    meta.append(size, language);
    card.append(previewWrap, code_name, meta, buttons);
    this.items.appendChild(card);
  }

  async addToWorkflow(code_asset) {
    const LiteGraph = globalThis.LiteGraph;
    if (!LiteGraph) {
      console.error("[IDENodeCodeDialog] LiteGraph is unavailable");
      return;
    }

    const node = LiteGraph.createNode("IDENode");
    if (!node) return;

    const mouse = app.canvas?.graph_mouse;
    const selected = app.canvas?.selected_nodes
      ? Object.values(app.canvas.selected_nodes)[0]
      : null;
    node.pos =
      mouse?.length === 2
        ? [mouse[0], mouse[1]]
        : selected?.pos
          ? [selected.pos[0] + 40, selected.pos[1] + 40]
          : [100, 100];

    app.graph.add(node);
    const idenode = await waitForIDENode(node);
    if (!idenode) {
      console.error("[IDENodeCodeDialog] IDENode initialization timed out");
      return;
    }

    const widget_code_id = node.widgets?.findIndex?.(
      (widget) => widget.type === "widget_pycode"
    );
    if (widget_code_id < 0) return;

    const widget_language_id = node.widgets?.findIndex?.(
      (widget) => widget.type === "language"
    );

    const editor = node.widgets[widget_code_id].editor;

    if (editor) {
      node.clsIdeNodeEditor.codeInsertEditor(code_asset.filename);
    }

    app.graph.setDirtyCanvas(true, false);
  }

  async deleteAsset(code_asset, card) {
    if (
      !(await comfyuiDesktopConfirm(
        `Delete filename code '${code_asset.filename}'?`
      ))
    )
      return;

    try {
      const response = await api.fetchApi(`/alekpet/ide_node_remove_code`, {
        method: "POST",
        body: JSON.stringify({
          filename: code_asset.filename,
          language: code_asset.language,
        }),
      });
      if (!response.ok)
        throw new Error(`${response.status} ${response.statusText}`);
      card.remove();
      if (!this.items.children.length) {
        this.items.innerHTML =
          "<div class='alekpet_storage_item'>No IDENode codes</div>";
      }
    } catch (error) {
      console.error(
        "[IDENodeCodeDialog] Failed to delete filename code:",
        error
      );
      alert(`Failed to delete IDENode code: ${error.message}`);
    }
  }
}
