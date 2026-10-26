// ===== Shared by every page: helpers, products, cart, checkout =====
(function() {
    const C = window.SHOP,
        $ = (id) => document.getElementById(id);
    const K = (window.KM = { C, $ });

    K.money = (n) => C.CURRENCY + " " + Number(n).toLocaleString();
    K.price = (p) => (p.salePrice > 0 ? p.salePrice : p.price);

    // tiny helper to build elements safely (text is never treated as HTML)
    K.el = function el(tag, attrs, ...kids) {
        const e = document.createElement(tag);
        for (const k in attrs || {}) {
            if (attrs[k] == null || attrs[k] === false) continue; // skip empty attributes
            if (k === "class") e.className = attrs[k];
            else if (k.startsWith("on")) e.addEventListener(k.slice(2), attrs[k]);
            else e.setAttribute(k, attrs[k]);
        }
        kids.flat().forEach((c) => { if (c != null && c !== false) e.append(c); });
        return e;
    };
    const el = K.el,
        money = K.money,
        price = K.price;
    K.img = (src, alt) => el("img", {
        src: src || "",
        alt: alt || "",
        loading: "lazy",
        onerror: (ev) => { ev.target.style.visibility = "hidden"; }
    });

    // ---------- cart (saved in the browser) ----------
    const cart = (K.cart = []);
    try { cart.push(...JSON.parse(localStorage.getItem("km_cart") || "[]")); } catch (e) {}
    K.saveCart = () => { try { localStorage.setItem("km_cart", JSON.stringify(cart)); } catch (e) {} };
    K.renderBadge = () => { const b = $("cartCount"); if (b) b.textContent = cart.reduce((n, l) => n + l.qty, 0); };
    K.toast = (msg) => {
        const t = $("toast");
        if (!t) return;
        t.textContent = msg;
        t.classList.add("show");
        setTimeout(() => t.classList.remove("show"), 2200);
    };
    K.products = [];
    K.settings = { deliveryFee: 0 };
    K.find = (id) => K.products.find((p) => p.id === id);

    // photos to show for a product in a chosen colour (max 4). Colour names ignore capitals and extra spaces.
    // No colour chosen, or no photos added for that colour -> the product's normal photos.
    K.photosFor = (p, colour) => {
        const norm = (s) => String(s == null ? "" : s).trim().toLowerCase();
        const map = p.colourImages || {};
        const key = colour ? Object.keys(map).find((k) => norm(k) === norm(colour)) : null;
        const list = key ? (map[key] || []).filter(Boolean).slice(0, 4) : [];
        return list.length ? list : (p.images || []);
    };

    // ---------- products (read from Google Sheets) ----------
    // Fast path: products from the last visit show INSTANTLY, then fresh ones are fetched in the background.
    const CACHE_KEY = "km_products_v1";
    const readCache = () => {
        try { const c = JSON.parse(localStorage.getItem(CACHE_KEY)); if (c && Array.isArray(c.products)) return c; } catch (e) {}
        return null;
    };
    const writeCache = () => {
        try { localStorage.setItem(CACHE_KEY, JSON.stringify({ products: K.products, settings: K.settings })); } catch (e) {}
    };
    async function fetchFresh() {
        if (!C.APPS_SCRIPT_URL) throw new Error("Shop not connected yet. Add your Apps Script URL in js/config.js.");
        let out;
        try { out = await (await fetch(C.APPS_SCRIPT_URL + "?action=products")).json(); } catch (e) { throw new Error("Could not load products. Please refresh the page."); }
        if (!out.ok) throw new Error("Could not load products. Please refresh the page.");
        K.products = out.products;
        K.settings = out.settings || K.settings;
        for (let i = cart.length - 1; i >= 0; i--)
            if (!K.find(cart[i].id)) cart.splice(i, 1); // drop removed items
        K.saveCart();
        K.renderBadge();
        writeCache();
        return K.products;
    }
    let loading = null;
    K.onFresh = null; // a page can set this to redraw when newer data arrives
    K.loadProducts = function(force) {
        if (loading && !force) return loading;
        const cached = !force && readCache();
        if (cached) {
            K.products = cached.products;
            K.settings = cached.settings || K.settings;
            loading = Promise.resolve(K.products);
            const before = JSON.stringify(K.products);
            fetchFresh().then(() => { if (JSON.stringify(K.products) !== before && K.onFresh) K.onFresh(); }).catch(() => {});
            return loading;
        }
        loading = fetchFresh();
        loading.catch(() => { loading = null; });
        return loading;
    };

    // ---------- product card (links to product.html) ----------
    K.card = (p, i) => el("a", { class: "card", href: "product.html?id=" + encodeURIComponent(p.id), style: "--i:" + (i || 0) },
        el("div", { class: "ph" }, K.img(p.images[0], p.name), p.stock <= 0 ? el("span", { class: "tag" }, "Sold out") : null),
        el("div", { class: "info" }, el("h3", {}, p.name),
            el("div", { class: "price" }, money(price(p)), p.salePrice > 0 ? el("s", {}, money(p.price)) : null)));

    K.addToCart = (p, sel, maxQ) => {
        const ex = cart.find((l) => l.id === p.id && l.size === sel.size && l.colour === sel.colour);
        if (ex) ex.qty = Math.min(maxQ, ex.qty + sel.qty);
        else cart.push({ id: p.id, size: sel.size, colour: sel.colour, qty: sel.qty });
        K.saveCart();
        K.renderBadge();
        K.toast("Added to cart");
        const b = $("cartCount");
        if (b) {
            b.classList.remove("pop");
            void b.offsetWidth;
            b.classList.add("pop");
        }
    };

    // ---------- cart drawer + checkout ----------
    function showOverlay(show) {
        $("overlay").hidden = !show;
        document.body.style.overflow = show ? "hidden" : "";
    }

    function closeAll() {
        $("drawer").hidden = true;
        showOverlay(false);
    }
    $("overlay").addEventListener("click", closeAll);
    $("closeCart").addEventListener("click", closeAll);
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAll(); });

    $("openCart").addEventListener("click", async() => {
        $("drawer").hidden = false;
        showOverlay(true);
        if (!cart.length) { renderCart(); return; }
        $("drawerBody").replaceChildren(el("p", { class: "note" }, "Loading your cart…"));
        try {
            await K.loadProducts();
            renderCart();
        } catch (err) { $("drawerBody").replaceChildren(el("p", { class: "banner" }, err.message)); }
    });

    function totals() {
        const sub = cart.reduce((n, l) => n + price(K.find(l.id)) * l.qty, 0);
        const fee = cart.length ? K.settings.deliveryFee || 0 : 0;
        return { sub, fee, total: sub + fee };
    }

    function renderCart() {
        if (!cart.length) { $("drawerBody").replaceChildren(el("p", { class: "note" }, "Your cart is empty.")); return; }
        const t = totals();
        const lines = cart.map((l, i) => {
            const p = K.find(l.id);
            const change = (d) => {
                l.qty = Math.min(C.MAX_QTY, Math.max(1, l.qty + d));
                K.saveCart();
                K.renderBadge();
                renderCart();
            };
            return el("div", { class: "line" }, K.img(K.photosFor(p, l.colour)[0], p.name),
                el("div", {}, el("strong", {}, p.name), el("small", {}, [l.size, l.colour].filter(Boolean).join(" · ")),
                    el("div", { class: "qty" }, el("button", { onclick: () => change(-1) }, "−"), el("span", {}, String(l.qty)), el("button", { onclick: () => change(1) }, "+")),
                    el("button", {
                        class: "rm",
                        onclick: () => {
                            cart.splice(i, 1);
                            K.saveCart();
                            K.renderBadge();
                            renderCart();
                        }
                    }, "Remove")),
                el("div", { class: "price" }, money(price(p) * l.qty)));
        });
        const field = (id, label, type, extra) => el("div", { class: "f" }, el("label", { for: id }, label),
            type === "area" ? el("textarea", Object.assign({ id, rows: "2" }, extra || {})) : el("input", Object.assign({ id, type }, extra || {})),
            el("span", { class: "err", id: "e-" + id }));
        $("drawerBody").replaceChildren(...lines,
            el("div", { class: "sum" },
                el("div", {}, el("span", {}, "Subtotal"), el("span", {}, money(t.sub))),
                t.fee ? el("div", {}, el("span", {}, "Delivery"), el("span", {}, money(t.fee))) : null,
                el("div", { class: "tot" }, el("span", {}, "Total"), el("span", {}, money(t.total)))),
            el("p", { class: "note" }, "Payment: cash on delivery. Prices are re-checked when you place the order."),
            el("div", { id: "banner", class: "banner", hidden: "hidden", role: "alert" }),
            el("form", { id: "co", novalidate: "novalidate", onsubmit: submit },
                field("cName", "Full name *", "text", { autocomplete: "name", maxlength: "100" }),
                field("cPhone", "Phone number *", "tel", { autocomplete: "tel", placeholder: "03xx xxxxxxx" }),
                field("cEmail", "Email (optional)", "email", { autocomplete: "email" }),
                field("cCity", "City *", "text", { autocomplete: "address-level2" }),
                field("cAddr", "Full delivery address *", "area", { autocomplete: "street-address", maxlength: "300" }),
                field("cNote", "Order note (optional)", "area", { maxlength: "500" }),
                el("div", { style: "position:absolute;left:-9999px", "aria-hidden": "true" }, el("input", { id: "cWeb", tabindex: "-1", autocomplete: "off" })),
                el("button", { class: "btn solid", id: "placeBtn", type: "submit" }, "PLACE ORDER")));
    }

    function setErr(id, msg) {
        $(id).classList.toggle("bad", !!msg);
        $("e-" + id).textContent = msg || "";
        return !msg;
    }

    function validate() {
        let ok = true;
        const v = (id) => $(id).value.trim();
        ok = setErr("cName", v("cName").length >= 2 ? "" : "Please enter your full name.") && ok;
        ok = setErr("cPhone", /^\+?[0-9 ()\-]{7,20}$/.test(v("cPhone")) ? "" : "Enter a valid phone number.") && ok;
        ok = setErr("cEmail", !v("cEmail") || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v("cEmail")) ? "" : "Enter a valid email or leave it empty.") && ok;
        ok = setErr("cCity", v("cCity").length >= 2 ? "" : "Please enter your city.") && ok;
        ok = setErr("cAddr", v("cAddr").length >= 8 ? "" : "Please enter your full address.") && ok;
        return ok;
    }

    function banner(msg) {
        const b = $("banner");
        b.textContent = msg;
        b.hidden = !msg;
        if (msg) b.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    async function submit(ev) {
        ev.preventDefault();
        banner("");
        if ($("cWeb").value) return; // honeypot
        if (!validate()) { // slide to the first wrong field
            const first = $("co").querySelector(".bad");
            if (first) {
                first.scrollIntoView({ behavior: "smooth", block: "center" });
                first.focus({ preventScroll: true });
            }
            return;
        }
        const btn = $("placeBtn");
        btn.disabled = true;
        btn.textContent = "SENDING…";
        const v = (id) => $(id).value.trim();
        const body = {
            name: v("cName"),
            phone: v("cPhone"),
            email: v("cEmail"),
            city: v("cCity"),
            address: v("cAddr"),
            note: v("cNote"),
            items: cart.map((l) => ({ id: l.id, size: l.size, colour: l.colour, qty: l.qty }))
        }; // no prices are sent
        try {
            const res = await fetch(C.APPS_SCRIPT_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(body) });
            const out = await res.json();
            if (!out.ok) throw new Error(out.error || "Could not save your order.");
            cart.length = 0;
            K.saveCart();
            K.renderBadge(); // success only after the sheet confirmed it
            const wa = C.WHATSAPP ? el("a", {
                class: "btn solid",
                style: "margin-top:1rem",
                target: "_blank",
                rel: "noopener",
                href: "https://wa.me/" + C.WHATSAPP + "?text=" + encodeURIComponent("Hello Kapra Maihal, I placed order " + out.id + ".")
            }, "Message us on WhatsApp") : null;
            $("drawerBody").replaceChildren(el("div", { class: "ok" }, el("h3", {}, "Order received"),
                el("p", {}, "Your order number is "), el("strong", {}, out.id),
                el("p", { style: "margin-top:.6rem" }, "Total to pay on delivery: " + money(out.total) + ". We will contact you to confirm your order."), wa));
            K.loadProducts(true).catch(() => {}); // refresh stock
        } catch (err) {
            banner("Your order was NOT saved. " + err.message + " Please try again.");
            btn.disabled = false;
            btn.textContent = "PLACE ORDER";
        }
    }

    // ---------- footer ----------
    const foot = $("footInfo");
    if (foot) {
        const tel = C.WHATSAPP ? "+" + C.WHATSAPP : C.PHONE;
        const info = [el("strong", {}, "Kapra Maihal")];
        if (C.PHONE) info.push(el("a", { href: "tel:" + tel }, C.PHONE));
        if (C.EMAIL) info.push(el("a", { href: "mailto:" + C.EMAIL }, C.EMAIL));
        if (C.WHATSAPP) info.push(el("a", { href: "https://wa.me/" + C.WHATSAPP, target: "_blank", rel: "noopener" }, "WhatsApp"));
        if (C.ADDRESS) info.push(el("span", {}, C.ADDRESS));
        foot.replaceChildren(...info);
    }
    K.renderBadge();
})();