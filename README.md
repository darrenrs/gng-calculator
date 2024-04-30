# Gold and Goblins Mineshaft Table

Very basic Node/TypeScript server that displays G&G Mineshaft data along with a Python script to automatically collect game balances (iOS logins only.) This may become a more robust calculator later on down the line.

## Setup

To set this up, you need a `gc-auth-body.json` and `.env` file. The `gc-auth-body.json` file is a bare template for the request that is sent to PlayFab. Note that due to technical limitations this only appears to work for iOS devices; it may be possible to authenticate using an Android device (via Google Play) but this has not yet been explored.

The structure of the `.env` file is as follows:

```
PORT=
TITLE_ID=8b9b7
GC_AUTH_ID=
GAME_VER=
```

Fill in the parameters with the
* Port (probably 3000)
* Game Center authentication ID (the login ID you see via mitmproxy or similar software)
* Game version (in the format x.y.z)

Should everything be correctly populated, there will not be any issues extracting the data using the Python script. From there, the actual node server will draw upon the locally stored data.