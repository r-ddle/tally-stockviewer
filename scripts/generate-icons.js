#!/usr/bin/env node
const sharp = require('sharp')
const fs = require('fs')
const path = require('path')

const INPUT_FILE = path.join(__dirname, '../public/VamosApp.png')
const OUTPUT_DIR = path.join(__dirname, '../public/icons')

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

// Icon sizes to generate
const sizes = [192, 256, 384, 512]

async function generateIcons() {
  try {
    console.log('Generating app icons from VamosApp.png...')

    // Generate regular icons
    for (const size of sizes) {
      await sharp(INPUT_FILE)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `icon-${size}.png`))
      console.log(`✓ Created icon-${size}.png`)
    }

    // Generate maskable icons (for adaptive icons on Android)
    for (const size of [192, 512]) {
      await sharp(INPUT_FILE)
        .resize(Math.round(size * 0.8), Math.round(size * 0.8), {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(path.join(OUTPUT_DIR, `icon-${size}-maskable.png`))
      console.log(`✓ Created icon-${size}-maskable.png`)
    }

    // Generate favicon
    await sharp(INPUT_FILE)
      .resize(32, 32, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(__dirname, '../public/favicon.png'))
    console.log(`✓ Created favicon.png`)

    // Generate screenshots for manifest
    // Narrow (mobile) screenshot
    await sharp(INPUT_FILE)
      .resize(540, 720, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, `screenshot-540.png`))
    console.log(`✓ Created screenshot-540.png`)

    // Wide (desktop) screenshot
    await sharp(INPUT_FILE)
      .resize(1280, 720, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 1 }
      })
      .png()
      .toFile(path.join(OUTPUT_DIR, `screenshot-1280.png`))
    console.log(`✓ Created screenshot-1280.png`)

    console.log('\n✅ All icons generated successfully!')
  } catch (error) {
    console.error('❌ Error generating icons:', error)
    process.exit(1)
  }
}

generateIcons()
