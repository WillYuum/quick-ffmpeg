# Add a New Action

This project uses a data-oriented flow:

1. A recipe defines `actions` in JSON.
2. The action registry reads metadata from `data/action_manifest.json`.
3. Each action payload is validated with JSON Schema before execution.

Use this checklist when adding a new action.

## 1) Create the action handler

Create a file in `actions/`, for example `actions/watermark.js`.

Your module must export a function:

```js
async function watermark(command, action, inputFilePath) {
    // Apply ffmpeg options and return command
    return command;
}

module.exports = watermark;
```

Rules:

- Return the updated ffmpeg command.
- Throw errors for invalid runtime state.
- Keep action params in `action` (data), not hardcoded constants.

## 2) Add action payload schema

Create `data/schemas/actions/watermark.schema.json`.

Example:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["type", "text"],
  "properties": {
    "type": { "const": "watermark" },
    "text": { "type": "string", "minLength": 1 }
  },
  "additionalProperties": false
}
```

## 3) Register action in manifest

Update `data/action_manifest.json` and add an action entry:

```json
{
  "id": "watermark",
  "module": "actions/watermark.js",
  "schema": "data/schemas/actions/watermark.schema.json",
  "aliases": [],
  "capabilities": ["overlay"]
}
```

Notes:

- `id` must match `action.type` in recipes.
- `module` and `schema` are project-relative paths.
- Use `aliases` only for backward compatibility names.

## 4) Add recipe data for testing/use

Create or update a recipe in `data/test_data/`, for example:

```json
{
  "version": 1,
  "pipeline": "watermark.v1",
  "outputPolicy": { "mode": "autoSuffix" },
  "actions": [
    { "type": "watermark", "text": "Sample" }
  ]
}
```

If this should be runnable by profile name, update `data/action_binder.json` under `profiles`.

## 5) Validate before running

Run validation:

```bash
node ./cli/index.js validate --config ./data/test_data/your_recipe.json
```

or with profile:

```bash
node ./cli/index.js validate --bind yourProfile
```

## 6) Execute

Run with profile:

```bash
node ./cli/index.js run --bind yourProfile
```

Run with direct recipe:

```bash
node ./cli/index.js run --config ./data/test_data/your_recipe.json
```

## Common mistakes

- `type` in recipe does not match `id` in manifest.
- Missing schema file or wrong schema path in manifest.
- Action schema allows fields that handler does not support.
- Hardcoding paths/values in action code instead of reading action data.