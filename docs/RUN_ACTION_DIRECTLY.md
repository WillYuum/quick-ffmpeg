# Run an Action Directly

Use this guide when you want to start an action immediately without creating or updating a profile in the binder.

Direct mode means:

- You pass a recipe file with `--config`
- You pass one or more input files with `--input`
- No file dialog is needed

## Real example: run speed change directly

### Step 1: create a direct recipe

Create `data/test_data/speed_direct_example.json`:

```json
{
  "version": 1,
  "pipeline": "speed.direct.v1",
  "output": "output/speed_direct.mp4",
  "outputPolicy": {
    "mode": "fixed"
  },
  "actions": [
    {
      "type": "changeSpeed",
      "speed": 1.75,
      "with_minterpolate": false
    }
  ]
}
```

### Step 2: validate recipe + action payload

```bash
node ./cli/index.js validate --config ./data/test_data/speed_direct_example.json
```

### Step 3: run directly with a real input file

```bash
node ./cli/index.js run --config ./data/test_data/speed_direct_example.json --input "C:/Users/willy/Desktop/input/my_video.mp4"
```

If `outputPolicy.mode` is `fixed`, output is exactly `output/speed_direct.mp4`.

## Multiple files in one command

You can pass multiple inputs separated by commas:

```bash
node ./cli/index.js run --config ./data/test_data/speed_direct_example.json --input "C:/Users/willy/Desktop/input/a.mp4,C:/Users/willy/Desktop/input/b.mp4"
```

For multiple files, prefer `outputPolicy.mode: autoSuffix` in recipe so files do not overwrite each other.

## Quick direct trim example

```bash
node ./cli/index.js run --config ./data/test_data/trim_test.json --input "C:/Users/willy/Desktop/input/my_video.mp4"
```

## When to use direct mode vs profile mode

Use direct mode when:

- You are testing a new action quickly
- You want one-off processing

Use profile mode (`--bind`) when:

- You want reusable workflows
- You want environment/profile overrides from binder data