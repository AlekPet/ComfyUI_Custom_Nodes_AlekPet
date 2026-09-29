import { api } from "../../../../scripts/api.js";
import { app } from "../../../../scripts/app.js";
import { fabric } from "./fabric.js";
import { formatBytes, createPainterAssetId } from "./helpers.js";
import { comfyuiDesktopConfirm } from "../../utils.js";

const ASSET_VERSION = 2;

function assetRef(assetId) {
  return { version: ASSET_VERSION, asset_id: assetId };
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function waitForPainter(node, timeout = 5000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => {
      if (node.painter?.canvas) return resolve(node.painter);
      if (Date.now() - started >= timeout) return resolve(null);
      setTimeout(tick, 50);
    };
    tick();
  });
}

export class PainterAssetDialog {
  constructor() {
    this.overlay = null;
    this.items = null;
  }

  show() {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "alekpet_painter_storage_overlay";

    const box = document.createElement("div");
    box.className = "alekpet_painter_storage_box";

    const header = document.createElement("div");
    header.className = "alekpet_painter_storage_header";
    header.innerHTML = `<strong>Painter Assets</strong>`;

    const close = document.createElement("button");
    close.textContent = "✕";
    close.onclick = () => this.close();
    header.appendChild(close);

    const toolbar = document.createElement("div");
    toolbar.className = "alekpet_painter_storage_toolbar";

    const refresh = document.createElement("button");
    refresh.textContent = "Refresh";
    refresh.onclick = () => this.load();
    toolbar.appendChild(refresh);

    this.items = document.createElement("div");
    this.items.className = "alekpet_painter_storage_items";

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
    this.items.innerHTML =
      "<div class='alekpet_painter_storage_item'>Loading...</div>";

    try {
      const response = await api.fetchApi("/alekpet/painter_assets");
      if (!response.ok)
        throw new Error(`${response.status} ${response.statusText}`);
      const result = await response.json();
      const assets = Array.isArray(result?.assets) ? result.assets : [];

      this.items.innerHTML = "";
      if (!assets.length) {
        this.items.innerHTML =
          "<div class='alekpet_painter_storage_item'>No Painter assets</div>";
        return;
      }

      assets.sort((a, b) => (b.updated_at || 0) - (a.updated_at || 0));
      for (const asset of assets) this.renderAsset(asset);
    } catch (error) {
      this.items.innerHTML = `<div class='alekpet_painter_storage_item' style='text-align:left;color:var(--error-text,#f66);'>${escapeHtml(error.message)}</div>`;
      console.error("[PainterAssetDialog] Failed to load assets:", error);
    }
  }

  renderAsset(asset) {
    const card = document.createElement("div");
    card.className = "alekpet_painter_storage_item_card";

    // Preview canvas saved data
    const previewWrap = document.createElement("div");
    previewWrap.className = "alekpet_painter_storage_item_preview_wrapper";

    const canvasEl = document.createElement("canvas");
    canvasEl.style.maxWidth = "100%";
    canvasEl.style.maxHeight = "100%";
    previewWrap.appendChild(canvasEl);

    // Metadata
    const meta = document.createElement("div");
    meta.className = "alekpet_painter_storage_item_meta";

    const id = document.createElement("div");
    id.innerHTML = `Id: <span>${asset.asset_id}</span>`;
    id.title = `Unique id: ${asset.asset_id}`;
    id.className =
      "alekpet_painter_storage_item_skew_box alekpet_painter_storage_item_id";

    const size = document.createElement("div");
    size.title = "Data size · Pixel resolution";
    size.innerHTML = `Size: <span>${formatBytes(asset.size)}</span> · WxH: <span>${asset.width && asset.height ? `${asset.width}×${asset.height}` : ""}</span>`;
    size.className =
      "alekpet_painter_storage_item_skew_box alekpet_painter_storage_item_size";

    const workflow_name = document.createElement("div");
    workflow_name.innerHTML = `Workflow: <span>${asset.workflow_name}</span>`;
    workflow_name.title = `Last used workflow: ${asset.workflow_name}`;
    workflow_name.className =
      "alekpet_painter_storage_item_skew_box alekpet_painter_storage_item_workflow_name";

    const created_date = new Date(asset.created_at).toLocaleString();
    const file_date_created = document.createElement("div");
    file_date_created.title = "Date create at";
    file_date_created.innerHTML = `Create at: <span>${created_date}</span>`;
    file_date_created.className =
      "alekpet_painter_storage_item_skew_box alekpet_painter_storage_item_created_date";

    const updated_date = new Date(asset.updated_at).toLocaleString();
    const file_date_updated = document.createElement("div");
    file_date_updated.title = "Date update at";
    file_date_updated.innerHTML = `Update at: <span>${updated_date}</span>`;
    file_date_updated.className =
      "alekpet_painter_storage_item_skew_box alekpet_painter_storage_item_updated_date";

    // Buttons panel
    const buttons = document.createElement("div");
    Object.assign(buttons.style, { display: "flex", gap: "6px" });

    const add = document.createElement("button");
    add.textContent = "➕ Add as copy";
    add.title = "Add to workflow as copy.";
    add.onclick = () => this.addToWorkflow(asset.asset_id);

    const addRef = document.createElement("button");
    addRef.textContent = "🔗 Add as reference";
    addRef.title =
      "Add to workflow as reference. Attention: the change will affect all copies in workflows!";
    addRef.onclick = () => this.addToWorkflow(asset.asset_id, true);

    const remove = document.createElement("button");
    remove.textContent = "🗑️";
    remove.title = "Remove canvas data";
    remove.className = "alekpet_painter_storage_button_close";
    remove.onclick = () => this.deleteAsset(asset.asset_id, card);

    buttons.append(add, addRef, remove);
    meta.append(id, workflow_name, size, file_date_created, file_date_updated);
    card.append(previewWrap, id, meta, buttons);
    this.items.appendChild(card);

    this.loadPreview(asset.asset_id, canvasEl).catch((error) => {
      console.warn("[PainterAssetDialog] Preview failed:", error);
    });
  }

