const http = require('http')
const dns = require('node-named')
const httpPort = 3000
const dnsPort = 53430

const dnsServer = dns.createServer()

const express = require('express')
const app = express()
//app.use(express.static('public'))

dnsServer.listen(dnsPort, '::ffff:0.0.0.0', ()=> {
  console.log(`DNS Server is listening on ${dnsPort}`)
})

app.get('/', (req, res) => {
  res.sendFile('public/index.html' , { root : __dirname});
})

app.get('/attack', (req, res) => {
  const script = new Buffer(req.query.script, 'base64').toString('ascii')
  res.end(`
    <html>
      <script>
        ${script} 
      </script>
    </html>
  `)
})

app.listen(3000, () => {
  console.log('app listening on port 3000!')
})
