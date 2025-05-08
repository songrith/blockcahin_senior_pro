// src/pages/api/upload.ts
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import fs from "fs";
import formidable, { IncomingForm, File as FormidableFile, Files } from "formidable";

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const uploadDir = path.join(process.cwd(), "public/uploads");

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const form = new IncomingForm({
    uploadDir,
    keepExtensions: true,
    maxFileSize: 10 * 1024 * 1024, // Optional: 10MB limit
  });

  form.parse(req, (err, fields: formidable.Fields, files: formidable.Files) => {
    if (err) {
      console.error("Upload error:", err);
      return res.status(500).json({ error: "Upload failed" });
    }

    const uploadedFile = files.file as FormidableFile | FormidableFile[];

    if (!uploadedFile) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const file = Array.isArray(uploadedFile) ? uploadedFile[0] : uploadedFile;
    const fileName = path.basename(file.filepath);
    const fileUrl = `/uploads/${fileName}`;

    res.status(200).json({ url: fileUrl });
  });
}