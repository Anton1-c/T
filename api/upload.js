const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const multer = require("multer");
const uploadFolder = path.join(__dirname, "../c");
const hashFilePath = path.join(__dirname, "_blank.json");

if (!fs.existsSync(uploadFolder)) {
    fs.mkdirSync(uploadFolder);
}

if (!fs.existsSync(hashFilePath)) {
    fs.writeFileSync(hashFilePath, JSON.stringify({}));
}

const getJPGExtension = (ext) => {
    if ([".png", ".webp", ".jpeg"].includes(ext)) {
        return ".jpg";
    }
    return ext;
};

// Memperbaiki filter agar hanya menerima file gambar dan MP4
const fileFilter = (req, file, cb) => {
    // Periksa apakah MIME type adalah gambar atau video MP4
    if (
        (file.mimetype.startsWith("image/")) || 
        (file.mimetype === "video/mp4")
    ) {
        return cb(null, true);
    }
    return cb(new Error("Only image files and MP4 videos are allowed"), false);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadFolder);
    },
    filename: (req, file, cb) => {
        const randomString = Math.random().toString(36).substring(2, 8);
        const ext = getJPGExtension(path.extname(file.originalname));
        cb(null, randomString + ext);
    }
});

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024 // Maksimal ukuran file 5MB
    }
});

const saveFileFromBuffer = (buffer, filename) => {
    return new Promise((resolve, reject) => {
        fs.writeFile(path.join(uploadFolder, filename), buffer, (err) => {
            if (err) reject(err);
            else resolve();
        });
    });
};

const formatFileSize = (sizeInBytes) => {
    if (sizeInBytes < 1024) {
        return `${sizeInBytes} bytes`;
    } else if (sizeInBytes < 1048576) {
        return `${(sizeInBytes / 1024).toFixed(2)} KB`;
    } else {
        return `${(sizeInBytes / 1048576).toFixed(2)} MB`;
    }
};

const generateFileHash = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash("sha256").update(fileBuffer).digest("hex");
};

const readHashes = () => {
    const data = fs.readFileSync(hashFilePath);
    return JSON.parse(data);
};

const saveHashes = (hashes) => {
    fs.writeFileSync(hashFilePath, JSON.stringify(hashes, null, 2));
};

const findDuplicateFile = (hash) => {
    const hashes = readHashes();
    for (const [fileHash, fileName] of Object.entries(hashes)) {
        if (fileHash === hash) {
            return fileName;
        }
    }
    return null;
};

module.exports = async (req, res) => {
    if (req.method !== "POST") {
        return res.end(
            JSON.stringify(
                {
                    status: "error",
                    message: "Invalid request method. Use POST."
                },
                null,
                2
            )
        );
    }
    upload.single("image")(req, res, async (err) => {
        if (err) {
            return res.end(
                JSON.stringify(
                    {
                        status: "error",
                        message: err.message
                    },
                    null,
                    2
                )
            );
        }
        if (req.file) {
            try {
                const filePath = path.join(uploadFolder, req.file.filename);
                const fileSiz = fs.statSync(filePath).size;
                const fileHash = generateFileHash(filePath);
                const duplicateFile = findDuplicateFile(fileHash);
                if (duplicateFile) {
                    fs.unlinkSync(filePath);
                    return res.end(
                        JSON.stringify(
                            {
                                status: 200,
                                message: "Duplicate file detected",
                                data: {
                                    url: `http://localhost:3001/c/${duplicateFile}`,
                                    fileSize: formatFileSize(fileSiz)
                                }
                            },
                            null,
                            2
                        )
                    );
                }
                const hashes = readHashes();
                hashes[fileHash] = req.file.filename;
                saveHashes(hashes);
                const fileSize = fs.statSync(filePath).size;
                return res.end(
                    JSON.stringify(
                        {
                            status: 200,
                            author: "AntonThomzz",
                            data: {
                                url: `http://localhost:3001/c/${req.file.filename}`,
                                fileSize: formatFileSize(fileSize),
                                fileName: req.file.filename
                            }
                        },
                        null,
                        2
                    )
                );
            } catch (err) {
                return res.end(
                    JSON.stringify(
                        {
                            status: "error",
                            message: err.message
                        },
                        null,
                        2
                    )
                );
            }
        }
        return res.end(
            JSON.stringify(
                {
                    status: "error",
                    message: "No file uploaded"
                },
                null,
                2
            )
        );
    });
};