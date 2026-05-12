const path = require('path');
const fs = require('fs');

function ensureOutputDir() {
    const outputDir = path.resolve('./output');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    return outputDir;
}

function withIndexedSuffix(filePath, index) {
    const extension = path.extname(filePath) || '.mp4';
    const baseName = path.basename(filePath, extension);
    const dir = path.dirname(filePath);
    return path.join(dir, `${baseName}_${index}${extension}`);
}

function resolveOutputPath(recipe, inputFilePath, index, totalCount) {
    const mode = recipe.outputPolicy?.mode || 'autoSuffix';
    const hasExplicitOutput = Boolean(recipe.output);

    if (!hasExplicitOutput) {
        const outputDir = ensureOutputDir();
        return path.join(outputDir, path.basename(inputFilePath));
    }

    if (mode === 'fixed') {
        return path.resolve(recipe.output);
    }

    const needsSuffix = totalCount > 1;
    if (!needsSuffix) {
        return path.resolve(recipe.output);
    }

    return path.resolve(withIndexedSuffix(recipe.output, index));
}

function compilePlan(recipe, inputFilePath, index, totalCount) {
    return {
        version: recipe.version || 1,
        pipeline: recipe.pipeline || 'legacy.v1',
        input: inputFilePath,
        output: resolveOutputPath(recipe, inputFilePath, index, totalCount),
        actions: recipe.actions || [],
    };
}

module.exports = {
    compilePlan,
};