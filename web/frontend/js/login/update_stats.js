function update_stats(){
    const http_req = new XMLHttpRequest()
    const url=`/stats`
    http_req.open("GET", url)
    http_req.send()
    http_req.onreadystatechange = (e) => {
      document.getElementById("server_stats").innerText = `Players online: ${http_req.responseText}`
    }
  }
  
  setInterval(function(){
    update_stats();
  },5000);