  async loadPreview(assetId, canvasEl) {
    const response = await api.fetchApi(
      `/alekpet/painter_asset/${encodeURIComponent(assetId)}`
    );
    if (!response.ok)
      throw new Error(`${response.status} ${response.statusText}`);
    const state = (await response.json())?.state;
    if (!state?.canvas_settings) return;

    const size = state.settings?.currentCanvasSize || {
      width: 512,
      height: 512,
    };
    const scale = Math.min(1, 170 / Math.max(size.width, size.height));
    const width = Math.max(1, Math.round(size.width * scale));
    const height = Math.max(1, Math.round(size.height * scale));
    canvasEl.width = width;
    canvasEl.height = height;

    const preview = new fabric.StaticCanvas(canvasEl, {
      width,
      height,
      backgroundColor: state.canvas_settings.background || "#000000",
    });

    await new Promise((resolve) => {
      preview.loadFromJSON(state.canvas_settings, () => {
        preview.setDimensions({ width, height });
        preview.setViewportTransform([scale, 0, 0, scale, 0, 0]);
        preview.renderAll();
        resolve();
      });
    });
  }

  async addToWorkflow(assetId, persist = false) {
    const LiteGraph = globalThis.LiteGraph;
    if (!LiteGraph) {
      console.error("[PainterAssetDialog] LiteGraph is unavailable");
      return;
    }

    const node = LiteGraph.createNode("PainterNode");
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
    const painter = await waitForPainter(node);
    if (!painter) {
      console.error(
        "[PainterAssetDialog] PainterNode initialization timed out"
      );
      return;
    }

    const painterIndex = node.widgets?.findIndex?.(
      (widget) => widget.type === "painter_node_alekpet"
    );
    if (painterIndex < 0) return;

    await painter.loadCanvasData(assetRef(assetId), painterIndex, {
      migrateImage: false,
      persist,
    });

    if (!persist) {
      painter.node.painterAsset.asset_id = createPainterAssetId();
      await painter.persistPainterState();
    }

    app.graph.setDirtyCanvas(true, false);
  }

  async deleteAsset(assetId, card) {
    if (!(await comfyuiDesktopConfirm(`Delete Painter asset ${assetId}?`)))
      return;

    try {
      const response = await api.fetchApi(
        `/alekpet/painter_asset/${encodeURIComponent(assetId)}`,
        { method: "DELETE" }
      );
      if (!response.ok)
        throw new Error(`${response.status} ${response.statusText}`);
      card.remove();
      if (!this.items.children.length) {
        this.items.innerHTML =
          "<div class='alekpet_painter_storage_item'>No Painter assets</div>";
      }
    } catch (error) {
      console.error("[PainterAssetDialog] Failed to delete asset:", error);
      alert(`Failed to delete Painter asset: ${error.message}`);
    }
  }
}
