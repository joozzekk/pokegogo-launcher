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
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name)
    if (entry.isDirectory()) {
      await generateHashesForFolder(fullPath)
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.sha256')) {
        // Pomijaj pliki kończące się na .sha256
        continue
      }
      const hash = await getFileHash(fullPath)
      const hashFilePath = fullPath + '.sha256'
      await fs.promises.writeFile(hashFilePath, hash, 'utf8')
      console.log(`Wygenerowano hash dla pliku ${entry.name} -> ${hashFilePath}`)
    }
  }
}

// Przykład użycia
const folderPath = process.argv[2] || './test-folder'
generateHashesForFolder(folderPath)
  .then(() => {
    console.log('Gotowe: wygenerowano pliki .sha256 dla wszystkich plików')
  })
  .catch(console.error)
