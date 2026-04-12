const { Client } = require('@notionhq/client');
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DB_ID = 'a39308826cb14d37b18b380e76ff7bdb';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    try {
      const response = await notion.databases.query({ database_id: DB_ID });
      const data = {};
      for (const page of response.results) {
        const key = page.properties['key']?.title?.[0]?.plain_text || '';
        const value = page.properties['value']?.rich_text?.[0]?.plain_text || '';
        data[key] = value;
      }
      return res.json(data);
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const updates = req.body;
      const response = await notion.databases.query({ database_id: DB_ID });
      await Promise.all(response.results.map(page => {
        const key = page.properties['key']?.title?.[0]?.plain_text || '';
        if (updates[key] !== undefined) {
          return notion.pages.update({
            page_id: page.id,
            properties: {
              'value': { rich_text: [{ text: { content: (updates[key]||'').slice(0,2000) } }] }
            }
          });
        }
      }));
      return res.json({ ok: true });
    } catch(e) {
      return res.status(500).json({ error: e.message });
    }
  }

  res.status(405).end();
};
