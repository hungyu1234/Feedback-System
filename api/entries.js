const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const id = req.query.id;

  if (req.method === 'POST') {
    const { projectId, title, detail, date } = req.body;
    const page = await notion.pages.create({
      parent: { database_id: DB_ID },
      properties: {
        '제목': { title: [{ text: { content: title } }] },
        '날짜': { date: { start: date } },
        '프로젝트': { select: { name: projectId } },
      },
      children: detail ? [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: detail.slice(0, 2000) } }]
        }
      }] : []
    });
    return res.json({ id: page.id });
  }

  if (req.method === 'PATCH') {
    const { title, date, detail } = req.body;
    const props = {};
    if (title) props['제목'] = { title: [{ text: { content: title } }] };
    if (date) props['날짜'] = { date: { start: date } };

    if (Object.keys(props).length > 0) {
      await notion.pages.update({ page_id: id, properties: props });
    }

    if (detail !== undefined) {
      const blocks = await notion.blocks.children.list({ block_id: id });
      await Promise.all(blocks.results.map(b => notion.blocks.delete({ block_id: b.id })));

      const chunks = [];
      let text = detail.replace(/<[^>]+>/g, '');
      while (text.length > 0) {
        chunks.push(text.slice(0, 2000));
        text = text.slice(2000);
      }

      if (chunks.length > 0) {
        await notion.blocks.children.append({
          block_id: id,
          children: chunks.map(chunk => ({
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: chunk } }]
            }
          }))
        });
      }
    }

    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await notion.pages.update({ page_id: id, archived: true });
    return res.json({ ok: true });
  }

  res.status(405).end();
};
