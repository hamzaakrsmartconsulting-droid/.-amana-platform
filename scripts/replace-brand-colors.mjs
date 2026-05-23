import fs from 'fs'
import path from 'path'

const exts = ['.ts', '.tsx', '.css', '.html', '.mjs']
const map = [
  ['#353b32', '#353b32'],
  ['#353b32', '#353b32'],
  ['#6d7368', '#6d7368'],
  ['#6d7368', '#6d7368'],
  ['rgba(68,75,63,', 'rgba(68,75,63,'],
  ['rgba(68,75,63,', 'rgba(68,75,63,'],
  ['#a8ada6', '#a8ada6'],
]

let count = 0

function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', '.next'].includes(ent.name)) continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p)
    else if (exts.includes(path.extname(ent.name))) {
      let s = fs.readFileSync(p, 'utf8')
      const orig = s
      for (const [a, b] of map) s = s.split(a).join(b)
      if (s !== orig) {
        fs.writeFileSync(p, s, 'utf8')
        count++
        console.log(p)
      }
    }
  }
}

walk('.')
console.log('Updated', count, 'files')
