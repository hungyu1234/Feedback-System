const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VER = '2026-03-11';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  try {
    const { pageId, file, filename, contentType } = req.body;
    if (!pageId || !file || !filename) {
      return res.status(400).json({ error: 'pageId, file, filename 필수' });
    }

    // Step 1: Create file upload
    const createRes = await fetch('https://api.notion.com/v1/file_uploads', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({ filename, content_type: contentType || 'application/octet-stream' }),
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      return res.status(500).json({ error: 'Create file upload failed', detail: err });
    }
    const fileUpload = await createRes.json();

    // Step 2: Send file content
    const buffer = Buffer.from(file, 'base64');
    const blob = new Blob([buffer], { type: contentType || 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, filename);

    const sendRes = await fetch(fileUpload.upload_url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': NOTION_VER,
      },
      body: formData,
    });
    if (!sendRes.ok) {
      const err = await sendRes.text();
      return res.status(500).json({ error: 'Send file failed', detail: err });
    }

    // Step 3: Attach to page as block
    const isImage = (contentType || '').startsWith('image/');
    const blockType = isImage ? 'image' : 'file';
    const blockPayload = {
      type: blockType,
      [blockType]: {
        type: 'file_upload',
        file_upload: { id: fileUpload.id },
      },
    };
    if (blockType === 'file') blockPayload.file.name = filename;

    const attachRes = await fetch(`https://api.notion.com/v1/blocks/${pageId}/children`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({ children: [blockPayload] }),
    });
    if (!attachRes.ok) {
      const err = await attachRes.text();
      return res.status(500).json({ error: 'Attach block failed', detail: err });
    }

    const attachData = await attachRes.json();
    return res.json({
      ok: true,
      fileUploadId: fileUpload.id,
      filename,
      blockId: attachData.results?.[0]?.id,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
