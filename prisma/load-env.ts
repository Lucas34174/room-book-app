import fs from 'fs'
import path from 'path'

// Load environment variables from .env and .env.local
const envPaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), '.env.local')
]

envPaths.forEach(envPath => {
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8')
        content.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/)
            if (match) {
                const key = match[1]
                let value = match[2] || ''
                // Remove quotes if present
                if (value.startsWith('"') && value.endsWith('"')) {
                    value = value.slice(1, -1)
                } else if (value.startsWith("'") && value.endsWith("'")) {
                    value = value.slice(1, -1)
                }
                process.env[key] = value
            }
        })
    }
})
