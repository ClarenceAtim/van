# Product image audit

Audit of the main photo for all 112 products, run on 2026-11-02. Every image was opened and checked by eye, and the shop grid, all category pages and all 112 product pages were crawled on the dev server to confirm each image loads.

| | OK | BROKEN | PLACEHOLDER | MISMATCH | LOW QUALITY |
| --- | --- | --- | --- | --- | --- |
| Before | 57 | 0 | 1 | 46 | 8 |
| After | 91 | 0 | 1 | 19 | 1 |

**BROKEN was 0 before and after.** All 112 files exist, are served with an image content type, and render on the live pages. No product used an SVG, icon or `file.svg` image. The earlier SVG illustrations had already been replaced with WebP files in commit d191cc4.

Products still not OK are listed with the photo they need in [IMAGES-TODO.md](IMAGES-TODO.md).

**Statuses:** OK = real photo that loads and matches the product. PLACEHOLDER = generic or unrelated stand-in. MISMATCH = real photo of the wrong animal or item. LOW QUALITY = blurry, cluttered, too small in frame or under 1000 px. _Representative_ = a real photo of the same species, morph type or kind of item, labelled "Representative photo" on the product page.

**Sources** (credit, license and source URL are stored in each product's `images[]` and shown on /credits):
- Unsplash, under the Unsplash License. The API download endpoint was notified for each photo used.
- Wikimedia Commons, under CC0, Public Domain, CC BY or CC BY-SA only.
- Openverse was also requested, but its API returned a Cloudflare bot challenge (HTTP 403), so it was not used.

| Slug | Product | Image | Before | After | Notes |
| --- | --- | --- | --- | --- | --- |
| `digital-thermometer-hygrometer` | Digital Thermometer & Hygrometer with Probe | `/products/digital-thermometer-hygrometer-1.webp` | OK | **OK** | Digital thermo-hygrometer |
| `infrared-temperature-gun` | Infrared Temperature Gun | `/products/infrared-temperature-gun-1.webp` | MISMATCH | **OK** | Replaced: Handheld infrared temperature gun with a backlit display reading 60.5 °F _(representative)_ |
| `digital-gram-scale` | Digital Gram Scale with Bowl | `/products/digital-gram-scale-1.webp` | OK | **OK** | Digital scale |
| `automatic-misting-system` | Automatic Misting System | `/products/automatic-misting-system-1.webp` | MISMATCH | **OK** | Replaced: Overhead misting nozzles spraying a fine mist over plants _(representative)_ |
| `pressure-sprayer-2l` | Handheld Pressure Sprayer – 2 L | `/products/pressure-sprayer-2l-1.webp` | OK | **OK** | Hand pressure sprayer |
| `feeding-tongs-12in` | Stainless Steel Feeding Tongs – 12 in | `/products/feeding-tongs-12in-1.webp` | OK | **OK** | Stainless steel tongs |
| `collapsible-snake-hook` | Collapsible Snake Hook | `/products/collapsible-snake-hook-1.webp` | OK | **OK** | Telescoping snake hook |
| `reptile-safe-cleaner` | Reptile-Safe Enclosure Cleaner – 16 oz | `/products/reptile-safe-cleaner-1.webp` | LOW QUALITY | **OK** | Replaced: Two green trigger spray bottles used for enclosure cleaner _(representative)_ |
| `ball-python-care-guide-book` | The Ball Python Manual (Care Guide Book) | `/products/ball-python-care-guide-book-1.webp` | PLACEHOLDER | **PLACEHOLDER** | Generic shelf of unrelated (Russian-language) books |
| `glass-terrarium-12x12x18` | Front-Opening Glass Terrarium 12×12×18 in | `/products/glass-terrarium-12x12x18-1.webp` | MISMATCH | **OK** | Replaced: Small planted glass terrarium with driftwood and a clip-on light _(representative)_ |
| `glass-terrarium-18x18x24` | Front-Opening Glass Terrarium 18×18×24 in | `/products/glass-terrarium-18x18x24-1.webp` | MISMATCH | **OK** | Replaced: Glass terrarium planted with moss, ferns and rocks _(representative)_ |
| `glass-terrarium-24x18x18` | Front-Opening Glass Terrarium 24×18×18 in | `/products/glass-terrarium-24x18x18-1.webp` | MISMATCH | **OK** | Replaced: Wide glass terrarium planted with moss, ferns and driftwood under a top-mounted light _(representative)_ |
| `glass-terrarium-36x18x18` | Front-Opening Glass Terrarium 36×18×18 in | `/products/glass-terrarium-36x18x18-1.webp` | OK | **OK** | Glass terrarium with basking lamps and plants |
| `glass-terrarium-18x18x36-arboreal` | Tall Arboreal Glass Terrarium 18×18×36 in | `/products/glass-terrarium-18x18x36-arboreal-1.webp` | OK | **OK** | Tall planted glass terrarium |
| `pvc-enclosure-3x2x2` | PVC Reptile Enclosure 3×2×2 ft | `/products/pvc-enclosure-3x2x2-1.webp` | MISMATCH | **MISMATCH** | Close-up of a snake on a log; no enclosure visible |
| `pvc-enclosure-4x2x2` | PVC Reptile Enclosure 4×2×2 ft | `/products/pvc-enclosure-4x2x2-1.webp` | MISMATCH | **OK** | Replaced: Row of front-opening reptile enclosures fitted with lights, branches and plants _(representative)_ |
| `pvc-enclosure-6x2x2` | PVC Reptile Enclosure 6×2×2 ft | `/products/pvc-enclosure-6x2x2-1.webp` | MISMATCH | **MISMATCH** | Zoo rainforest exhibit, not a PVC enclosure (same photo as tropical bioactive kit) |
| `screen-chameleon-cage-24x24x48` | Screen Chameleon Cage 24×24×48 in | `/products/screen-chameleon-cage-24x24x48-1.webp` | MISMATCH | **MISMATCH** | Shows a chameleon, not a screen cage |
| `tortoise-table-48x24` | Tortoise Table 48×24 in | `/products/tortoise-table-48x24-1.webp` | MISMATCH | **OK** | Replaced: Two Hermann's tortoises in an open-top indoor enclosure with soil substrate and a food dish _(representative)_ |
| `bioactive-kit-tropical` | Tropical Bioactive Kit (18×18×24) | `/products/bioactive-kit-tropical-1.webp` | OK | **OK** | Planted tropical vivarium |
| `bioactive-kit-arid` | Arid Bioactive Kit (36×18×18) | `/products/bioactive-kit-arid-1.webp` | MISMATCH | **OK** | Replaced: Bearded dragon basking on a rock in a warm-lit arid terrarium with sandy substrate _(representative)_ |
| `leopard-gecko-starter-kit` | Leopard Gecko Complete Starter Kit | `/products/leopard-gecko-starter-kit-1.webp` | MISMATCH | **OK** | Replaced: Leopard gecko peeking out of a cork bark hide inside a warm-lit terrarium _(representative)_ |
| `ball-python-starter-kit` | Ball Python Complete Starter Kit | `/products/ball-python-starter-kit-1.webp` | MISMATCH | **OK** | Replaced: Ball python climbing a branch inside a terrarium with plants _(representative)_ |
| `bearded-dragon-starter-kit` | Bearded Dragon Complete Starter Kit | `/products/bearded-dragon-starter-kit-1.webp` | MISMATCH | **OK** | Replaced: Bearded dragon in a glass terrarium set up with sand substrate, artificial vines and fresh greens _(representative)_ |
| `crested-gecko-starter-kit` | Crested Gecko Complete Starter Kit | `/products/crested-gecko-starter-kit-1.webp` | MISMATCH | **OK** | Replaced: Crested gecko among live plants inside a planted terrarium _(representative)_ |
| `frozen-mice-pinkies-25` | Frozen Pinky Mice – 25 Pack | `/products/frozen-mice-pinkies-25-1.webp` | MISMATCH | **OK** | Replaced: Single thawed pinky mouse feeder on a plain white background _(representative)_ |
| `frozen-mice-adult-10` | Frozen Adult Mice – 10 Pack | `/products/frozen-mice-adult-10-1.webp` | MISMATCH | **MISMATCH** | Live wild mouse, not frozen feeders |
| `frozen-rats-small-5` | Frozen Small Rats – 5 Pack | `/products/frozen-rats-small-5-1.webp` | MISMATCH | **MISMATCH** | Expo stall sign with identifiable people's faces |
| `frozen-rats-medium-3` | Frozen Medium Rats – 3 Pack | `/products/frozen-rats-medium-3-1.webp` | MISMATCH | **MISMATCH** | Live pet rat, not frozen feeders |
| `live-dubia-roaches-medium-100` | Live Dubia Roaches – Medium (100) | `/products/live-dubia-roaches-medium-100-1.webp` | OK | **OK** | Dubia roaches |
| `live-crickets-500` | Live Banded Crickets – 500 | `/products/live-crickets-500-1.webp` | OK | **OK** | Banded cricket |
| `live-black-soldier-fly-larvae-250` | Live Black Soldier Fly Larvae – 250 | `/products/live-black-soldier-fly-larvae-250-1.webp` | OK | **OK** | Black soldier fly larvae |
| `dried-black-soldier-fly-larvae` | Dried Black Soldier Fly Larvae – 4 oz | `/products/dried-black-soldier-fly-larvae-1.webp` | MISMATCH | **OK** | Replaced: Pile of dried black soldier fly larvae _(representative)_ |
| `calcium-with-d3` | Calcium with D3 Supplement | `/products/calcium-with-d3-1.webp` | OK | **OK** | Fine white powder |
| `calcium-without-d3` | Calcium without D3 Supplement | `/products/calcium-without-d3-1.webp` | MISMATCH | **OK** | Replaced: Mound of fine white calcium supplement powder _(representative)_ |
| `reptile-multivitamin` | Reptile Multivitamin with Beta Carotene | `/products/reptile-multivitamin-1.webp` | MISMATCH | **OK** | Replaced: Fine supplement powder spread out with a measuring scoop _(representative)_ |
| `crested-gecko-diet-8oz` | Complete Crested Gecko Diet – 8 oz | `/products/crested-gecko-diet-8oz-1.webp` | MISMATCH | **MISMATCH** | Shows a gecko, not the powdered diet |
| `tortoise-diet-pellets` | Grassland Tortoise Diet Pellets | `/products/tortoise-diet-pellets-1.webp` | MISMATCH | **OK** | Replaced: Tortoise eating dry pellet food from a bowl _(representative)_ |
| `t5-ho-uvb-6-22in` | T5 HO UVB 6% Tube – 22 in | `/products/t5-ho-uvb-6-22in-1.webp` | OK | **OK** | T5/T8/T12 fluorescent tubes |
| `t5-ho-uvb-12-34in` | T5 HO UVB 12% Tube – 34 in | `/products/t5-ho-uvb-12-34in-1.webp` | OK | **OK** | T5/T8/T12 fluorescent tubes |
| `t8-uvb-5-18in` | T8 UVB 5% Tube – 18 in | `/products/t8-uvb-5-18in-1.webp` | OK | **OK** | T5/T8/T12 fluorescent tubes |
| `t5-ho-fixture-22in` | T5 HO Reflector Fixture – 22 in | `/products/t5-ho-fixture-22in-1.webp` | MISMATCH | **OK** | Replaced: Wall-mounted linear fluorescent tube fixture switched on _(representative)_ |
| `t5-ho-fixture-34in` | T5 HO Reflector Fixture – 34 in | `/products/t5-ho-fixture-34in-1.webp` | MISMATCH | **OK** | Replaced: Slim linear fluorescent light fixture glowing on a dark wall _(representative)_ |
| `halogen-basking-bulb-50w` | Halogen Basking Flood Bulb – 50 W | `/products/halogen-basking-bulb-50w-1.webp` | OK | **OK** | Halogen reflector bulbs |
| `halogen-basking-bulb-100w` | Halogen Basking Flood Bulb – 100 W | `/products/halogen-basking-bulb-100w-1.webp` | OK | **OK** | PAR38 flood bulb |
| `deep-dome-lamp-fixture` | Deep Dome Lamp Fixture – 8.5 in | `/products/deep-dome-lamp-fixture-1.webp` | LOW QUALITY | **OK** | Replaced: Dome reflector heat lamp shining down on a turtle basking on a rock _(representative)_ |
| `ceramic-heat-emitter-100w` | Ceramic Heat Emitter – 100 W | `/products/ceramic-heat-emitter-100w-1.webp` | MISMATCH | **MISMATCH** | Industrial outdoor space heater, not a ceramic bulb |
| `ceramic-heat-emitter-150w` | Ceramic Heat Emitter – 150 W | `/products/ceramic-heat-emitter-150w-1.webp` | MISMATCH | **MISMATCH** | Industrial outdoor space heater, not a ceramic bulb |
| `deep-heat-projector-80w` | Deep Heat Projector – 80 W | `/products/deep-heat-projector-80w-1.webp` | MISMATCH | **OK** | Replaced: Red-tinted infrared reflector heat bulb _(representative)_ |
| `heat-mat-small` | Under-Tank Heat Mat – Small (8 W) | `/products/heat-mat-small-1.webp` | MISMATCH | **MISMATCH** | Heated seat cushion |
| `heat-mat-large` | Under-Tank Heat Mat – Large (24 W) | `/products/heat-mat-large-1.webp` | MISMATCH | **MISMATCH** | Underfloor heating cable on a building site |
| `proportional-thermostat` | Proportional Thermostat with Day/Night | `/products/proportional-thermostat-1.webp` | MISMATCH | **MISMATCH** | Home heating wall thermostat |
| `on-off-thermostat` | On/Off Thermostat | `/products/on-off-thermostat-1.webp` | MISMATCH | **MISMATCH** | Boiler control panel |
| `dimming-thermostat` | Dimming Thermostat | `/products/dimming-thermostat-1.webp` | MISMATCH | **MISMATCH** | Home HVAC wall thermostat |
| `digital-lighting-timer` | Digital Dual-Outlet Lighting Timer | `/products/digital-lighting-timer-1.webp` | MISMATCH | **MISMATCH** | Mechanical single-outlet timers; product is digital dual-outlet |
| `normal-ball-python` | Ball Python – Normal (Classic) | `/products/normal-ball-python-1.webp` | OK | **OK** | Normal ball python |
| `pastel-ball-python` | Ball Python – Pastel | `/products/pastel-ball-python-1.webp` | OK | **OK** | Pastel ball python (1000 px) |
| `banana-ball-python` | Ball Python – Banana | `/products/banana-ball-python-1.webp` | MISMATCH | **OK** | Replaced: Banana ball python with pale yellow and lavender pattern and scattered dark freckles on a white background |
| `piebald-ball-python` | Ball Python – Piebald | `/products/piebald-ball-python-1.webp` | OK | **OK** | Piebald ball python |
| `clown-ball-python` | Ball Python – Clown | `/products/clown-ball-python-1.webp` | MISMATCH | **MISMATCH** | Normal-pattern ball python; 988 px |
| `axanthic-ball-python` | Ball Python – Axanthic | `/products/axanthic-ball-python-1.webp` | OK | **OK** | Axanthic ball python |
| `mojave-ball-python` | Ball Python – Mojave | `/products/mojave-ball-python-1.webp` | OK | **OK** | Mojave ball python |
| `okeetee-corn-snake` | Corn Snake – Okeetee (Normal) | `/products/okeetee-corn-snake-1.webp` | OK | **OK** | Okeetee corn snake |
| `amelanistic-corn-snake` | Corn Snake – Amelanistic (Amel) | `/products/amelanistic-corn-snake-1.webp` | LOW QUALITY | **OK** | Replaced: Amelanistic corn snake with orange-red saddles outlined in white, resting on sand |
| `snow-corn-snake` | Corn Snake – Snow | `/products/snow-corn-snake-1.webp` | MISMATCH | **OK** | Replaced: Pink and white snow corn snake with red eyes coiled on the ground _(representative)_ |
| `anerythristic-corn-snake` | Corn Snake – Anerythristic | `/products/anerythristic-corn-snake-1.webp` | OK | **OK** | Anerythristic corn snake head |
| `california-kingsnake` | California Kingsnake – Banded | `/products/california-kingsnake-1.webp` | OK | **OK** | Banded California kingsnake |
| `mexican-black-kingsnake` | Mexican Black Kingsnake | `/products/mexican-black-kingsnake-1.webp` | LOW QUALITY | **OK** | Replaced: Glossy jet-black Mexican black kingsnake coiled on aspen bedding |
| `florida-kingsnake` | Florida Kingsnake | `/products/florida-kingsnake-1.webp` | OK | **OK** | Florida kingsnake |
| `honduran-milk-snake` | Honduran Milk Snake – Tricolor | `/products/honduran-milk-snake-1.webp` | LOW QUALITY | **OK** | Replaced: Tricolor Honduran milk snake with bold red, black and orange bands coiled on wood chips |
| `pueblan-milk-snake` | Pueblan Milk Snake | `/products/pueblan-milk-snake-1.webp` | LOW QUALITY | **OK** | Replaced: Pueblan milk snake with red, black and cream bands coiled on moss beside a clutch of eggs |
| `western-hognose-snake` | Western Hognose Snake – Normal | `/products/western-hognose-snake-1.webp` | OK | **OK** | Western hognose |
| `albino-western-hognose` | Western Hognose Snake – Albino | `/products/albino-western-hognose-1.webp` | MISMATCH | **MISMATCH** | Normal-colored hognose, not albino |
| `rosy-boa` | Rosy Boa – Mexican Locality | `/products/rosy-boa-1.webp` | OK | **OK** | Rosy boa |
| `kenyan-sand-boa` | Kenyan Sand Boa | `/products/kenyan-sand-boa-1.webp` | OK | **OK** | Kenyan sand boa |
| `leopard-gecko-normal` | Leopard Gecko – Normal | `/products/leopard-gecko-normal-1.webp` | OK | **OK** | Wild-type leopard gecko |
| `leopard-gecko-tangerine` | Leopard Gecko – Tangerine | `/products/leopard-gecko-tangerine-1.webp` | OK | **OK** | Tangerine leopard gecko |
| `leopard-gecko-mack-snow` | Leopard Gecko – Mack Snow | `/products/leopard-gecko-mack-snow-1.webp` | LOW QUALITY | **OK** | Replaced: Pale leopard gecko with fine black spots resting on cork bark _(representative)_ |
| `crested-gecko-harlequin` | Crested Gecko – Harlequin | `/products/crested-gecko-harlequin-1.webp` | OK | **OK** | Crested gecko |
| `crested-gecko-dalmatian` | Crested Gecko – Dalmatian | `/products/crested-gecko-dalmatian-1.webp` | MISMATCH | **OK** | Replaced: Yellow crested gecko with black dalmatian-style spots on its head and side _(representative)_ |
| `crested-gecko-flame` | Crested Gecko – Flame | `/products/crested-gecko-flame-1.webp` | OK | **OK** | Flame crested gecko |
| `gargoyle-gecko-reticulated` | Gargoyle Gecko – Reticulated | `/products/gargoyle-gecko-reticulated-1.webp` | OK | **OK** | Reticulated gargoyle gecko |
| `gargoyle-gecko-red-stripe` | Gargoyle Gecko – Red Stripe | `/products/gargoyle-gecko-red-stripe-1.webp` | OK | **OK** | Red stripe gargoyle gecko |
| `african-fat-tailed-gecko` | African Fat-Tailed Gecko – Normal | `/products/african-fat-tailed-gecko-1.webp` | LOW QUALITY | **LOW QUALITY** | Two small geckos in a cluttered zoo display |
| `african-fat-tailed-gecko-whiteout` | African Fat-Tailed Gecko – Whiteout | `/products/african-fat-tailed-gecko-whiteout-1.webp` | MISMATCH | **MISMATCH** | Normal fat-tailed geckos (same photo), not whiteout |
| `bearded-dragon-normal` | Bearded Dragon – Normal | `/products/bearded-dragon-normal-1.webp` | OK | **OK** | Bearded dragon |
| `bearded-dragon-hypo-red` | Bearded Dragon – Hypo Red | `/products/bearded-dragon-hypo-red-1.webp` | OK | **OK** | Hypo red bearded dragon |
| `northern-blue-tongued-skink` | Northern Blue-Tongued Skink | `/products/northern-blue-tongued-skink-1.webp` | OK | **OK** | Blue-tongued skink |
| `ackie-monitor` | Ackie Monitor – Red | `/products/ackie-monitor-1.webp` | OK | **OK** | Red ackie monitors |
| `argentine-tegu` | Argentine Black & White Tegu | `/products/argentine-tegu-1.webp` | OK | **OK** | Argentine black and white tegu |
| `mali-uromastyx` | Mali Uromastyx | `/products/mali-uromastyx-1.webp` | OK | **OK** | Mali uromastyx |
| `saharan-uromastyx` | Saharan Uromastyx – Red | `/products/saharan-uromastyx-1.webp` | OK | **OK** | Red Saharan uromastyx |
| `veiled-chameleon-male` | Veiled Chameleon – Male | `/products/veiled-chameleon-male-1.webp` | OK | **OK** | Male veiled chameleon |
| `veiled-chameleon-female` | Veiled Chameleon – Female | `/products/veiled-chameleon-female-1.webp` | OK | **OK** | Female veiled chameleon |
| `panther-chameleon-ambilobe` | Panther Chameleon – Ambilobe | `/products/panther-chameleon-ambilobe-1.webp` | OK | **OK** | Ambilobe panther chameleon |
| `red-footed-tortoise` | Red-Footed Tortoise | `/products/red-footed-tortoise-1.webp` | OK | **OK** | Red-footed tortoise |
| `russian-tortoise` | Russian Tortoise | `/products/russian-tortoise-1.webp` | OK | **OK** | Russian tortoise |
| `hermanns-tortoise` | Hermann's Tortoise – Eastern | `/products/hermanns-tortoise-1.webp` | OK | **OK** | Hermann's tortoise |
| `coco-fiber-brick-3-pack` | Coco Fiber Substrate Brick – 3 Pack | `/products/coco-fiber-brick-3-pack-1.webp` | MISMATCH | **MISMATCH** | Warehouse stacks of coir bales, not bricks |
| `bioactive-soil-tropical-8qt` | Tropical Bioactive Soil Mix – 8 qt | `/products/bioactive-soil-tropical-8qt-1.webp` | OK | **OK** | Dark soil mix |
| `arid-bioactive-substrate-10qt` | Arid Bioactive Substrate – 10 qt | `/products/arid-bioactive-substrate-10qt-1.webp` | OK | **OK** | Sandy soil |
| `cypress-mulch-24qt` | Cypress Mulch Substrate – 24 qt | `/products/cypress-mulch-24qt-1.webp` | OK | **OK** | Cypress mulch |
| `sphagnum-moss-long-fiber` | Long-Fiber Sphagnum Moss | `/products/sphagnum-moss-long-fiber-1.webp` | MISMATCH | **OK** | Replaced: Dried long-fiber moss in a bowl _(representative)_ |
| `leaf-litter-mix` | Oak & Magnolia Leaf Litter | `/products/leaf-litter-mix-1.webp` | OK | **OK** | Leaf litter |
| `cork-bark-flat-medium` | Cork Bark Flat – Medium | `/products/cork-bark-flat-medium-1.webp` | OK | **OK** | Cork bark slabs |
| `cork-round-tube` | Cork Round Tube – Medium | `/products/cork-round-tube-1.webp` | OK | **OK** | Curved cork bark |
| `half-log-hide-large` | Half Log Hide – Large | `/products/half-log-hide-large-1.webp` | MISMATCH | **OK** | Replaced: Snake curled up inside a hollow cork log hide among plants _(representative)_ |
| `humid-hide-cave` | Humid Hide Cave with Lid | `/products/humid-hide-cave-1.webp` | MISMATCH | **OK** | Replaced: Leopard gecko peeking out of a rock-look reptile hide cave _(representative)_ |
| `grapevine-branches-3-pack` | Grapevine Branches – 3 Pack | `/products/grapevine-branches-3-pack-1.webp` | OK | **OK** | Grapevine wood |
| `artificial-pothos-vine` | Artificial Pothos Hanging Vine | `/products/artificial-pothos-vine-1.webp` | OK | **OK** | Pothos leaves |
| `ceramic-water-dish-large` | Ceramic Water Dish – Large | `/products/ceramic-water-dish-large-1.webp` | OK | **OK** | Ceramic bowl |
| `basking-rock-ledge` | Basking Rock Ledge | `/products/basking-rock-ledge-1.webp` | MISMATCH | **OK** | Replaced: Bearded dragon resting on a flat basking rock inside a warm-lit enclosure _(representative)_ |
