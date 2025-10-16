import { Request } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req: Request, file: Express.Multer.File) => {

    let folder = "uploads_from_Podcast";

    if (file.mimetype.startsWith("image/")) {
      folder = "podcast_images";
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "podcast_audio";
    } else if (
      file.mimetype.includes("pdf") ||
      file.mimetype.includes("doc")
    ) {
      folder = "podcast_docs";
    }

    return {
      folder,
      resource_type: "auto", 
      allowed_formats: [
        "jpg","jpeg","png","webp",
        "pdf","doc","docx",
        "mp3","wav","m4a","aac",
        "webm"
      ],      
    };
  },
});

export const upload = multer({ storage });

export { cloudinary };
