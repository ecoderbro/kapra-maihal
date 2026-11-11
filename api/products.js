// ===== Fast product list for ZARÉEN =====
// Vercel keeps a ready copy of your product list close to the visitor, so pages do not wait for Google every time.
// The copy refreshes itself in the background every 30 seconds (and may show a copy up to ~10 minutes old
// only if nobody visited for a while). Orders still go straight to Google, and prices are re-checked there.
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyeRqNoWhEBamKNcfJpswHeILkvJwsfU7-lMqEKAxLM3UKktpG2yUEi6KsqRQPEWblb/exec";

module.exports = async (req, res) => {
  try {
    const r = await fetch(APPS_SCRIPT_URL + "?action=products", {
      redirect: "follow",
      signal: AbortSignal.timeout(25000)
    });
    const text = await r.text();
    const data = JSON.parse(text);               // only keep a real, working answer
    if (!data || data.ok !== true || !Array.isArray(data.products)) throw new Error("bad answer");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=30, stale-while-revalidate=600");
    res.status(200).send(text);
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");  // never keep an error
    res.status(502).json({ ok: false, error: "Could not load products" });
  }
};
