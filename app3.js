
import fetch from "node-fetch";

// === Merge logic ===
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

// === Fetch JSON from PoE trade link ===
async function fetchJsonFromLink(link) {
  if (link.startsWith("http")) {
    // Convert normal trade link to API link
    const apiLink = link.replace("/trade/search/", "/api/trade/search/");

    const res = await fetch(apiLink, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36",
      },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } else {
    // If it's a JSON string
    return typeof link === "string" ? JSON.parse(link) : link;
  }
}

// === Main function ===
async function main() {
  // Example PoE trade links
  const tradeLink1 =
    "https://www.pathofexile.com/trade/search/Mercenaries/?q=%7B%22query%22%3A%7B%22status%22%3A%7B%22option%22%3A%22online%22%7D%2C%22stats%22%3A%5B%7B%22type%22%3A%22count%22%2C%22filters%22%3A%5B%7B%22value%22%3A%7B%22min%22%3A82560%2C%22max%22%3A82560%7D%2C%22id%22%3A%22explicit%2Epseudo%5Ftimeless%5Fjewel%5Fcadiro%22%7D%5D%7D%5D%7D%7D";
  const tradeLink2 =
    "https://www.pathofexile.com/trade/search/Mercenaries/glYwddQdFQ";

  // Extract and decode ?q= JSON if present
  let json1;
  const match = tradeLink1.match(/\?q=([^#]+)/);
  if (match) {
    const decoded = decodeURIComponent(match[1]);
    json1 = JSON.parse(decoded);
  } else {
    json1 = await fetchJsonFromLink(tradeLink1);
  }

  const json2 = await fetchJsonFromLink(tradeLink2);

  // Merge
  const combined = json1;
  combined.query.stats = mergeStats(json1, json2);

  // Encode back to trade URL
  const league = "Mercenaries";
  const encoded = encodeURIComponent(JSON.stringify(combined));
  const finalUrl = `https://www.pathofexile.com/trade/search/${league}/?q=${encoded}`;

  console.log("✅ Combined Trade URL:");
  console.log(finalUrl);
  console.log("\n🔹 Combined JSON:");
  console.log(JSON.stringify(combined, null, 2));
}

// Run
main().catch((err) => console.error("❌ Error:", err.message));
