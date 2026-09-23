// Corre sola todos los días (ver netlify.toml). Revisa el campo "Disponible hasta"
// de cada producto y BORRA de Airtable los que ya vencieron.
exports.handler = async function () {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID || "appsWboxkqvmRFwvA";
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID || "tblgheDuApXXREo33";

  if (!AIRTABLE_TOKEN) {
    return { statusCode: 500, body: JSON.stringify({ error: "Falta AIRTABLE_TOKEN" }) };
  }

  // Fecha de hoy en Colombia (UTC-5), como texto YYYY-MM-DD para comparar con el campo fecha.
  const ahoraCol = new Date(Date.now() - 5 * 60 * 60 * 1000);
  const hoyStr = ahoraCol.toISOString().slice(0, 10);

  try {
    let all = [];
    let offset = null;
    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
      url.searchParams.set("pageSize", "100");
      url.searchParams.set("fields[]", "Disponible hasta");
      if (offset) url.searchParams.set("offset", offset);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });
      const data = await res.json();
      if (!res.ok) return { statusCode: res.status, body: JSON.stringify({ error: data }) };

      all = all.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    const vencidos = all
      .filter((r) => {
        const f = r.fields["Disponible hasta"];
        return f && f < hoyStr; // ya pasó la fecha
      })
      .map((r) => r.id);

    let borrados = 0;
    // Airtable borra máximo 10 registros por request.
    for (let i = 0; i < vencidos.length; i += 10) {
      const lote = vencidos.slice(i, i + 10);
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
      lote.forEach((id) => url.searchParams.append("records[]", id));

      const res = await fetch(url.toString(), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });
      if (res.ok) borrados += lote.length;
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ revisados: all.length, borrados, fecha: hoyStr }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
