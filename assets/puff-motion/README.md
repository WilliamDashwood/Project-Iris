# Puff desk animation

15 transparent PNG poses: an eight-pose walk loop followed by seven jump/landing poses.
Six additional walk poses were generated using the built-in image generator, using the original walking Puff as the identity and composition anchor.

The walk sequence is defined in `poses.js`. Art registration uses nose coordinates and measured foot baselines from the original 1254px canvases. Published PNGs are 512px square and keep their alpha channels.

`motion-core.js` centralizes timing, pose selection, arc movement and foot registration. `page2.js` preloads every pose before autoplay, supports replay, pauses in hidden tabs and honors `prefers-reduced-motion` by showing the settled pose.

The room retains the warm desk concept and its laptop, notebook, phone, pen, note, ticket, coffee cup, books, vase, wall picture and shelf. It uses a fixed 2D scene plane so Puff remains upright and consistent through the jump.

Open `page2.html` through a local web server or GitHub Pages. The first page's existing door interaction is unchanged.
