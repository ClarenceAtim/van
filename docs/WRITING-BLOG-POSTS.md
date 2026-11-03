# Writing blog posts

Every blog post is one MDX file in [`content/blog/`](../content/blog). MDX is Markdown with a few optional extras. You can add and edit posts straight on GitHub, and the site rebuilds itself when you commit.

## Add a new post on GitHub

1. Open the `content/blog` folder on GitHub and click **Add file → Create new file**.
2. Name the file after the post's URL, for example `tortoise-care-guide.mdx`. Use lowercase letters, numbers and hyphens only. The file name must match the `slug` in the template.
3. Paste the template below and fill it in.
4. Upload the cover photo to `public/blog/`, named after the slug (e.g. `public/blog/tortoise-care-guide.webp`). Landscape photos around 1600×900 px work best.
5. Click **Commit changes**. When the deploy finishes, the post appears on `/blog`, its category page, the RSS feed (`/blog/rss.xml`) and the sitemap automatically.

To edit a post, open its file on GitHub, click the pencil icon, make your changes and commit. Change the `updated:` date so search engines know it changed.

## Copy-paste template

```mdx
---
title: "Tortoise Care Guide: Housing, Diet and UVB"
slug: tortoise-care-guide
description: One or two sentences (70–170 characters) shown in Google results and on post cards.
category: care-guides
tags: [tortoise, herbivores, uvb]
author: care-team
date: 2026-11-15
updated: 2026-11-15
cover:
  src: /blog/tortoise-care-guide.webp
  alt: Russian tortoise eating dandelion leaves on a sunny lawn
  credit: Photographer Name on Unsplash
  license: Unsplash License
  source_url: https://unsplash.com/photos/...
featured: false
related_products: [russian-tortoise, tortoise-table-48x24, tortoise-diet-pellets]
species: [Testudo horsfieldii]
---

An opening paragraph that says who the post is for and what it covers.

<Note>
Every animal is an individual. Use this guide as a starting point and consult a qualified reptile veterinarian about any health concern.
</Note>

## First section heading

Text, **bold**, *italic*, and links to [a product](/shop/live-reptiles/russian-tortoise) and [another post](/blog/uvb-lighting-explained).

| Zone | Temperature |
| --- | --- |
| Basking | 95–100°F |

## Frequently asked questions

### First question?

Answer in a short paragraph.

### Second question?

Answer.

### Third question?

Answer.
```

## Field reference

| Field | Required | Notes |
| --- | --- | --- |
| `title` | Yes | 10–110 characters. Becomes the page's H1 and browser title. |
| `slug` | Yes | Must match the file name. Becomes the URL: `/blog/<slug>`. |
| `description` | Yes | 70–170 characters. Used for the meta description, social cards and post cards. |
| `category` | Yes | One of: `care-guides`, `species-profiles`, `habitat-setup`, `feeding-nutrition`, `health-wellness`, `beginner-tips`, `shop-news`. |
| `tags` | No | Used for search and to pick related posts. |
| `author` | Yes | An ID from [`content/blog/_authors.json`](../content/blog/_authors.json). Add new authors there. |
| `date` | Yes | Publish date, `YYYY-MM-DD`. Posts are listed newest first. |
| `updated` | No | Last meaningful update, `YYYY-MM-DD`. Shown on the post and used in the sitemap. |
| `cover` | Yes | Image path, alt text (describe what's in the photo), credit, license and source URL. Appears on [/credits](/credits). |
| `featured` | No | `true` puts the post in the large "Featured" slot on `/blog`. Only one post should be featured. |
| `related_products` | No | Product slugs from `data/products/*.json`, shown as "Shop the products in this guide". |
| `species` | No | Scientific names. Live-animal product pages for these species link to this post. |

## Writing rules

The automated tests (`npm test`) check these, so a post that breaks them fails the build check:

- Link to **at least 2 products** (`/shop/<category>/<slug>`) and **at least 1 other post** (`/blog/<slug>`). All links must point to real pages.
- End with a `## Frequently asked questions` section of **3–5** `###` questions. These become FAQ rich results in Google.
- **Don't use a single `#` heading.** The title is the page's only H1. Start sections at `##`, with `###` for sub-sections.
- `related_products` must list real product slugs.
- The cover file must exist in `public/blog/`.

Also:

- Write original content. Don't copy text from other websites.
- Use widely accepted husbandry information, and add the `<Note>` reminder about consulting a reptile vet on care and health posts.
- Aim for 1,000–1,500 words for guides.
- Only use photos you own, or that are licensed **CC0, Public Domain, CC BY or CC BY-SA** (never NC or ND), or under the Unsplash License. Always fill in credit, license and source URL.

## What you can use in MDX

- All normal Markdown: headings, lists, tables, links, bold and italic, and checklists (`- [ ]`).
- `<Note>…</Note>` for a highlighted callout box.
- JavaScript expressions (`{...}`) and imports are blocked for safety. If a post fails to build, check for a stray `{` or `<` in the text and wrap it in backticks.
