const buildUploadResponse = (imageData) => {
  const mimeMatch = imageData.match(/^data:([^;]+);base64,/)
  const mimeType = mimeMatch ? mimeMatch[1] : 'application/octet-stream'
  const base64Payload = imageData.split(',')[1] || ''
  const sizeInBytes = Buffer.byteLength(base64Payload, 'base64')

  return {
    path: imageData,
    sizeInMB: (sizeInBytes / (1024 * 1024)).toFixed(2),
    format: mimeType,
  }
}

const uploadRcImage = async (req, res) => {
  try {
    const { imageData } = req.body

    if (!imageData || typeof imageData !== 'string' || !imageData.startsWith('data:')) {
      return res.status(400).json({ success: false, message: 'Valid imageData is required' })
    }

    return res.json({
      success: true,
      data: buildUploadResponse(imageData),
    })
  } catch (error) {
    console.error('Error uploading RC image:', error)
    return res.status(500).json({ success: false, message: 'Failed to upload RC image' })
  }
}

module.exports = {
  uploadRcImage,
}
