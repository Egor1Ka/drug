import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

// Regenerates the favicon set in /public from public/favicon.svg (the flame
// mark cropped out of the brand logo). Run after the logo changes:
//
//   pnpm generate:favicons
//
// The .ico is assembled by hand because sharp has no ICO encoder — the format
// allows whole PNG files as entries, so the container is a 6-byte header plus
// one 16-byte directory record per size.

const PUBLIC_DIR = path.resolve(process.cwd(), 'public')
const SOURCE = path.join(PUBLIC_DIR, 'favicon.svg')

// Transparent PNGs for browsers and Android; the Apple icon is flattened onto
// white because iOS renders the home-screen tile without alpha.
const PNG_TARGETS = [
  { background: null, name: 'icon-192.png', size: 192 },
  { background: null, name: 'icon-512.png', size: 512 },
  { background: '#ffffff', name: 'apple-touch-icon.png', size: 180 },
]

const ICO_SIZES = [16, 32, 48]

const renderPng = async (source: Buffer, size: number, background: string | null) => {
  const base = sharp(source, { density: 512 }).resize(size, size, {
    background: { alpha: 0, b: 0, g: 0, r: 0 },
    fit: 'contain',
  })

  const withBackground = background ? base.flatten({ background }) : base

  return withBackground.png().toBuffer()
}

const writePngTarget = (source: Buffer) => async (target: (typeof PNG_TARGETS)[number]) => {
  const data = await renderPng(source, target.size, target.background)

  await writeFile(path.join(PUBLIC_DIR, target.name), data)

  return `${target.name} (${target.size}px, ${Math.round(data.length / 1024)} KB)`
}

// ICO directory entry: width, height, palette, reserved, planes, bpp,
// byte length, offset. A size of 256 is encoded as 0.
const toIconDirEntry = (size: number, byteLength: number, offset: number) => {
  const entry = Buffer.alloc(16)

  entry.writeUInt8(size >= 256 ? 0 : size, 0)
  entry.writeUInt8(size >= 256 ? 0 : size, 1)
  entry.writeUInt8(0, 2)
  entry.writeUInt8(0, 3)
  entry.writeUInt16LE(1, 4)
  entry.writeUInt16LE(32, 6)
  entry.writeUInt32LE(byteLength, 8)
  entry.writeUInt32LE(offset, 12)

  return entry
}

const buildIco = (images: { data: Buffer; size: number }[]) => {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(images.length, 4)

  const firstOffset = header.length + images.length * 16

  const collectEntries = (
    acc: { entries: Buffer[]; offset: number },
    image: { data: Buffer; size: number },
  ) => ({
    entries: [...acc.entries, toIconDirEntry(image.size, image.data.length, acc.offset)],
    offset: acc.offset + image.data.length,
  })

  const { entries } = images.reduce(collectEntries, { entries: [], offset: firstOffset })

  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)])
}

const renderIcoImage = (source: Buffer) => async (size: number) => ({
  data: await renderPng(source, size, null),
  size,
})

const generateFavicons = async () => {
  const source = await readFile(SOURCE)

  const pngResults = await Promise.all(PNG_TARGETS.map(writePngTarget(source)))
  pngResults.forEach((result) => console.log(`wrote ${result}`))

  const icoImages = await Promise.all(ICO_SIZES.map(renderIcoImage(source)))
  const ico = buildIco(icoImages)

  await writeFile(path.join(PUBLIC_DIR, 'favicon.ico'), ico)
  console.log(`wrote favicon.ico (${ICO_SIZES.join('/')}px, ${Math.round(ico.length / 1024)} KB)`)
}

await generateFavicons()
process.exit(0)
