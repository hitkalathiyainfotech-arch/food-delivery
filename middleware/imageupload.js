import multer from "multer";
import sharp from "sharp";
import path from "path";
import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

dotenv.config();

// S3 Client
const s3 = new S3Client({
    region: process.env.S3_REGION,
    credentials: {
        accessKeyId: String(process.env.S3_ACCESS_KEY).trim(),
        secretAccessKey: String(process.env.S3_SECRET_KEY).trim()
    }
});

// Map fields → S3 folder
const getS3Folder = (fieldname) => {
    switch (fieldname) {
        case "category_image":
            return "category_images";
        default:
            throw new Error(`Invalid field name: ${fieldname}`);
    }
};

// Multer memory storage (only images allowed)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 1024 * 1024 * 20 }, // 20MB max (images only)
    fileFilter: (req, file, cb) => {
        const isImage = file.mimetype.startsWith("image/");
        const isOctetStream = file.mimetype === "application/octet-stream";
        const ext = path.extname(file.originalname).toLowerCase();
        const isJfifExt = ext === ".jfif";

        const allowedImageFields = [
            "category_image"
        ];

        if (allowedImageFields.includes(file.fieldname)) {
            return (isImage || isOctetStream || isJfifExt)
                ? cb(null, true)
                : cb(new Error("Invalid image file."));
        }

        return cb(new Error(`Invalid field name for upload: ${file.fieldname}`));
    }
});

// Convert + Upload to S3 (only images)
const processAndUploadMedia = async (req, res, next) => {
    if (!req.files) return next();

    try {
        req.s3Files = {};

        for (const fieldname of Object.keys(req.files)) {
            const file = req.files[fieldname][0];
            const ext = path.extname(file.originalname).toLowerCase();
            const shouldConvert =
                ext === ".jfif" || file.mimetype === "application/octet-stream";

            // Convert jfif → jpeg
            const buffer = shouldConvert
                ? await sharp(file.buffer).jpeg().toBuffer()
                : file.buffer;

            const folder = getS3Folder(fieldname);
            const fileName = `${Date.now()}.jpeg`;
            const key = `${folder}/${fileName}`;

            await s3.send(
                new PutObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: key,
                    Body: buffer,
                    ContentType: "image/jpeg"
                })
            );

            req.s3Files[fieldname] = {
                url: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`,
                key
            };
        }

        next();
    } catch (err) {
        console.error("Upload/convert error:", err);
        return res.status(500).json({
            success: false,
            message: "Image upload failed"
        });
    }
};

// Export (only images)
export const uploadMedia = upload.fields([
    { name: "category_image", maxCount: 1 }
]);

export { upload, processAndUploadMedia };