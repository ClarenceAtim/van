# Images to replace

No suitable free photo was found for these 21 products. Unsplash and Wikimedia Commons (CC0, Public Domain, CC BY or CC BY-SA) were searched. Most are branded equipment, feeder packs or rare morphs that free libraries don't cover, so they need your own or supplier photos.

To replace one, run `npx tsx scripts/use-own-photo.ts <slug> <photo> "Alt text"`. See [ADDING-PRODUCTS.md](ADDING-PRODUCTS.md#replacing-a-product-photo).

Live animals are **High** priority, because buyers expect to see the actual morph.

| Priority | Status | Category | Slug | Product | Photo needed |
| --- | --- | --- | --- | --- | --- |
| **High** | LOW QUALITY | live-reptiles | `african-fat-tailed-gecko` | African Fat-Tailed Gecko – Normal | A clear, close photo of a single normal African fat-tailed gecko |
| **High** | MISMATCH | live-reptiles | `african-fat-tailed-gecko-whiteout` | African Fat-Tailed Gecko – Whiteout | A whiteout African fat-tailed gecko |
| **High** | MISMATCH | live-reptiles | `albino-western-hognose` | Western Hognose Snake – Albino | An albino western hognose (peach/orange with red eyes) |
| **High** | MISMATCH | live-reptiles | `clown-ball-python` | Ball Python – Clown | A clown morph ball python (reduced pattern, dorsal stripe, dark head stamp) |
| Medium | MISMATCH | enclosures | `pvc-enclosure-3x2x2` | PVC Reptile Enclosure 3×2×2 ft | Front view of the 3×2×2 ft PVC enclosure (doors open or closed), ideally set up |
| Medium | MISMATCH | enclosures | `pvc-enclosure-6x2x2` | PVC Reptile Enclosure 6×2×2 ft | Front view of the 6×2×2 ft PVC enclosure, ideally set up |
| Medium | MISMATCH | enclosures | `screen-chameleon-cage-24x24x48` | Screen Chameleon Cage 24×24×48 in | The all-screen (mesh) chameleon cage, empty or planted |
| Medium | MISMATCH | food-supplements | `crested-gecko-diet-8oz` | Complete Crested Gecko Diet – 8 oz | The diet pouch/tub, or the mixed diet in a feeding dish |
| Medium | MISMATCH | food-supplements | `frozen-mice-adult-10` | Frozen Adult Mice – 10 Pack | Bag/pack of frozen adult feeder mice (no live animals) |
| Medium | MISMATCH | food-supplements | `frozen-rats-medium-3` | Frozen Medium Rats – 3 Pack | Bag/pack of frozen medium feeder rats (no live animals) |
| Medium | MISMATCH | food-supplements | `frozen-rats-small-5` | Frozen Small Rats – 5 Pack | Bag/pack of frozen small feeder rats. Current photo is a live pet rat (faces-in-frame photo removed) |
| Medium | MISMATCH | heating-lighting | `ceramic-heat-emitter-100w` | Ceramic Heat Emitter – 100 W | A ceramic heat emitter bulb (white or black ceramic, E26/E27 base) |
| Medium | MISMATCH | heating-lighting | `ceramic-heat-emitter-150w` | Ceramic Heat Emitter – 150 W | A ceramic heat emitter bulb (white or black ceramic, E26/E27 base) |
| Medium | MISMATCH | heating-lighting | `digital-lighting-timer` | Digital Dual-Outlet Lighting Timer | Digital plug-in timer with two outlets |
| Medium | MISMATCH | heating-lighting | `dimming-thermostat` | Dimming Thermostat | Plug-in reptile dimming thermostat with its probe |
| Medium | MISMATCH | heating-lighting | `heat-mat-large` | Under-Tank Heat Mat – Large (24 W) | The large under-tank heat mat with its cable |
| Medium | MISMATCH | heating-lighting | `heat-mat-small` | Under-Tank Heat Mat – Small (8 W) | The small under-tank heat mat with its cable |
| Medium | MISMATCH | heating-lighting | `on-off-thermostat` | On/Off Thermostat | Plug-in reptile on/off thermostat with its probe |
| Medium | MISMATCH | heating-lighting | `proportional-thermostat` | Proportional Thermostat with Day/Night | Plug-in reptile thermostat unit with its temperature probe |
| Medium | MISMATCH | substrate-decor | `coco-fiber-brick-3-pack` | Coco Fiber Substrate Brick – 3 Pack | Compressed coco fiber bricks (dry), ideally with some expanded substrate |
| Medium | PLACEHOLDER | care-accessories | `ball-python-care-guide-book` | The Ball Python Manual (Care Guide Book) | The actual book cover, or the book photographed on a table |

## Hidden until a photo is added

| Category | Slug | Product | Photo needed |
| --- | --- | --- | --- |
| substrate-decor | `crested-gecko-feeding-ledge` | Crested Gecko Feeding Ledge – Magnetic | The ledge with two cups on terrarium glass, ideally with a gecko eating |

This product is a **draft** (`"active": false` in `data/products/substrate-decor.json`), so it doesn't appear in the shop, search, sitemap or related products. No free photo of a gecko feeding ledge exists; searches only return household wall shelves. To publish it, add a photo with `npx tsx scripts/use-own-photo.ts crested-gecko-feeding-ledge <photo> "Alt text"`, set `"active": true` and run `npm run sync:products`.

## Representative photos added in the second pass

These 7 products had no photo after the first pass. They now show a real photo of the same type of item, labelled "Representative photo". Replace them with your own photos when you can.

| Slug | Current photo shows | Ideal photo |
| --- | --- | --- |
| `wifi-reptile-thermostat` | A modern digital smart thermostat on a wall | The thermostat unit with both outlets and probes, next to a phone showing the app |
| `reptile-heat-cable-15ft` | Electric underfloor heating cable laid in loops | The coiled silicone heat cable with its plug |
| `reptile-heat-tape-11in` | A glowing electric heating element | The heat tape roll, or a strip fitted under a rack shelf |
| `reptile-uv-index-meter` | A vintage handheld photographic light meter | The UV index meter taking a reading under a UVB lamp |
| `insect-dusting-cup` | A shaker cup with supplement powder | The dusting cup with calcium-coated crickets inside |
| `egg-incubation-medium-perlite` | Loose vermiculite granules (half of the mix) | The mix, or reptile eggs set in it in an egg box |
| `cricket-water-gel` | Coloured water gel beads | The cup of gel, or gel in a dish with crickets drinking from it |

## New products using a representative photo

These new products have a real photo of the same species or type of item, but not the exact morph or product. The product page labels them "Representative photo". Live animals are **High** priority.

| Priority | Slug | Product | Current photo shows |
| --- | --- | --- | --- |
| **High** | `lilly-white-crested-gecko` | Lilly White Crested Gecko | A normal yellow crested gecko (Lilly White has bright white patterning) |
| **High** | `high-yellow-leopard-gecko` | High Yellow Leopard Gecko | A wild-type leopard gecko (high yellows are brighter golden-yellow) |
| **High** | `tremper-albino-leopard-gecko` | Tremper Albino Leopard Gecko | An albino leopard gecko of unconfirmed strain |
| **High** | `leatherback-bearded-dragon` | Leatherback Bearded Dragon | A close-up of a standard-scaled bearded dragon's head |
| **High** | `pinstripe-ball-python` | Pinstripe Ball Python | A bumblebee (pastel pinstripe) ball python |
| Low | (equipment, kits, decor and feeders) | 32 other new products | A real photo of the same type of item. Marked `representative: true` in `data/products/*.json` |

## Representative photos

Products whose photo is marked `representative: true` show a real photo of the same species or the same type of item, not the exact product. The product page labels them "Representative photo". Replacing them with your own photos is optional and lower priority. See [IMAGE-AUDIT.md](IMAGE-AUDIT.md) for the full list.
