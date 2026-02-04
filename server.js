const express = require('express')
const path = require('path')

const app = express()
const port = process.env.PORT || 3000

app.use(express.json())
app.use(express.static(path.join(__dirname)))

// Health
app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Simple API to get leaderboard (persistent for demo in memory)
let leaderboard = {}
app.get('/api/leaderboard', (req, res) => {
  // return sorted array
  const rows = Object.entries(leaderboard).map(([addr,bal])=>({addr,bal}))
    .sort((a,b)=>b.bal - a.bal)
  res.json(rows)
})

app.post('/api/leaderboard', (req, res) => {
  const { addr, bal } = req.body
  if(!addr || typeof bal !== 'number') return res.status(400).json({ error: 'addr and bal required' })
  leaderboard[addr] = (leaderboard[addr]||0) + bal
  res.json({ ok: true })
})

app.listen(port, ()=>console.log(`Server running on http://localhost:${port}`))
