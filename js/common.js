// ===== Shared by every page: helpers, products, cart, floating WhatsApp, popups, footer =====
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

    // ---------- contact links (all built from js/config.js, so you change a number in ONE place) ----------
    const digits = (s) => String(s || "").replace(/\D/g, "");
    K.tel = () => "tel:+" + (digits(C.WHATSAPP) || digits(C.PHONE));
    K.wa = (msg) => "https://wa.me/" + digits(C.WHATSAPP) + (msg ? "?text=" + encodeURIComponent(msg) : "");
    K.hello = "Hello " + C.NAME + ", I have a question.";
    // any element with data-shop="PHONE" (or EMAIL, ADDRESS, NAME, TAGLINE) shows that setting;
    // any link with data-link="tel" / "mail" / "wa" points to the right place
    document.querySelectorAll("[data-shop]").forEach((n) => { const v = C[n.dataset.shop]; if (v) n.textContent = v; });
    document.querySelectorAll("[data-link]").forEach((n) => {
        const t = n.dataset.link;
        if (t === "tel") n.href = K.tel();
        else if (t === "mail" && C.EMAIL) n.href = "mailto:" + C.EMAIL;
        else if (t === "wa" && C.WHATSAPP) n.href = K.wa(n.dataset.msg || K.hello);
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
    K.onCartChange = null; // the checkout page sets this so its summary stays in step with the cart drawer

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

    // ---------- popup window (used by the size guide) ----------
    function lockScroll() {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }
    K.modal = function(title, content) {
        const prevFocus = document.activeElement;
        const unlock = lockScroll();
        const close = () => {
            back.remove();
            document.removeEventListener("keydown", onKey);
            unlock();
            if (prevFocus && prevFocus.focus) prevFocus.focus();
        };
        const onKey = (e) => { if (e.key === "Escape") close(); };
        const closeBtn = el("button", { type: "button", class: "mdl-x", "aria-label": "Close", onclick: close }, "×");
        const back = el("div", { class: "mdl-back", onclick: (e) => { if (e.target === back) close(); } },
            el("div", { class: "mdl", role: "dialog", "aria-modal": "true", "aria-label": title },
                el("div", { class: "mdl-head" }, el("h3", {}, title), closeBtn),
                el("div", { class: "mdl-body" }, content)));
        document.addEventListener("keydown", onKey);
        document.body.appendChild(back);
        closeBtn.focus();
        return close;
    };

    // ---------- size guide ----------
    K.sizeGuide = function() {
        const g = C.SIZE_GUIDE || {};
        const box = el("div", { class: "sg" });
        const table = () => el("div", { class: "tbl" }, el("table", {},
            el("thead", {}, el("tr", {}, (g.columns || []).map((c) => el("th", {}, c)))),
            el("tbody", {}, (g.rows || []).map((r) => el("tr", {}, r.map((c, j) => el(j ? "td" : "th", j ? {} : { scope: "row" }, c)))))));
        const showTable = () => {
            const parts = [table()];
            if (g.note) parts.push(el("p", { class: "note" }, g.note));
            box.replaceChildren(...parts);
        };
        if (g.image) {
            box.replaceChildren(
                el("img", { src: g.image, alt: "Size guide chart", class: "sg-img", onclick: () => K.zoom([g.image], 0), onerror: showTable }),
                el("p", { class: "note" }, "Tap the chart to zoom."));
        } else showTable();
        K.modal("Size guide", box);
    };

    // ---------- tap-to-zoom photo viewer ----------
    // K.zoom(listOfPhotos, startIndex, onChange): full-screen photo. Tap the photo to zoom in, tap again to zoom out.
    // When zoomed in, drag / scroll to look around. Arrows or a swipe move to the next photo.
    K.zoom = function(list, start, onChange) {
        list = (list || []).filter(Boolean);
        if (!list.length) return;
        let i = Math.min(Math.max(start || 0, 0), list.length - 1),
            zoomed = false,
            x0 = null;
        const unlock = lockScroll();
        const pic = el("img", { alt: "", draggable: "false" });
        const view = el("div", { class: "zv" }, pic);
        const count = el("span", { class: "zc" });
        const prev = el("button", { type: "button", class: "zn zp", "aria-label": "Previous photo", onclick: () => go(-1) }, "‹");
        const next = el("button", { type: "button", class: "zn zq", "aria-label": "Next photo", onclick: () => go(1) }, "›");
        const x = el("button", { type: "button", class: "zclose", "aria-label": "Close", onclick: () => close() }, "×");
        const box = el("div", { class: "zoom", role: "dialog", "aria-modal": "true", "aria-label": "Photo viewer" }, view, x, list.length > 1 ? [prev, next, count] : null);

        function show() {
            zoomed = false;
            pic.classList.remove("z");
            view.classList.remove("zoomed");
            view.scrollLeft = 0;
            view.scrollTop = 0;
            pic.src = list[i];
            count.textContent = (i + 1) + " / " + list.length;
        }

        function go(d) {
            i = (i + d + list.length) % list.length;
            show();
            if (onChange) onChange(i);
        }

        function close() {
            window.removeEventListener("keydown", onKey, true);
            box.remove();
            unlock();
        }

        function onKey(e) {
            if (e.key === "Escape") { e.stopImmediatePropagation(); close(); } else if (e.key === "ArrowLeft" && list.length > 1) go(-1);
            else if (e.key === "ArrowRight" && list.length > 1) go(1);
        }
        pic.addEventListener("click", (e) => {
            const r = pic.getBoundingClientRect();
            const fx = (e.clientX - r.left) / r.width,
                fy = (e.clientY - r.top) / r.height;
            zoomed = !zoomed;
            pic.classList.toggle("z", zoomed);
            view.classList.toggle("zoomed", zoomed);
            if (zoomed) { // zoom in where the finger / mouse touched
                view.scrollLeft = fx * pic.offsetWidth - view.clientWidth / 2;
                view.scrollTop = fy * pic.offsetHeight - view.clientHeight / 2;
            }
        });
        view.addEventListener("click", (e) => { if (e.target === view && !zoomed) close(); }); // tap the dark area to close
        view.addEventListener("touchstart", (e) => { x0 = !zoomed && e.touches.length === 1 ? e.touches[0].clientX : null; }, { passive: true });
        view.addEventListener("touchend", (e) => {
            if (x0 == null || list.length < 2) return;
            const dx = e.changedTouches[0].clientX - x0;
            x0 = null;
            if (Math.abs(dx) > 60) go(dx < 0 ? 1 : -1);
        }, { passive: true });
        window.addEventListener("keydown", onKey, true);
        document.body.appendChild(box);
        show();
        x.focus();
    };

    // ---------- cart drawer ----------
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

    K.totals = function() {
        const sub = cart.reduce((n, l) => { const p = K.find(l.id); return p ? n + price(p) * l.qty : n; }, 0);
        const fee = cart.length ? K.settings.deliveryFee || 0 : 0;
        return { sub, fee, total: sub + fee };
    };

    function changed() {
        K.saveCart();
        K.renderBadge();
        renderCart();
        if (K.onCartChange) K.onCartChange();
    }

    function renderCart() {
        const mine = cart.filter((l) => K.find(l.id));
        if (!mine.length) { $("drawerBody").replaceChildren(el("p", { class: "note" }, "Your cart is empty.")); return; }
        const t = K.totals();
        const lines = mine.map((l) => {
            const p = K.find(l.id);
            const change = (d) => {
                l.qty = Math.min(C.MAX_QTY, Math.max(1, l.qty + d));
                changed();
            };
            return el("div", { class: "line" }, K.img(K.photosFor(p, l.colour)[0], p.name),
                el("div", {}, el("strong", {}, p.name), el("small", {}, [l.size, l.colour].filter(Boolean).join(" · ")),
                    el("div", { class: "qty" }, el("button", { onclick: () => change(-1) }, "−"), el("span", {}, String(l.qty)), el("button", { onclick: () => change(1) }, "+")),
                    el("button", {
                        class: "rm",
                        onclick: () => {
                            cart.splice(cart.indexOf(l), 1);
                            changed();
                        }
                    }, "Remove")),
                el("div", { class: "price" }, money(price(p) * l.qty)));
        });
        $("drawerBody").replaceChildren(...lines,
            el("div", { class: "sum" },
                el("div", {}, el("span", {}, "Subtotal"), el("span", {}, money(t.sub))),
                t.fee ? el("div", {}, el("span", {}, "Delivery"), el("span", {}, money(t.fee))) : null,
                el("div", { class: "tot" }, el("span", {}, "Total"), el("span", {}, money(t.total)))),
            el("p", { class: "note" }, "Payment: cash on delivery. Prices are re-checked when you place the order. ", el("a", { href: "policies.html" }, "Delivery & return policies")),
            el("a", {
                class: "btn solid",
                href: "checkout.html",
                onclick: (ev) => { // already on the checkout page: just close the cart
                    if (/checkout\.html$/.test(location.pathname)) { ev.preventDefault();
                        closeAll(); }
                }
            }, "CHECKOUT"));
    }

    // ---------- footer ----------
    const foot = $("footInfo");
    if (foot) {
        const info = [el("strong", { class: "fb" }, C.NAME)];
        if (C.PHONE) info.push(el("a", { href: K.tel() }, C.PHONE));
        if (C.EMAIL) info.push(el("a", { href: "mailto:" + C.EMAIL }, C.EMAIL));
        if (C.WHATSAPP) info.push(el("a", { href: K.wa(K.hello), target: "_blank", rel: "noopener" }, "WhatsApp"));
        if (C.ADDRESS) info.push(el("span", {}, C.ADDRESS));
        info.push(el("a", { href: "policies.html" }, "Policies"));
        info.push(el("span", { class: "fc" }, "© " + new Date().getFullYear() + " " + C.NAME));
        foot.replaceChildren(...info);
    }

    // ---------- floating WhatsApp button (every page) ----------
    if (C.WHATSAPP) {
        const wa = el("a", { class: "wa-float", href: K.wa(K.hello), target: "_blank", rel: "noopener", "aria-label": "Chat with us on WhatsApp" });
        wa.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>';
        document.body.appendChild(wa);
    }
    K.renderBadge();
})();
