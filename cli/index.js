#!/usr/bin/env node

const systemDialog = require('../utils/system_dialog_prompter');
const processVideo = require('../engine/processVideo');
const fs = require('fs');
const path = require('path');
const { getAvailableBindings, resolveConfigPath } = require('./binder');

const args = process.argv.slice(2);

function getArgValue(flagName, alias) {
    const longFlagIndex = args.indexOf(flagName);
    if (longFlagIndex !== -1) {
        return args[longFlagIndex + 1];
    }

    if (!alias) {
        return null;
    }

    const shortFlagIndex = args.indexOf(alias);
    if (shortFlagIndex !== -1) {
        return args[shortFlagIndex + 1];
    }

    return null;
}

if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: vidtweak [--bind <name>] [--config <path>] [--list-bindings]');
    console.log('');
    console.log('Examples:');
    console.log('  vidtweak');
    console.log('  vidtweak --bind speed');
    console.log('  vidtweak --config ./data/test_data/change_speed_test.json');
    process.exit(0);
}

if (args.includes('--list-bindings')) {
    console.log('Available bindings:');
    for (const binding of getAvailableBindings()) {
        console.log(`- ${binding}`);
    }
    process.exit(0);
}

const explicitConfigPath = getArgValue('--config', '-c');
const bindingArg = getArgValue('--bind', '-b');

let configPath;
let selectedBinding = null;

if (explicitConfigPath) {
    configPath = path.resolve(explicitConfigPath);
} else {
    try {
        const resolution = resolveConfigPath(bindingArg);
        configPath = resolution.configPath;
        selectedBinding = resolution.binding;
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
}

if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
}

systemDialog.getMultipleFiles(async (filePaths) => {
    console.log("Selected file paths:", filePaths);
    console.log("Using config:", configPath);
    if (selectedBinding) {
        console.log("Using binding:", selectedBinding);
    }

    if (!filePaths || filePaths.length === 0) {
        console.log("No files selected.");
        return;
    }

    for (let index = 0; index < filePaths.length; index++) {
        const filePath = filePaths[index];

        const baseConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        let outputPath;
        if (baseConfig.output) {
            outputPath = baseConfig.output.replace(/(\.mp4)$/, `_${index}.mp4`);
        } else {
            const outputDir = path.resolve('./output');
            if (!fs.existsSync(outputDir)) {
                fs.mkdirSync(outputDir, { recursive: true });
            }
            const fileName = path.basename(filePath);
            outputPath = path.join(outputDir, fileName);
        }
        const config = {
            ...baseConfig,
            input: filePath,
            output: outputPath,
        };

        console.log(`\n=== Processing Video ${index + 1} of ${filePaths.length} ===`);
        console.log(`Input: ${config.input}`);
        console.log(`Output: ${config.output}`);

        try {
            await processVideo(config);
            console.log(`✅ Video ${index + 1} processed successfully.\n`);
        } catch (err) {
            console.log(`❌ Video ${index + 1} failed: ${err.message}\n`);
        }
    }

    console.log("🎉 All videos processed.");
});
