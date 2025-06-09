#!/usr/bin/env node

const systemDialog = require('../utils/system_dialog_prompter');
const processVideo = require('../engine/processVideo');
const fs = require('fs');

const configPath = './data/crop_bitrate_test.json';

systemDialog.getFileDirectory((filePath) => {
    // Read config
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    // Set the selected input file path
    config.input = filePath;

    // Save updated config (optional)
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    // Run the video processor with updated config
    processVideo(config);
});