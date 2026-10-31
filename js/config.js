// ===== EDIT THIS FILE ONLY — your shop settings =====
// Name, phone, email, WhatsApp and address are used on EVERY page (header, footer, contact, policies, checkout).
window.SHOP = {
    NAME: "ZARÉEN",
    TAGLINE: "The Art of Timeless Beauty",
    APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyeRqNoWhEBamKNcfJpswHeILkvJwsfU7-lMqEKAxLM3UKktpG2yUEi6KsqRQPEWblb/exec", // paste your Apps Script Web app URL (ends in /exec) between the quotes
    CURRENCY: "PKR",
    MAX_QTY: 10, // most pieces of one item per order

    // Contact details
    PHONE: "+92 305 8946649",
    WHATSAPP: "923058946649", // digits only: country code 92 + number without the leading 0
    EMAIL: "atzareen@gmail.com",
    ADDRESS: "Jadoon Plaza, Phase 2, Mandia, Atd",

    // Size guide (opens from the "Size guide" link on products that have sizes).
    // Edit the numbers below so they match YOUR clothes. Measurements are in inches.
    // Optional: to show your own chart picture instead of the table, put the file in the images folder
    // and write its path in "image", for example "images/size-guide.jpg". Customers can tap it to zoom.
    SIZE_GUIDE: {
        note: "Body measurements in inches. Fit can vary slightly by design, so choose the size closest to your measurements.",
        columns: ["Size", "Bust", "Waist", "Hips"],
        rows: [
            ["S", "34–35", "27–28", "36–37"],
            ["M", "36–37", "29–30", "38–39"],
            ["L", "38–40", "31–33", "40–42"],
            ["XL", "41–43", "34–36", "43–45"]
        ],
        image: ""
    },

    // Photos that slide in the red area on the home page (put the files in the gallery folder)
    GALLERY_IMAGES: [
        "gallery/gallery-1.jpg", "gallery/gallery-2.jpg", "gallery/gallery-3.jpg", "gallery/gallery-4.jpg",
        "gallery/gallery-5.jpg", "gallery/gallery-6.jpg", "gallery/gallery-7.jpg", "gallery/gallery-8.jpg"
    ],
    // Tall photos for phones (portrait, about 900 x 1125). Optional: if one is missing, the wide photo is used.
    GALLERY_MOBILE_IMAGES: [
        "gallery/mobile-1.jpg", "gallery/mobile-2.jpg", "gallery/mobile-3.jpg", "gallery/mobile-4.jpg",
        "gallery/mobile-5.jpg", "gallery/mobile-6.jpg", "gallery/mobile-7.jpg", "gallery/mobile-8.jpg"
    ],
    SLIDE_SECONDS: 4
};
