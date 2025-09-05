import mongoose from "mongoose";
import { ThrowError } from "../utils/ErrorUtils.js";
import ClassCategoryModel from "../models/classCategoryModel.js";
import { sendBadRequestResponse, sendCreatedResponse, sendErrorResponse, sendSuccessResponse } from "../utils/ResponseUtils.js";
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
// import ClassCategory, sendBadRequestResponse, sendCreatedResponse, ThrowError from where you already do

// --- S3 client (reuse your env) ---
const s3 = new S3Client({
    region: process.env.S3_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY.trim(),
        secretAccessKey: process.env.S3_SECRET_KEY.trim(),
    },
});

// Build a public URL for the stored key
const publicUrlForKey = (key) => {
    const cdn = process.env.CDN_BASE_URL?.replace(/\/$/, '');
    if (cdn) return `${cdn}/${key}`; // CloudFront or custom domain
    const bucket = process.env.S3_BUCKET_NAME;
    const region = process.env.S3_REGION || 'us-east-1';
    return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURI(key)}`; // requires bucket/object to be publicly readable
};

// Delete uploaded object if we need to roll back after a validation error
const cleanupUploadedIfAny = async (file) => {
    if (file?.key) {
        try {
            await s3.send(
                new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: file.key,
                })
            );
        } catch (e) {
            console.error('S3 cleanup failed:', e.message);
        }
    }
};

export const createCategory = async (req, res) => {
    // Support either single upload or fields-based upload
    const pickUploaded = () => {
        if (req.file) return req.file;
        if (req.files?.category_image?.[0]) return req.files.category_image[0];
        if (req.files?.image?.[0]) return req.files.image[0]; // fallback if you posted as "image"
        return null;
    };

    const uploaded = pickUploaded();

    try {
        const { category_name } = req.body;

        if (!category_name) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, 'category_name are required');
        }

        const existingCategory = await ClassCategory.findOne({ category_name });
        if (existingCategory) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, 'This classCategory is already assigned to this class');
        }

        let classCategory_image = null;
        let classCategory_image_key = null;
        if (uploaded?.key) {
            classCategory_image = publicUrlForKey(uploaded.key);
            classCategory_image_key = uploaded.key;
        }

        const newClassCategory = await ClassCategory.create({
            classCategory_title,
            classCategory_image,
            classCategory_image_key
        });

        return sendCreatedResponse(res, 'ClassCategory added successfully', newClassCategory);
    } catch (error) {
        await cleanupUploadedIfAny(uploaded);
        return ThrowError(res, 500, error.message);
    }
};

// Get all ClassCategory
export const getAllClassCategory = async (req, res) => {
    try {
        const classCategory = await ClassCategory.find()

        if (!classCategory || classCategory.length === 0) {
            return sendBadRequestResponse(res, "No classCategory found", []);
        }

        return sendSuccessResponse(res, "ClassCategory fetched successfully", classCategory);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Get ClassCategory by ID
export const getClassCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ClassCategory ID");
        }

        const classCategory = await ClassCategory.findById(id)
        if (!classCategory) {
            return sendErrorResponse(res, 404, "ClassCategory not found");
        }

        return sendSuccessResponse(res, "ClassCategory retrieved successfully", classCategory);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};

// Update ClassCategory (Admin only)
export const updateClassCategory = async (req, res) => {
    try {
        const { id } = req.params;
        const { classCategory_title } = req.body;

        const pickUploaded = () => {
            if (req.file) return req.file;
            if (req.files?.classCategory_image?.[0]) return req.files.classCategory_image[0];
            return null;
        };
        const uploaded = pickUploaded();

        // Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            await cleanupUploadedIfAny(uploaded);
            return sendBadRequestResponse(res, "Invalid ClassCategory ID");
        }

        // Fetch existing document
        const existingClassCategory = await ClassCategory.findById(id);
        if (!existingClassCategory) {
            await cleanupUploadedIfAny(uploaded);
            return sendErrorResponse(res, 404, "ClassCategory not found");
        }

        // Handle Image Update via S3
        if (uploaded?.key) {
            // delete previous object if present
            const oldKey = existingClassCategory.classCategory_image_key;
            if (oldKey) {
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: process.env.S3_BUCKET_NAME,
                        Key: oldKey,
                    }));
                } catch (e) {
                    // log only; do not fail the request
                    console.error('Failed to delete old S3 object:', e.message);
                }
            }

            existingClassCategory.classCategory_image = publicUrlForKey(uploaded.key);
            existingClassCategory.classCategory_image_key = uploaded.key;
        }

        if (classCategory_title) {
            existingClassCategory.classCategory_title = classCategory_title;
        }

        await existingClassCategory.save();

        return sendSuccessResponse(res, "ClassCategory updated successfully", existingClassCategory);
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};


// Delete ClassCategory (Admin only)
export const deleteClassCategory = async (req, res) => {
    try {
        const { id } = req.params;

        // ✅ Validate ID
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return sendBadRequestResponse(res, "Invalid ClassCategory ID");
        }

        // ✅ Find and delete category
        const classCategory = await ClassCategory.findByIdAndDelete(id);
        if (!classCategory) {
            return sendErrorResponse(res, 404, "ClassCategory not found");
        }

        // ✅ Delete image from S3 if exists
        const keyFromDoc = classCategory.classCategory_image_key;
        let keyToDelete = keyFromDoc;
        if (!keyToDelete && classCategory.classCategory_image) {
            try {
                const url = new URL(classCategory.classCategory_image);
                keyToDelete = url.pathname.replace(/^\//, '');
            } catch {
                // ignore URL parse errors
            }
        }
        if (keyToDelete) {
            try {
                await s3.send(new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: keyToDelete,
                }));
            } catch (e) {
                console.error('Failed to delete S3 object:', e.message);
            }
        }

        return sendSuccessResponse(res, "ClassCategory deleted successfully");
    } catch (error) {
        return ThrowError(res, 500, error.message);
    }
};