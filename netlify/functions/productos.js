// Esta función corre en el servidor de Netlify, NUNCA en el navegador del cliente.
// Por eso el token de Airtable (AIRTABLE_TOKEN) queda oculto y seguro.
exports.handler = async function () {
  const AIRTABLE_TOKEN = process.env.AIRTABLE_TOKEN;
  const BASE_ID = process.env.AIRTABLE_BASE_ID || "appsWboxkqvmRFwvA";
  const TABLE_ID = process.env.AIRTABLE_TABLE_ID || "tblgheDuApXXREo33";

  if (!AIRTABLE_TOKEN) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Falta configurar AIRTABLE_TOKEN en Netlify (Site configuration > Environment variables)." }),
    };
  }

  try {
    let all = [];
    let offset = null;

    do {
      const url = new URL(`https://api.airtable.com/v0/${BASE_ID}/${TABLE_ID}`);
      url.searchParams.set("pageSize", "100");
      if (offset) url.searchParams.set("offset", offset);

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${AIRTABLE_TOKEN}` },
      });
      const data = await res.json();

      if (!res.ok) {
        return { statusCode: res.status, body: JSON.stringify({ error: data }) };
      }

      all = all.concat(data.records || []);
      offset = data.offset || null;
    } while (offset);

    const productos = all.map((r) => ({
      id: r.id,
      nombre: r.fields["Nombre"] || "",
      categoria: r.fields["Categoria"] || "",
      genero: r.fields["Genero"] || "Unisex",
      tipo: r.fields["Tipo"] || "",
      talla: r.fields["Talla"] || "",
      precio: r.fields["Precio"] || 0,
      disponibilidad: !!r.fields["Disponibilidad"],
      marca: r.fields["Marca"] || "",
      destacado: !!r.fields["Destacado"],
      limitado: !!r.fields["Limitado"],
      foto: (r.fields["Foto"] && r.fields["Foto"][0] && r.fields["Foto"][0].url) || "",
    }));

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify({ productos }),
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
