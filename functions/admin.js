// functions/admin.js
// 用法：部署到 Cloudflare Pages 的 Functions （绑定 D1 -> DB，绑定字符串 ADMIN_TOKEN）
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const pathname = url.pathname; // e.g. /api/admin/list 或 /api/admin/delete/slug

  // 鉴权：优先从 header Authorization: Bearer <token>，其次 query ?token=
  const authHeader = request.headers.get('Authorization');
  let token = null;
  if (authHeader && authHeader.startsWith('Bearer ')) token = authHeader.slice(7).trim();
  if (!token) token = url.searchParams.get('token');
  // 从环境变量取管理令牌
  const ADMIN_TOKEN = env.ADMIN_TOKEN || 'CHANGE_ME';
  if (!token || token !== ADMIN_TOKEN) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
  }

  const DB = env.DB; // D1 绑定，变量名为 DB
  try {
    // 列表
    if (pathname.endsWith('/api/admin/list')) {
      const r = await DB.prepare('SELECT id, slug, url, status, create_time FROM links ORDER BY id DESC').all();
      return new Response(JSON.stringify(r.results || []), { headers: { 'Content-Type': 'application/json' } });
    }

    // 删除 (DELETE method 或 GET with token)
    if (pathname.startsWith('/api/admin/delete/')) {
      // slug 可能需要 decode
      const parts = pathname.split('/');
      const slug = decodeURIComponent(parts[parts.length - 1]);

      // 删除 links
      await DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run();
      // 删除 logs
      await DB.prepare('DELETE FROM logs WHERE slug = ?').bind(slug).run();

      return new Response(JSON.stringify({ success: true, slug }), { headers: { 'Content-Type': 'application/json' });
    }

    return new Response(JSON.stringify({ error: 'not_found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
}
