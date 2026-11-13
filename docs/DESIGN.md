# VoiceGuard interface design

## Visual system

Use dark navy surfaces, cyan `#00e0ee`, pink `#ff2daa`, and supporting purple.
VoiceGuard wordmarks use bold, static VOICE/GUARD coloring; do not restore glitch
or jitter effects. Reuse the five-bar logo and self-hosted Manrope font.

The homepage uses editorial sections, an interactive signal illustration,
project sample playback, model tabs, workflow guidance, FAQs, and a large footer
wordmark with grouped links. Illustrations must not appear to be real inference.

## Dashboard

Pair desktop panels with matching row edges. Let the actual wave stage fill
extra space rather than adding empty padding. Stack panels on narrow screens.
Keep detection-engine identity, score warnings, and functional recording controls.
The decision-threshold card is intentionally omitted from results.

## Interaction and accessibility

Use native buttons, labels, keyboard support, visible focus, and adequate touch
targets. Scroll reveals must leave content accessible if scripts fail and honor
reduced-motion preferences. Liquid backgrounds stay fixed behind content with
pointer events disabled. Paused audio traces settle to a flat line.

Relevant assets: `voiceguard_addon/assets/homepage.css`, `refinements.css`,
`presentation.css`, `liquid-background.css`, and their accompanying scripts.
