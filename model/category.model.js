import mongoose from "mongoose"

const categorySchema = mongoose.Schema({
    category_Name: {
        type: String,
        default: null
    },
    category_image: {
        type: String,
        default: null
    },
    classCategory_image_key: {
        type: String,
        default: null
    }
}, { timestamps: true })

export default mongoose.model("Category", categorySchema)