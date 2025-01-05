const fs = require("fs");
const path = require("path");

const uploadFolder = path.join(__dirname, '../c');
function deleteOldFiles() {
    const currentTime = Date.now();
    fs.readdir(uploadFolder, (err, files) => {
        if (err) {
            console.error("Error reading the uploads directory:", err);
            return;
        }
        files.forEach((file) => {
            const filePath = path.join(uploadFolder, file);
            fs.stat(filePath, (err, stats) => {
                if (err) {
                    console.error("Error reading file stats:", err);
                    return;
                }
                const fileAge = currentTime - stats.mtimeMs;
                const oneDayInMillis = 24 * 60 * 60 * 1000;
                if (fileAge > oneDayInMillis) {
                    fs.unlink(filePath, (err) => {
                        if (err) {
                            console.error("Error deleting file:", err);
                        } else {
                            console.log(`File deleted: ${file}`);
                        }
                    });
                }
            });
        });
    });
};

setInterval(deleteOldFiles, 60 * 60 * 1000);