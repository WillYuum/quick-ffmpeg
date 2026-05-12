const path = require('path');
const fs = require('fs');
const { validateActionManifest, validateActionPayload } = require('../cli/validator');

const manifestPath = path.resolve(__dirname, '../data/action_manifest.json');

function readManifest() {
    if (!fs.existsSync(manifestPath)) {
        throw new Error(`Action manifest not found: ${manifestPath}`);
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    validateActionManifest(manifest);
    return manifest;
}

function createActionRegistry() {
    const manifest = readManifest();
    const actionMap = {};
    const metadataMap = {};

    for (const action of manifest.actions) {
        const modulePath = path.resolve(__dirname, '..', action.module);
        const schemaPath = path.resolve(__dirname, '..', action.schema);
        const handler = require(modulePath);

        if (typeof handler !== 'function') {
            throw new Error(`Action module must export a function: ${modulePath}`);
        }

        metadataMap[action.id] = {
            id: action.id,
            schemaPath,
            aliases: action.aliases || [],
            capabilities: action.capabilities || [],
        };

        actionMap[action.id] = handler;
        for (const alias of action.aliases || []) {
            actionMap[alias] = handler;
        }
    }

    function getHandler(actionType) {
        return actionMap[actionType];
    }

    function normalizeType(actionType) {
        if (metadataMap[actionType]) {
            return actionType;
        }

        const entry = Object.values(metadataMap).find(meta => meta.aliases.includes(actionType));
        return entry ? entry.id : actionType;
    }

    function getActionMetadata(actionType) {
        const normalizedType = normalizeType(actionType);
        return metadataMap[normalizedType];
    }

    function validateAction(actionPayload) {
        const metadata = getActionMetadata(actionPayload.type);
        if (!metadata) {
            const availableActions = Object.keys(metadataMap).join(', ');
            throw new Error(`Unknown action type: ${actionPayload.type}. Available actions: ${availableActions}`);
        }

        const normalizedPayload = { ...actionPayload, type: metadata.id };
        validateActionPayload(normalizedPayload, metadata.schemaPath, metadata.id);
        return normalizedPayload;
    }

    function listActions() {
        return Object.values(metadataMap);
    }

    return {
        getHandler,
        getActionMetadata,
        validateAction,
        listActions,
    };
}

module.exports = {
    createActionRegistry,
};