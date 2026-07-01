from __future__ import annotations

import base64
import gzip
import importlib.util
import json
from pathlib import Path
from typing import Any, Literal

import requests
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse, PlainTextResponse
from pydantic import BaseModel

ROOT = Path(__file__).resolve().parents[2]
BALANCE_DIR = ROOT / "balance"

app = FastAPI(title="G&G Calculator API")


class UpdateRequest(BaseModel):
    version: str


class SaveRequest(BaseModel):
    platform: Literal["ios", "android"]
    deviceId: str


@app.exception_handler(HTTPException)
async def http_exception_handler(_request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


@app.get("/api/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.get("/api/balances")
def balances() -> list[str]:
    if not BALANCE_DIR.exists():
        raise HTTPException(status_code=404, detail="balance directory not found")

    ids = sorted(
        file.name.removeprefix("balance_").removesuffix(".json")
        for file in BALANCE_DIR.glob("balance_*.json")
    )

    if "evergreen" in ids:
        ids.remove("evergreen")
        ids.insert(0, "evergreen")

    return ids


@app.get("/api/balances/{balance_id}")
def balance(balance_id: str) -> Any:
    path = _balance_path(balance_id)
    if not path.exists():
        raise HTTPException(status_code=404, detail="balance not found")

    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="balance JSON decode failed") from exc


@app.get("/api/schedule")
def schedule() -> Any:
    path = BALANCE_DIR / "lte_schedule.json"
    if not path.exists():
        raise HTTPException(status_code=404, detail="schedule not found")

    try:
        return json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=500, detail="schedule JSON decode failed") from exc


@app.get("/api/localization", response_class=PlainTextResponse)
def localization() -> str:
    path = BALANCE_DIR / "localization.txt"
    if not path.exists():
        raise HTTPException(status_code=404, detail="localization not found")
    return path.read_text()


@app.post("/api/update")
def update_balances(request: UpdateRequest) -> dict[str, Any]:
    script_path = ROOT / "scripts" / "get-balances.py"
    spec = importlib.util.spec_from_file_location("get_balances", script_path)
    if spec is None or spec.loader is None:
        raise HTTPException(status_code=500, detail="unable to load downloader")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)

    try:
        module.download_balances(request.version)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {"ok": True, "version": request.version}


@app.post("/api/save")
def save(request: SaveRequest) -> Any:
    if not request.deviceId:
        raise HTTPException(status_code=400, detail="deviceId is required")

    save_value = _fetch_save_value(request.platform, request.deviceId)
    save_bytes = _decode_save_bytes(save_value)

    try:
        from google.protobuf.json_format import MessageToJson
        from gng_pb2 import UniverseModel
    except ImportError as exc:
        raise HTTPException(
            status_code=500,
            detail="save protobuf decoder is not available; add gng_pb2.py to decode saves",
        ) from exc

    try:
        proto = UniverseModel()
        proto.ParseFromString(save_bytes)
        return json.loads(MessageToJson(proto, preserving_proto_field_name=True))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="save JSON decode failed") from exc


def _balance_path(balance_id: str) -> Path:
    if "/" in balance_id or "\\" in balance_id or balance_id.startswith("."):
        raise HTTPException(status_code=400, detail="invalid balance id")
    return BALANCE_DIR / f"balance_{balance_id}.json"


def _fetch_save_value(platform: str, device_id: str) -> str:
    auth_file = ROOT / f"{platform}_auth_body.json"
    if not auth_file.exists():
        raise HTTPException(status_code=500, detail=f"{platform} auth body missing")

    auth_body = json.loads(auth_file.read_text())
    if platform == "ios":
        auth_body["DeviceId"] = device_id
        url = "https://8b9b7.playfabapi.com/Client/LoginWithIOSDeviceID"
    elif platform == "android":
        auth_body["AndroidDeviceId"] = device_id
        url = "https://8b9b7.playfabapi.com/Client/LoginWithAndroidDeviceID"
    else:
        raise HTTPException(status_code=400, detail="platform must be ios or android")

    response = requests.post(url, json=auth_body, timeout=30)
    if response.status_code == 404:
        raise HTTPException(status_code=404, detail="save not found")
    if response.status_code != 200:
        raise HTTPException(status_code=response.status_code, detail="PlayFab request failed")

    try:
        body = response.json()
        return body["data"]["InfoResultPayload"]["UserData"]["SaveData"]["Value"]
    except (KeyError, json.JSONDecodeError) as exc:
        raise HTTPException(status_code=500, detail="PlayFab save payload missing") from exc


def _decode_save_bytes(save_value: str) -> bytes:
    try:
        return gzip.decompress(base64.b64decode(save_value))
    except Exception as exc:
        raise HTTPException(status_code=500, detail="save payload decode failed") from exc
