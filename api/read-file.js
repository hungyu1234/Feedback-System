const NOTION_TOKEN = process.env.NOTION_TOKEN;
const NOTION_VER = '2026-03-11';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const pageId = req.query.pageId;
  if (!pageId) return res.status(400).json({ error: 'pageId required' });

  try {
    // 1. 페이지의 블록 목록 가져오기
    const blocksRes = await fetch(
      `https://api.notion.com/v1/blocks/${pageId}/children?page_size=100`,
      {
        headers: {
          'Authorization': `Bearer ${NOTION_TOKEN}`,
          'Notion-Version': NOTION_VER,
        },
      }
    );
    if (!blocksRes.ok) return res.status(500).json({ error: await blocksRes.text() });
    const blocks = await blocksRes.json();

    const fileBlocks = (blocks.results || []).filter(b =>
      ['file', 'image', 'pdf'].includes(b.type)
    );

    if (!fileBlocks.length) return res.json({ files: [], text: '' });

    const results = [];
    for (const block of fileBlocks) {
      const td = block[block.type];
      let url = '';
      if (td.type === 'file') url = td.file?.url || '';
      else if (td.type === 'file_upload') url = td.file_upload?.url || '';
      else if (td.type === 'external') url = td.external?.url || '';

      if (!url) continue;

      const name = td.name || '';
      let text = '';

      // 텍스트 파일이면 직접 fetch
      if (name.match(/\.(txt|csv|md|json|tsv)$/i)) {
        try {
          const r = await fetch(url);
          text = await r.text();
        } catch (e) { text = '[읽기 실패]'; }
      }

      results.push({
        blockId: block.id,
        type: block.type,
        name,
        url,
        text,
      });
    }

    return res.json({ files: results });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};
