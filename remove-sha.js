const fs = require('fs')
const path = require('path')

async function removeSha256Files(folderPath) {
  const entries = await fs.promises.readdir(folderPath, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(folderPath, entry.name)
    if (entry.isDirectory()) {
      await removeSha256Files(fullPath)
    } else if (entry.isFile()) {
      if (entry.name.endsWith('.Identifier')) {
        await fs.promises.unlink(fullPath)
        console.log(`Usunięto plik ${entry.name}`)
      }
    }
  }
}

// Przykład użycia
const folderPath = process.argv[2] || './test-folder'
removeSha256Files(folderPath)
  .then(() => {
    console.log('Gotowe: usunięto wszystkie pliki .sha256')
  })
  .catch(console.error)
