const fs = require('fs');
const path = require('path');

const binderPath = path.resolve(__dirname, '../data/action_binder.json');

function readBinderFile() {
    if (!fs.existsSync(binderPath)) {
        throw new Error(`Binder file not found: ${binderPath}`);
    }

    const raw = fs.readFileSync(binderPath, 'utf-8');
    const binder = JSON.parse(raw);
    const hasBindingsObject = binder && typeof binder.bindings === 'object';

    if (!hasBindingsObject) {
        throw new Error('Invalid binder file. Expected shape: { "default": "...", "bindings": { ... } }');
    }

    return binder;
}

function getAvailableBindings() {
    const binder = readBinderFile();
    return Object.keys(binder.bindings);
}

function resolveConfigPath(bindingName) {
    const binder = readBinderFile();
    const requestedBinding = bindingName || binder.default;

    if (!requestedBinding) {
        throw new Error('No binding was provided and binder default is missing.');
    }

    const relativeConfigPath = binder.bindings[requestedBinding];
    if (!relativeConfigPath) {
        const available = Object.keys(binder.bindings).join(', ');
        throw new Error(`Unknown binding: ${requestedBinding}. Available bindings: ${available}`);
    }

    return {
        binding: requestedBinding,
        configPath: path.resolve(relativeConfigPath),
    };
}

module.exports = {
    getAvailableBindings,
    resolveConfigPath,
};