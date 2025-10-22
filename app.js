function mergeStats(data1, data2) {
  // Helper: find first "count" stat or create a default one
  const getCountStats = (stats) => {
    for (const s of stats) {
      if (s.type === "count") return s;
    }
    return { type: "count", filters: [], value: { min: 1 }, disabled: false };
  };

  const stats1 = data1.query?.stats ?? [];
  const stats2 = data2.query?.stats ?? [];

  const count1 = getCountStats(stats1);
  const count2 = getCountStats(stats2);

  // Combine all filters
  const combined = [...(count1.filters || []), ...(count2.filters || [])];

  // Deduplicate by id + min/max value
  const seen = new Set();
  const unique = [];

  for (const f of combined) {
    const v = f.value;
    const vmin = typeof v === "object" && !Array.isArray(v) ? v.min : null;
    const vmax = typeof v === "object" && !Array.isArray(v) ? v.max : null;
    const key = `${f.id}|${vmin ?? ""}|${vmax ?? ""}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(f);
    }
  }

  count1.filters = unique;
  return [count1];
}
// === Fetch JSON from server "proxy" into PoE trade link ===
// const SERVER_URL = "http://localhost:3000/trade?link=";
const SERVER_URL = "https://tradeengine-production.up.railway.app" + "/trade?link=";


async function fetchJsonFromLink(link) {
  if (link.startsWith("http")) {
    // Encode the link to pass as query param
    const url = SERVER_URL + encodeURIComponent(link);

    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Server HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } else {
    // If it's a JSON string already
    return typeof link === "string" ? JSON.parse(link) : link;
  }
}

async function MergeJsons () {
    data1 = document.getElementById("json1").value; 
    data2 = document.getElementById("json2").value;

    // Extract and decode ?q= JSON if present
    let json1;
    const match1 = data1.match(/\?q=([^#]+)/);
    if (match1) {
        json1 = JSON.parse(decodeURIComponent(match1[1]));
    } else {
        json1 = await fetchJsonFromLink(data1);
    }
    let json2;
    const match2 = data2.match(/\?q=([^#]+)/);
    if (match2) {
        json2 = JSON.parse(decodeURIComponent(match2[1]));
    } else {
        json2 = await fetchJsonFromLink(data2);
    }

    const combined = json1;
    combined.query.stats = mergeStats(json1, json2);


    








    // // Encode back to trade URL
    const league = "League";
    const encoded = encodeURIComponent(JSON.stringify(combined));
    const finalUrl = `https://www.pathofexile.com/trade/search/${league}/?q=${encoded}`;


    document.getElementById("json3").value = finalUrl; 
}