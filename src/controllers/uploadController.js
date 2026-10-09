const MAX_IMAGE_BYTES = 350 * 1024;
const IMAGE_TYPES = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  "image/webp": (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP",
};

async function uploadImage(req, res) {
  const { data, contentType } = req.body || {};
  const isValidImage = IMAGE_TYPES[contentType];
  if (!isValidImage || typeof data !== "string" || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    return res.status(400).json({ success: false, error: "Выберите фото в формате JPG, PNG или WebP" });
  }

  const image = Buffer.from(data, "base64");
  if (!image.length || image.length > MAX_IMAGE_BYTES || !isValidImage(image)) {
    return res.status(400).json({ success: false, error: "Фото повреждено или превышает допустимые 350 КБ после сжатия" });
  }

  res.status(201).json({ success: true, url: `data:${contentType};base64,${image.toString("base64")}` });
}

module.exports = { uploadGuidePhoto: uploadImage, uploadTourPhoto: uploadImage };
