const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VER = '2026-03-11';
 
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
 
  const pageId = req.query.pageId;
  const blockId = req.query.blockId;
 
  if (req.method === 'DELETE' && blockId) {
    try {
      const r = await fetch(`https://api.notion.com/v1/blocks/${blockId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_VER,
        },
      });
      if (!r.ok) return res.status(500).json({ error: await r.text() });
      return res.json({ ok: true });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
 
  if (req.method === 'GET' && pageId) {
    try {
      const r = await fetch(
        `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
        {
          headers: {
            'Authorization': `Bearer ${NOTION_TOKEN}`,
            'Notion-Version': NOTION_VER,
          },
        }
      );
      if (!r.ok) return res.status(500).json({ error: await r.text() });
      const data = await r.json();
 
      const fileTypes = ['file', 'image', 'pdf', 'video', 'audio'];
      const files = (data.results || [])
        .filter(b => fileTypes.includes(b.type))
        .map(b => {
          const td = b[b.type];
          let url = '', name = '';
          if (td.type === 'file') {
            url = td.file?.url || '';
            name = td.name || '';
          } else if (td.type === 'file_upload') {
            url = td.file_upload?.url || '';
            name = td.name || '';
          } else if (td.type === 'external') {
            url = td.external?.url || '';
            name = td.caption?.[0]?.plain_text || '';
          }
          if (!name && url) name = decodeURIComponent(url.split('/').pop().split('?')[0]);
          return { blockId: b.id, type: b.type, url, name };
        });
 
      return res.json({ files });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }
 
  res.status(400).json({ error: 'pageId required' });
};
