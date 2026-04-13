const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const tab = req.query.tab || 'memo';
const queryOptions = {
  database_id: DB_ID,
  sorts: [{ property: '날짜', direction: 'descending' }],
};
if (tab !== 'memo') {
  queryOptions.filter = { property: '탭', select: { equals: tab } };
}
const response = await notion.databases.query(queryOptions);

    const projectMap = {};

    for (const page of response.results) {
      const proj = page.properties['프로젝트']?.select?.name || '기타';
      const title = page.properties['제목']?.title?.[0]?.plain_text || '';
      const date = page.properties['날짜']?.date?.start || '';
      const detail = page.properties['내용']?.rich_text?.[0]?.plain_text || '';

      if (!projectMap[proj]) {
        projectMap[proj] = { id: proj, name: proj, entries: [] };
      }
      projectMap[proj].entries.push({ id: page.id, title, date, detail });
    }

    const projects = Object.values(projectMap);
    return res.json({ projects });
  }

  if (req.method === 'POST') {
    const { name, oldName, tab = 'memo' } = req.body;

    try {
      const db = await notion.databases.retrieve({ database_id: DB_ID });
      const existing = db.properties['프로젝트'].select.options.map(o => o.name);

      if (!existing.includes(name)) {
        await notion.databases.update({
          database_id: DB_ID,
          properties: {
            '프로젝트': {
              select: {
                options: [
                  ...db.properties['프로젝트'].select.options.map(o => ({ name: o.name, color: o.color })),
                  { name }
                ]
              }
            }
          }
        });
      }

      // oldName 있으면 기존 피드백 전부 새 이름으로 이전
      if (oldName && oldName !== name) {
        const pages = await notion.databases.query({
          database_id: DB_ID,
          filter: { property: '프로젝트', select: { equals: oldName } }
        });
        await Promise.all(pages.results.map(page =>
          notion.pages.update({
            page_id: page.id,
            properties: {
              '프로젝트': { select: { name } }
            }
          })
        ));
      }

      return res.json({ id: name });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'DELETE') {
    const { name } = req.body;
    const response = await notion.databases.query({
      database_id: DB_ID,
      filter: { property: '프로젝트', select: { equals: name } }
    });
    await Promise.all(
      response.results.map(page =>
        notion.pages.update({ page_id: page.id, archived: true })
      )
    );
    return res.json({ ok: true });
  }

  res.status(405).end();
};
