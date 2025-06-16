#!/usr/bin/env node

const systemDialog = require('../utils/system_dialog_prompter');
const processVideo = require('../engine/processVideo');
const fs = require('fs');
const path = require('path');

const configPath = './data/test_data/crop_bitrate_test.json';

systemDialog.getMultipleFiles(async (filePaths) => {
    console.log("Selected file paths:", filePaths);

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
