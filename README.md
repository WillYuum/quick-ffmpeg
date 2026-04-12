# Quick FFMPEG

 Just created a quick so I can crop videos fast on my pc directly on command line with node.js


 ## How to use
 - Make sure you have node.js installed
 - Run `npm install`
 - Create a folder input and place video inside
 - Create a folder called output



 ## To Crop:
 Run `npm run crop [Number to crop from] [Number to crop to]`
 where [Number to crop from] & [Number to crop to] are in this format 0
 0:00

## Slow Motion
Use `npm run vidtweak` (default binder) or `npm run vidtweak:slowmo`.

The CLI is binder-driven (data-oriented): action presets are mapped in `data/action_binder.json`.
You can select a preset with `--bind <name>`.

Examples:

```bash
npm run vidtweak
npm run vidtweak:speed
node ./cli/index.js --bind trim
node ./cli/index.js --list-bindings
```

You can still bypass bindings with a direct config path:

```bash
node ./cli/index.js --config ./data/test_data/change_speed_test.json
```

Use the action type `slowMotion` with a `speed` value:

```json
{
	"type": "slowMotion",
	"speed": 0.5,
	"with_minterpolate": false
}
```

- Supported slow-motion range: `0.25` to `1`

## Change Video Speed
Use `npm run vidtweak:speed` or `node ./cli/index.js --bind speed`.

Use the action type `changeSpeed` with a `speed` value:

```json
{
	"type": "changeSpeed",
	"speed": 5.55,
	"with_minterpolate": false
}
```

- Supported speed range: `0.25` to `10`
- Decimal values are supported (example: `5.55`)
- Audio tempo is preserved and adjusted automatically for both slower and faster playback
- Output quality is kept close to source by reusing source video/audio bitrates when available
