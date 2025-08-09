export async function onRequest(context) {
  const { DB, ADMIN_TOKEN } = context.env; // 从环境变量获取管理密码
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // 简单鉴权
  const token = url.searchParams.get("token");
  if (token !== ADMIN_TOKEN) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // 列出所有短链
    if (pathname.endsWith("/list")) {
      const { results } = await DB.prepare("SELECT * FROM links").all();
      return new Response(JSON.stringify(results), {
        headers: { "Content-Type": "application/json" }
      });
    }

    // 删除指定短链
    if (pathname.startsWith("/delete/")) {
      const slug = pathname.split("/").pop();
      await DB.prepare("DELETE FROM links WHERE slug = ?").bind(slug).run();
      await DB.prepare("DELETE FROM logs WHERE slug = ?").bind(slug).run();
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
      });
    }

    return new Response("Not found", { status: 404 });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
}
