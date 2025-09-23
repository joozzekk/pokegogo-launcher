const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

async function getFileHash(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256')
    const stream = fs.createReadStream(filePath)
    stream.on('data', (data) => hash.update(data))
    stream.on('end', () => resolve(hash.digest('hex')))
    stream.on('error', reject)
  })
}

async function generateHashesForFolder(folderPath) {
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
  const hashes = []

  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name)

    if (entry.isDirectory()) {
      // Rekurencja: generujemy plik w podfolderze
      await generateHashesForFolder(fullPath)
    } else if (entry.isFile()) {
      if (entry.name === 'hashes.txt' || entry.name.endsWith('.sha256')) {
        // Pomijamy plik wynikowy i stare pliki .sha256
        continue
      }
      const hash = await getFileHash(fullPath)
      // Dodajemy wpis: nazwa pliku + hash
      hashes.push(`${entry.name} ${hash}`)
    }
  }

  if (hashes.length > 0) {
    const hashFilePath = path.join(folderPath, 'hashes.txt')
    // Zapisujemy jeden plik tekstowy z listą "nazwa pliku + hash"
    await fs.promises.writeFile(hashFilePath, hashes.join('\n'), 'utf8')
    console.log(`Wygenerowano plik hashów: ${hashFilePath}`)
  }
}

// Przykład użycia z argumentem np. "node script.js ./test-folder"
const folderPath = process.argv[2] || './test-folder'
generateHashesForFolder(folderPath)
  .then(() => console.log('Gotowe: wygenerowano pliki hashów w folderach.'))
  .catch(console.error)
