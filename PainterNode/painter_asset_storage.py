"""
Backend storage for PainterNode canvas state.
Workflow files contain only a small asset reference. The Fabric.js canvas JSON
(which may contain base64 encoded images) is stored server-side instead.
"""

import json
import os
import re
import shutil
import tempfile
from datetime import datetime, timezone

from aiohttp import web
from server import PromptServer
import folder_paths


ASSET_ID_RE = re.compile(
    r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-"
    r"[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"
)


def _asset_root():
    # Keep Painter data outside the workflow and outside the custom-node directory so updating/reinstalling the extension does not delete it.
    if hasattr(folder_paths, "get_system_user_directory"):
        root = folder_paths.get_system_user_directory("alekpet")
    else:
        root = os.path.join(folder_paths.get_user_directory(), "__alekpet")

    root = os.path.join(root, "painter_assets")
    os.makedirs(root, exist_ok=True)

    return root


def _asset_dir(asset_id):
    if not isinstance(asset_id, str) or not ASSET_ID_RE.fullmatch(asset_id):
        raise ValueError("Invalid Painter asset_id")

    return os.path.join(_asset_root(), asset_id)


def _json_response_error(message, status=400):
    return web.json_response({"success": False, "error": message}, status=status)


def file_time_iso(timestamp):
    return datetime.fromtimestamp(
        timestamp,
        timezone.utc,
    ).isoformat()

@PromptServer.instance.routes.get("/alekpet/painter_assets")
async def list_painter_assets(request):
    try:
        root = _asset_root()
        assets = []
        for asset_id in os.listdir(root):
            if not ASSET_ID_RE.fullmatch(asset_id):
                continue

            asset_dir = os.path.join(root, asset_id)
            state_path = os.path.join(asset_dir, "state.json")

            if not os.path.isfile(state_path):
                continue

            file_stat = os.stat(state_path)
            width = height = None

            try:
                with open(state_path, "r", encoding="utf-8") as f:
                    state = json.load(f)

                metadata = state.get("metadata")
                if not metadata:
                    metadata = {}

                created_at = metadata.get("created_at") or file_time_iso(file_stat.st_mtime)
                updated_at = metadata.get("updated_at") or file_time_iso(file_stat.st_mtime)

                workflow_name = metadata.get("workflow_name", "Unsaved Workflow")

                size = state.get("settings", {}).get("currentCanvasSize", {})
                width = size.get("width")
                height = size.get("height")

            except (OSError, json.JSONDecodeError, AttributeError):
                pass

            assets.append(
                {
                    "asset_id": asset_id,
                    "size": file_stat.st_size,
                    "created_at": created_at,
                    "updated_at": updated_at,
                    "width": width,
                    "height": height,
                    "workflow_name": workflow_name
                }
            )

        assets.sort(key=lambda item: item["updated_at"], reverse=True)
        return web.json_response({"success": True, "assets": assets})
    except OSError as e:
        return _json_response_error(str(e), 500)


@PromptServer.instance.routes.get("/alekpet/painter_asset/{asset_id}")
async def get_painter_asset(request):
    try:
        asset_id = request.match_info["asset_id"]
        state_path = os.path.join(_asset_dir(asset_id), "state.json")

        if not os.path.isfile(state_path):
            return _json_response_error("Painter asset not found", 404)

        with open(state_path, "r", encoding="utf-8") as f:
            state = json.load(f)

        return web.json_response(
            {
                "success": True,
                "asset_id": asset_id,
                "state": state,
            }
        )
    except ValueError as e:
        return _json_response_error(str(e), 400)
    except (OSError, json.JSONDecodeError) as e:
        return _json_response_error(str(e), 500)


@PromptServer.instance.routes.post("/alekpet/painter_asset/{asset_id}")
async def save_painter_asset(request):
    try:
        asset_id = request.match_info["asset_id"]
        asset_dir = _asset_dir(asset_id)
        payload = await request.json()
        state = payload.get("state")
        workflow_name = payload.get("workflow_name")

        if not isinstance(state, dict):
            return _json_response_error("state must be an object", 400)

        # Get metadata
        metadata = state.get("metadata")
        now = datetime.now(timezone.utc).isoformat()

        if not isinstance(metadata, dict):
            metadata = {}
            state["metadata"] = metadata

        # created_at - not change if asset exist
        existing_created_at = None
        state_path = os.path.join(asset_dir, "state.json")

        if os.path.isfile(state_path):
            try:
                with open(state_path, "r", encoding="utf-8") as f:
                    existing_state = json.load(f)

                existing_metadata = existing_state.get("metadata")

                if isinstance(existing_metadata, dict):
                    existing_created_at = existing_metadata.get("created_at")

                if not existing_created_at:
                    existing_created_at = file_time_iso(os.path.getmtime(state_path))

            except (OSError, json.JSONDecodeError):
                pass

        # Check created date
        if existing_created_at:
            metadata["created_at"] = existing_created_at
        else:
            metadata["created_at"] = now

        # Update update date
        metadata["updated_at"] = now

        # Update workflow_name
        if workflow_name:
            metadata["workflow_name"] = workflow_name

        os.makedirs(asset_dir, exist_ok=True)
        fd, tmp_path = tempfile.mkstemp(
            prefix=".state-",
            suffix=".tmp",
            dir=asset_dir,
        )
        try:
            with os.fdopen(fd, "w", encoding="utf-8") as f:
                json.dump(
                    state,
                    f,
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                f.flush()
                os.fsync(f.fileno())
            os.replace(tmp_path, os.path.join(asset_dir, "state.json"))
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

        return web.json_response(
            {
                "success": True,
                "asset_id": asset_id,
            }
        )
    except ValueError as e:
        return _json_response_error(str(e), 400)
    except (OSError, json.JSONDecodeError) as e:
        return _json_response_error(str(e), 500)


@PromptServer.instance.routes.delete("/alekpet/painter_asset/{asset_id}")
async def delete_painter_asset(request):
    try:
        asset_dir = _asset_dir(request.match_info["asset_id"])
        if os.path.isdir(asset_dir):
            shutil.rmtree(asset_dir)

        return web.json_response({"success": True})
    except ValueError as e:
        return _json_response_error(str(e), 400)
    except OSError as e:
        return _json_response_error(str(e), 500)
