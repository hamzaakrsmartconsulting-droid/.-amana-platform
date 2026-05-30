import fs from 'fs'
import pngToIco from 'png-to-ico'

const buf = await pngToIco(['app/icon.png'])
fs.writeFileSync('public/favicon.ico', buf)
console.log('Wrote public/favicon.ico', buf.length, 'bytes')
