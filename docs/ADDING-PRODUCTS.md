# Adding, editing and removing products

All products live in this repository as plain text files in [`data/products/`](../data/products), one file per category:

| File | Category |
| --- | --- |
| `live-reptiles.json` | Live Reptiles |
| `enclosures.json` | Enclosures & Habitats |
| `heating-lighting.json` | Heating & Lighting |
| `substrate-decor.json` | Substrate & Décor |
| `food-supplements.json` | Food & Supplements |
| `care-accessories.json` | Care & Accessories |

When you save a change to one of these files on the `main` branch, a GitHub Action checks it and copies it to the database. The live site updates within about a minute. You never need to touch code.

---

## Edit a product on GitHub (price, stock, description…)

1. Open the repository on GitHub and go to `data/products/`.
2. Click the file for the category (for example `live-reptiles.json`).
3. Click the **pencil icon** (Edit this file) at the top right.
4. Press **Ctrl+F** (or **Cmd+F** on a Mac) and search for the product's `slug`, e.g. `"normal-ball-python"`.
5. Change the value you want, for example `"price_cents": 7900` → `"price_cents": 8900`.
6. Click **Commit changes…**, write a short message like "Raise normal ball python price", and choose **Commit directly to the main branch**.
7. Click the **Actions** tab to watch **Sync products to Supabase**. A green tick means the site is updated; a red cross means something in the file needs fixing (see [When the check fails](#when-the-check-fails)).

> **Prices are in cents.** `7900` = $79.00, `1250` = $12.50. Never use a decimal point.

---

## Add a new product

1. Open the right category file and click the pencil icon.
2. Find the last product in the file. After its closing `}` add a **comma**, then paste the template below before the final `]`.
3. Fill in the values. Every `slug` and `sku` must be unique across all files.
4. Commit to `main`.

### Copy-paste template: supplies / equipment

```json
{
  "slug": "magnetic-feeding-ledge",
  "name": "Magnetic Feeding Ledge",
  "category": "care-accessories",
  "subcategory": "handling",
  "short_description": "One or two sentences (20–300 characters) shown on product cards and in search results.",
  "long_description": "A longer description written in **Markdown**.\n\n## Features\n\n- First feature\n- Second feature",
  "price_cents": 1499,
  "compare_at_price_cents": null,
  "currency": "USD",
  "stock_quantity": 25,
  "sku": "CA-HD-LEDGE",
  "images": [],
  "featured": false,
  "active": true,
  "is_live_animal": false,
  "species_scientific_name": null,
  "care_level": null,
  "adult_size": null,
  "lifespan": null,
  "diet": null,
  "temperature_range": null,
  "humidity_range": null,
  "tags": ["feeding ledge", "crested gecko"],
  "seo_title": "Magnetic Feeding Ledge for Geckos",
  "seo_description": "A 50–170 character summary that appears in Google results. Make it specific and useful.",
  "image_search": { "query": "feeding ledge", "alt": "Magnetic feeding ledge attached to a terrarium" }
}
```

### Extra fields for live animals

Set `"category": "live-reptiles"` and `"is_live_animal": true`, then **all** of these are required:

```json
  "species_scientific_name": "Eublepharis macularius",
  "care_level": "beginner",
  "adult_size": "7–10 in (18–25 cm)",
  "lifespan": "15–20 years",
  "diet": "Gut-loaded insects dusted with calcium",
  "temperature_range": "Warm side 88–92°F, cool side 72–78°F",
  "humidity_range": "30–40% with a humid hide",
```

`care_level` must be `beginner`, `intermediate` or `advanced`.

### Field reference

| Field | What it does |
| --- | --- |
| `slug` | The web address: `/shop/<category>/<slug>`. Lowercase letters, numbers and hyphens only. **Don't change it after launch** (it breaks links and Google rankings). |
| `name` | Product title (the page's main heading). |
| `category` | One of the six file names above, without `.json`. |
| `subcategory` | Optional grouping such as `snakes`, `geckos`, `uvb-lighting`. |
| `price_cents` | Price in cents. |
| `compare_at_price_cents` | Optional "was" price, shown crossed out. Must be higher than `price_cents`, or `null`. |
| `stock_quantity` | Units available. `0` shows "Out of stock" and blocks checkout. |
| `sku` | Your stock code. Uppercase letters, numbers and hyphens. |
| `featured` | `true` shows it on the home page. |
| `active` | `false` hides it from the shop. |
| `tags` | Extra search words. |
| `seo_title` / `seo_description` | What Google shows. Title 10–70 characters, description 50–170. |
| `image_search` | Only used by the photo-finder script; ignored by the site. |

---

## Remove a product

Set `"active": false` and commit. The product disappears from the shop, search and sitemap, but past orders that reference it keep working. To bring it back, set `"active": true`.

Deleting the product from the file **doesn't** hide it, because the sync never deletes or hides database rows on its own. A developer can run `npm run sync:products -- --prune` to hide every product that is missing from the files.

---

## Replacing a product photo

Many equipment products and some animal morphs use a generated illustration. The list is in [IMAGES-TODO.md](IMAGES-TODO.md). To use your own photo:

1. Prepare a **landscape or square JPG/PNG at least 1200 px wide**.
2. On a computer with this project: save it as `public/products/<slug>-1.jpg`, then run:

   ```bash
   npx tsx scripts/use-own-photo.ts <slug> public/products/<slug>-1.jpg "Descriptive alt text"
   ```

   This converts it to an optimized WebP and thumbnail, records the credit as your own work, and removes the placeholder flag.
3. Commit and push. The Action uploads the new image and updates the site.

**Without a computer** (GitHub only): convert your photo to WebP at about 1600 px wide (for example with [squoosh.app](https://squoosh.app)), then use **Add file → Upload files** in `public/products/` to upload it as `<slug>-1.webp`, replacing the old one. Then edit the product's `images` entry: set the `alt` text, set `"credit": "ScaleHaven Reptiles"`, set `"license": "Own work"`, and delete the `"placeholder": true` line.

Only use photos you took yourself, photos your supplier gave you permission to use, or photos with a free commercial license. **Never** copy images from Google, other shops or breeders.

---

## When the check fails

The Action prints exactly what is wrong, for example:

```
✖ Product data is invalid:
  • live-reptiles.json → product #3 (piebald-ball-python) → price_cents: Invalid input: expected number, received string
```

Common causes:

- **Missing or extra comma** between products, or after the last field in a product.
- **Quotes around numbers.** Use `7900`, not `"7900"`.
- **Decimal prices.** Use `7900`, not `79.00`.
- **Duplicate `slug` or `sku`** that is already used by another product.
- **Live animal missing care fields** (see above).

Fix the file the same way you edited it, then commit again. Until it passes, the live site keeps showing the last good version.
