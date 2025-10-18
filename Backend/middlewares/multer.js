// middlewares/upload.js
import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * Creates and returns a multer uploader that saves files
 * in /uploads/<subfolder> (like /uploads/profilePicture or /uploads/eventsPhoto)
 */
function createUploader(subfolder) {
  // absolute path to subfolder, e.g. /project/uploads/profilePicture
  const uploadDir = path.join(process.cwd(), 'uploads', subfolder);

  // create directory if not exist
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

  // define where and how files will be stored
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname);
      const base = path
        .basename(file.originalname, ext)
        .replace(/\s+/g, '-')
        .toLowerCase();
      cb(null, `${base}-${Date.now()}${ext}`);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB per file
  });
}

// ✅ Create two uploaders
export const uploadProfile = createUploader('profilePicture');
export const uploadEvent = createUploader('eventsPhoto');
