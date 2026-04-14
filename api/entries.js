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
    const { projectId, title, detail, date} = req.body;
    const page = await notion.pages.create({
      parent: { database_id: DB_ID },
      properties: {
        '제목': { title: [{ text: { content: title } }] },
        '날짜': { date: { start: date } },
        '내용': { rich_text: [{ text: { content: (detail||'').slice(0,2000) } }] },
        '프로젝트': { select: { name: projectId } },
       
      },
    });
    return res.json({ id: page.id });
  }

  if (req.method === 'PATCH') {
    const { title, date, detail } = req.body;
    const props = {};
    if (title !== undefined) props['제목'] = { title: [{ text: { content: title } }] };
    if (date !== undefined) props['날짜'] = { date: { start: date } };
    if (detail !== undefined) props['내용'] = { rich_text: [{ text: { content: detail.slice(0,2000) } }] };
    await notion.pages.update({ page_id: id, properties: props });
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    await notion.pages.update({ page_id: id, archived: true });
    return res.json({ ok: true });
  }

  res.status(405).end();
};
