const dialog = require('node-file-dialog');

// Got this info from node-file-dialog index.js when checking config.types
const DIALOG_TYPES = {
    open_file: 'open-file',
    open_multiple_files: 'open-files',
    save_file: 'save-file',
};


function getFileDirectory(cb) {
    const config = { type: DIALOG_TYPES.open_file };

    dialog(config)
        .then(dir => {
            //Seems the result from dialog resturn an array by default
            //when handling a single file select
            cb(dir[0]);
        })
        .catch(err => console.log(GetErrorReasonMessage(err)));

}

function getMultipleFiles(cb) {
    const config = { type: DIALOG_TYPES.open_multiple_files };

    dialog(config)
        .then(files => {
            //remove /r from the end of the string
            files = files.map(file => file.replace(/\r$/, ''));


            cb(files);
        })
        .catch(err => console.log(GetErrorReasonMessage(err)));
}

function getSaveDir(cb) {
    const config = { type: DIALOG_TYPES.save_file };

    dialog(config)
        .then(dir => {
            cb(dir[0]);
        })
        .catch(err => console.log(GetErrorReasonMessage(err)));
}



function GetErrorReasonMessage(err) {
    const errorFromClosingDialog = err.toString().includes('Nothing selected');

    switch (true) {
        case errorFromClosingDialog:
            return "Operation Cancelled: File wasn't selected";
        default:
            return err;
    }
}

module.exports = { getFileDirectory, getSaveDir, getMultipleFiles };
