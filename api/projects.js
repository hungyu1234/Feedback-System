onst { Client } = require('@notionhq/client');
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
      page_size: 100,
    };

    if (tab === 'memo') {
      queryOptions.filter = {
        or: [
          { property: '탭', select: { equals: 'memo' } },
          { property: '탭', select: { is_empty: true } }
        ]
      };
    } else {
      queryOptions.filter = { property: '탭', select: { equals: tab } };
    }

    let response = await notion.databases.query(queryOptions);
    let allResults = [...response.results];
    while (response.has_more) {
      response = await notion.databases.query({
        ...queryOptions,
        start_cursor: response.next_cursor
      });
      allResults = [...allResults, ...response.results];
    }

    allResults.sort((a, b) => {
      const da = a.properties['날짜']?.date?.start || '';
      const db2 = b.properties['날짜']?.date?.start || '';
      return db2.localeCompare(da);
    });

    const projectMap = {};

    for (const page of allResults) {
      const proj = page.properties['프로젝트']?.select?.name || '기타';
      const pageTab = page.properties['탭']?.select?.name || '';
      const title = page.properties['제목']?.title?.[0]?.plain_text || '';
      const date = page.properties['날짜']?.date?.start || '';
      const detail = page.properties['내용']?.rich_text?.[0]?.plain_text || '';

      // JS 레벨 이중 필터: 요청 탭과 불일치하면 스킵
      if (tab === 'memo') {
        if (pageTab && pageTab !== 'memo') continue;
      } else {
        if (pageTab !== tab) continue;
      }

      const mapKey = tab + '::' + proj;
      if (!projectMap[mapKey]) {
        projectMap[mapKey] = { id: proj, name: proj, entries: [] };
      }
      projectMap[mapKey].entries.push({ id: page.id, title, date, detail });
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
