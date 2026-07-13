#!/usr/bin/env python3
import argparse
import json
import base64
import gzip
import os

import requests
from dotenv import load_dotenv

load_dotenv()

IOS_DEVICE_ID = os.getenv("IOS_DEVICE_ID")

AUTH_REQUEST_URL = "https://8b9b7.playfabapi.com/Client/LoginWithIOSDeviceID"


def download_balances(data_version: str) -> None:
    import UnityPy

    os.makedirs("balance", exist_ok=True)

    # Stage 1: Load in config (only iOS for now)
    with open("ios_auth_body.json", "r") as f:
        auth_body = json.load(f)
        auth_body["DeviceId"] = IOS_DEVICE_ID

        for i, n in enumerate(auth_body["InfoRequestParameters"]["TitleDataKeys"]):
            auth_body["InfoRequestParameters"]["TitleDataKeys"][i] = n.replace(
                "[VERSION]", data_version
            )

    # Stage 2: get assetbundle manifest and lteschedule from PlayFab
    r = requests.post(AUTH_REQUEST_URL, json=auth_body).json()
    print(r)

    assetbundles_list = json.loads(
        r["data"]["InfoResultPayload"]["TitleData"][f"AssetBundleInfos_{data_version}"]
    )

    lte_schedule = json.loads(
        gzip.decompress(
            base64.b64decode(
                r["data"]["InfoResultPayload"]["TitleData"][
                    f"LteSchedule_{data_version}"
                ]
            )
        ).decode()
    )

    with open("balance/lte_schedule.json", "w") as f:
        json.dump(lte_schedule, f)

    assetbundles_domain = assetbundles_list["RemoteBundlesUrl"]
    assetbundles_urls = []

    # The last "hash" is always used in the filename
    for i in assetbundles_list["GameDataBundles"]:
        url = f"{assetbundles_domain}/{data_version}/iOS/{i['CompiledBundleName']}_{i['Hash'][-1]}"
        assetbundles_urls.append(url)

    localization = assetbundles_list["LocalizationBundle"]
    localization_url = f"{assetbundles_domain}/{data_version}/iOS/{localization['CompiledBundleName']}_{localization['Hash'][-1]}"
    assetbundles_urls.append(localization_url)

    assetbundles_fname = [
        (x.split("/")[-2], x.split("/")[-1]) for x in assetbundles_urls
    ]

    # Stage 3: download individual assetbundles and export JSON
    for i in assetbundles_urls:
        with requests.get(i) as r:
            with open(f"balance/{i.split('/')[-1]}", "wb") as f:
                f.write(r.content)

    for i in assetbundles_fname:
        uab = UnityPy.load(f"balance/{i[1]}")

        for obj in uab.objects:
            if obj.type.name == "TextAsset" and "gamedata_bundle" in i[1]:
                data = obj.read()

                with open(f"balance/balance_{i[0]}.json", "w") as f:
                    f.write(data.m_Script)

            elif obj.type.name == "TextAsset" and "translations_bundle" in i[1]:
                data = obj.read()
                name = data.m_Name

                if name != "English.ini":
                    continue

                with open("balance/localization.txt", "w") as f:
                    f.write(data.m_Script)

    # Stage 4: delete assetbundles (as they are only temp)
    for i in assetbundles_urls:
        os.remove(f"balance/{i.split('/')[-1]}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", default=os.getenv("GAME_VER") or "1.50.0")
    args = parser.parse_args()
    download_balances(args.version)
