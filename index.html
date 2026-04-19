const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    try {
      const { image } = req.body;
      const result = await cloudinary.uploader.upload(image, {
        folder: 'profile',
        transformation: [{ width: 600, crop: 'limit' }]
      });
      return res.json({ url: result.secure_url });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
};
