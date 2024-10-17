import type { NextApiRequest, NextApiResponse } from 'next';
import AWS from 'aws-sdk';
import formidable, { Fields, Files, File } from 'formidable';
import fs from 'fs';

// Configure Cloudflare R2 credentials
console.log('Cloudflare Account ID:', process.env.CLOUDFLARE_ACCOUNT_ID);
console.log('Access Key ID:', process.env.CLOUDFLARE_ACCESS_KEY_ID);
console.log('Secret Access Key:', process.env.CLOUDFLARE_SECRET_ACCESS_KEY);

const s3 = new AWS.S3({
  endpoint: new AWS.Endpoint(`https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`),
  accessKeyId: process.env.CLOUDFLARE_ACCESS_KEY_ID!,
  secretAccessKey: process.env.CLOUDFLARE_SECRET_ACCESS_KEY!,
  s3ForcePathStyle: true, // Wichtig für die Kompatibilität mit R2
  signatureVersion: 'v4',
});

export const config = {
  api: {
    bodyParser: false,
  },
};

const uploadToR2 = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const form = formidable({
    keepExtensions: true, // Damit die Datei ihre Erweiterung behält
    multiples: false, // Keine Mehrfach-Uploads
  });

  form.parse(req, async (err: Error | null, fields: Fields, files: Files) => {
    if (err) {
      console.error('Form parsing error:', err);
      return res.status(500).json({ message: 'Error parsing the form data', error: err });
    }

    const file = Array.isArray(files.file) ? files.file[0] : (files.file as File | undefined);
    if (file === undefined) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      console.log('File information:', file);

      // Read the uploaded file
      const fileStream = fs.createReadStream(file.filepath);

      // Upload the file to R2
      const key = `${Date.now()}-${file.originalFilename}`;
      const params = {
        Bucket: 'novembercampaign',
        Key: key,
        Body: fileStream,
        ContentType: file.mimetype || undefined,
      };

      const uploadResponse = await s3.upload(params).promise();
      console.log('Upload response:', uploadResponse);

      // Construct the R2 URL
      const url = `https://pub-cd9e0be0171f4d439a2b77cc79f791a0.r2.dev/${key}`;

      res.status(200).json({ message: 'File uploaded successfully', url });
    } catch (error) {
      console.error('Error uploading to R2:', error);
      res.status(500).json({ message: 'Error uploading to R2', errorDetails: error });
    }
  });
};

export default uploadToR2;