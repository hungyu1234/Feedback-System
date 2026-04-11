const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = process.env.NOTION_DB_ID;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const response = await notion.databases.query({
      database_id: DB_ID,
      sorts: [{ property: '날짜', direction: 'descending' }],
    });

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
    const { name } = req.body;
    // 노션 DB의 프로젝트 Select 옵션에 새 값 추가
    const db = await notion.databases.retrieve({ database_id: DB_ID });
    const existing = db.properties['프로젝트'].select.options.map(o => o.name);
    if (!existing.includes(name)) {
      await notion.databases.update({
        database_id: DB_ID,
        properties: {
          '프로젝트': {
            select: {
              options: [
                ...db.properties['프로젝트'].select.options,
                { name }
              ]
            }
          }
        }
      });
    }
    return res.json({ id: name });
  }

  if (req.method === 'DELETE') {
    return res.json({ ok: true });
  }

  res.status(405).end();
};
