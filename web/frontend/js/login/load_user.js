function load_user(id, username){
  setInterval(function(){
    load_player_stats(id, username);
  },5000);
}

function test(obj){
  console.log(obj)
}

function load_player_stats(id, username){
const rand_id = Math.random().toString(26).slice(2)
const http_req = new XMLHttpRequest()
  const url=`/coins/${id}`
  http_req.open("GET", url)
  http_req.send()
  http_req.onreadystatechange = (e) => {
    document.getElementById("coins").innerText = `Coins: ${http_req.responseText}`
  }
  document.getElementById("user").innerText = `Username: ${username}`
  document.getElementById("avatar").src = `/avatar/${id}?keys=${rand_id}`
  document.getElementById("avatar").style.display = "block"
}