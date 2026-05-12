const fs = require('fs');
const path = require('path');
const Ajv = require('ajv');

const ajv = new Ajv({ allErrors: true, strict: false });

function loadJson(absolutePath) {
    return JSON.parse(fs.readFileSync(absolutePath, 'utf-8'));
}

function getValidator(schemaPath) {
    const schema = loadJson(schemaPath);
    return ajv.compile(schema);
}

function formatErrors(errors) {
    if (!errors || errors.length === 0) {
        return 'Unknown schema validation error';
    }

    return errors
        .map(error => {
            const instancePath = error.instancePath || '/';
            return `${instancePath} ${error.message}`;
        })
        .join('; ');
}

function validateWithSchema(data, schemaPath, label) {
    const validate = getValidator(schemaPath);
    const valid = validate(data);
    if (!valid) {
        const details = formatErrors(validate.errors);
        throw new Error(`${label} validation failed: ${details}`);
    }
}

function validateBinder(binderData) {
    const schemaPath = path.resolve(__dirname, '../data/schemas/binder.schema.json');
    validateWithSchema(binderData, schemaPath, 'Binder');
}

function validateRecipe(recipeData) {
    const schemaPath = path.resolve(__dirname, '../data/schemas/recipe.schema.json');
    validateWithSchema(recipeData, schemaPath, 'Recipe');
}

function validateActionManifest(manifestData) {
    const schemaPath = path.resolve(__dirname, '../data/schemas/action_manifest.schema.json');
    validateWithSchema(manifestData, schemaPath, 'Action manifest');
}

function validateActionPayload(actionData, actionSchemaPath, actionId) {
    validateWithSchema(actionData, actionSchemaPath, `Action ${actionId}`);
}

module.exports = {
    validateBinder,
    validateRecipe,
    validateActionManifest,
    validateActionPayload,
};