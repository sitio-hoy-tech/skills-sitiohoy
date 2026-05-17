---
name: seo-image-gen
description: "SEO image specifications: OG/social preview images, blog hero images, schema images, product photography, infographics. Provides sizes, alt text, OG meta, file naming conventions, and optimization guidelines. Use when user says \"generate image\", \"OG image\", \"social preview\", \"hero image\", \"blog image\", \"product photo\", \"infographic\", \"seo image\", \"create visual\", \"image-gen\", \"favicon\", \"schema image\", \"pinterest pin\", \"generate visual\", \"banner\", or \"thumbnail\"."
argument-hint: "[og|hero|product|infographic|custom|batch] <description>"
user-invokable: true
license: MIT
compatibility: "Any AI model with image generation capabilities"
metadata:
  author: AgriciDaniel
  version: "2.0.0"
  category: seo
---

# SEO Image Gen: Image Specifications for SEO Assets

Provide production-ready image specifications for SEO use cases. Maps SEO needs
to optimized aspect ratios, resolution defaults, file naming, alt text, and meta tags.
The AI model generates images directly when image generation tools are available.

## Architecture Note

This skill has two components with distinct roles:
- **SKILL.md** (this file): Handles interactive `/seo image-gen` commands — provides specifications and generates images when tools are available
- **Agent** (`agents/seo-image-gen.md`): Audit-only analyst spawned during `/seo audit` to assess existing OG/social images and produce a generation plan (never auto-generates)

## Quick Reference

| Command | What it does |
|---------|-------------|
| `/seo image-gen og <description>` | OG/social preview image specs (1200x630) |
| `/seo image-gen hero <description>` | Blog hero image specs (widescreen, dramatic) |
| `/seo image-gen product <description>` | Product photography specs (clean, white BG) |
| `/seo image-gen infographic <description>` | Infographic visual specs (vertical, data-heavy) |
| `/seo image-gen custom <description>` | Custom image with full Creative Director pipeline |
| `/seo image-gen batch <description> [N]` | Generate N variations (default: 3) |

## SEO Image Use Cases

Each use case maps to pre-configured parameters:

| Use Case | Aspect Ratio | Resolution | Notes |
|----------|-------------|------------|-------|
| **OG/Social Preview** | `16:9` | 1200x630 | Clean, professional, text-friendly |
| **Blog Hero** | `16:9` | 1920x1080 | Dramatic, atmospheric, editorial quality |
| **Schema Image** | `4:3` | 1200x900 | Clean, descriptive, schema ImageObject |
| **Social Square** | `1:1` | 1080x1080 | Platform-optimized square |
| **Product Photo** | `4:3` | 1600x1200 | White background, studio lighting |
| **Infographic** | `2:3` | 1200x1800 | Data-heavy, vertical layout |
| **Favicon/Icon** | `1:1` | 512x512 | Minimal, scalable, recognizable |
| **Pinterest Pin** | `2:3` | 1000x1500 | Tall vertical card |

## Generation Pipeline

For every generation request:

1. **Identify use case** from command or context (og, hero, product, etc.)
2. **Apply SEO defaults** from the use cases table above
3. **Construct prompt** using the Creative Director pipeline:
   - Load `references/prompt-engineering.md` for the 6-component system
   - Apply domain mode emphasis (Subject 30%, Style 25%, Context 15%, etc.)
   - Be SPECIFIC and VISCERAL: describe what the camera sees
4. **Generate** using available image generation tools
5. **Post-generation SEO checklist** (see below)

## Post-Generation SEO Checklist

After every successful generation, guide the user on:

1. **Alt text**: Write descriptive, keyword-rich alt text for the generated image
2. **File naming**: Rename to SEO-friendly format: `keyword-description-widthxheight.webp`
3. **WebP conversion**: Convert to WebP for optimal page speed:
   ```bash
   magick output.png -quality 85 output.webp
   ```
4. **File size**: Target under 200KB for hero images, under 100KB for thumbnails
5. **Schema markup**: Suggest `ImageObject` schema for the generated image:
   ```json
   {
     "@type": "ImageObject",
     "url": "https://example.com/images/keyword-description.webp",
     "width": 1200,
     "height": 630,
     "caption": "Descriptive caption with target keyword"
   }
   ```
6. **OG meta tags**: For social preview images, remind about:
   ```html
   <meta property="og:image" content="https://example.com/images/og-image.webp" />
   <meta property="og:image:width" content="1200" />
   <meta property="og:image:height" content="630" />
   <meta property="og:image:alt" content="Descriptive alt text" />
   ```

## Cost Awareness

Image generation costs vary by model and provider. Be transparent:
- Show estimated cost before generating (especially for batch)
- Costs are model-dependent — refer to the provider's pricing documentation

## Error Handling

| Error | Resolution |
|-------|-----------|
| Image generation tools unavailable | Provide specifications only; user generates externally |
| Safety filter blocked | Rephrase prompt — see `references/prompt-engineering.md` Safety section |
| Rate limited | Wait and retry |

## Cross-Skill Integration

- **seo-images** (analysis) feeds into **seo-image-gen** (generation): audit results from `/seo images` identify missing or low-quality images; use those findings to drive `/seo image-gen` commands
- **seo-audit** spawns the seo-image-gen **agent** (not this skill) to analyze OG/social images across the site and produce a prioritized generation plan
- **seo-schema** can consume generated images: after generation, suggest `ImageObject` schema markup pointing to the new assets

## Reference Documentation

Load on-demand. Do NOT load all at startup:
- `references/prompt-engineering.md`: 6-component system, domain modes, templates
- `references/post-processing.md`: ImageMagick/FFmpeg pipeline recipes
- `references/cost-tracking.md`: Pricing, usage tracking
- `references/presets.md`: Brand preset management
- `references/seo-image-presets.md`: SEO-specific preset templates

## Response Format

After generating, always provide:
1. **Image path**: where it was saved
2. **Crafted prompt**: show what was sent to the model (educational)
3. **Settings**: aspect ratio, resolution
4. **SEO checklist**: alt text suggestion, file naming, WebP conversion
5. **Schema snippet**: ImageObject or og:image markup if applicable
