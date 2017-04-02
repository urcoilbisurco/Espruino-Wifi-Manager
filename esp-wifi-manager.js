const wifi = require('Wifi');
var f = new (require("FlashEEPROM"))();

let parseRequestData = function(str){
  return str.split("&").reduce(function(prev, curr, i, arr) {
    var p = curr.split("=");
    prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
    return prev;
  }, {});
}

let handleRequest=function(req, res) {
  print(process.memory());
  if (req.method=="POST"){
    obj=parseRequestData(req.read())
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(`<html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body *{padding:8px;display:block;}</style><div><h1>Thank you.</h1><h2>You can now close this page and restore your Wi-Fi connection.</h2></div></html>`);
    setTimeout(function(){
      wifi.stopAP();
      start_wifi(obj.ssid, obj.pssw);
      digitalWrite(D2, false)
    }, 3000)
  }else{
    wifi.scan(function(ns){
      print(process.memory());
      var out=`
      <html><meta name="viewport" content="width=device-width, initial-scale=1"><style>body *{font-size:24px;padding:8px;display:block;}</style><body>`
      out = out+`<form method="POST" action="/"><label for="s">Choose Wifi</label><select name="ssid" id="s">`
      out=out+ns.map(function(n) {
        return '<option value="'+n.ssid+'">'+n.ssid+'</option>';
      });
      print(process.memory());
      out=out+`</select><label for="p">Password</label><input id="p" name="pssw" type="password"/><input type="submit" value="Save"></form>`;
      out=out+"</body></html>"
      //console.log("connected...");
      print(process.memory());
      res.writeHead(200, {'Content-Type':'text/html'});
      res.end(out);
    });
  }
}

//start AP and web server
let onWifiError=function(){
  console.log("ERROR wifi")
  print(process.memory());
  wifi.setHostname("aurora")
  wifi.startAP("aurora", {}, function(err){
    if(err) {
        console.log("An error has occured :( ", err.message);
    } else {
      require("http").createServer(handleRequest).listen(80);
      console.log("Visit http://" + wifi.getIP().ip, "in your web browser.");
      print(process.memory());
    }
  })
}
let check_wifi=function(){
  var timer=setInterval(function(){
    wifi.getDetails(function(obj){
      console.log("status:", obj.status)
      if(obj.status=="no_ap_found" || obj.status=="wrong_password" || obj.status=="off" || obj.status=="connect_failed"){
        //can't find saved WIFI, creating access point
        onWifiError()
        clearInterval(timer);
      }
      if(obj.status=="connected"){
        console.log(`Connected to: ${ wifi.getIP().ip }`)
        clearInterval(timer);
      }
    })
  }, 1000)
}

let start_wifi=function(ssid, passw, callback){
  check_wifi();
  console.log("start_wifi");
  if(ssid){
    wifi.connect(ssid, { password: passw}, function(error) {
      if(error){
        //Bad Password
        onWifiError();
      }else{
        console.log(`Connected to: ${ wifi.getIP().ip }`)
        if(callback){
          callback()
        }else{
          f.write(0, ssid);
          f.write(1, passw);
          //I have the right ssid and pass, reboot
          console.log("rebooting...")
          load()
        }
      }
    });
  }

}
const read=function(pos){
  let p=f.read(pos);
  return (p!=undefined ? E.toString(p) : undefined)
}

export default conn=function(callback){
  digitalWrite(D2, false)
  let ssid=read(0);
  let pass=read(1);
  start_wifi(ssid, pass, function(){
    digitalWrite(D2, true);
    callback()
  })
 //  console.log("WIFI");
 //  print(process.memory());
 //  console.log("ssid", ssid)
 //  console.log("pass", ssid)
 //  if(ssid){
 //    console.log("HERE?");
 //    wifi.connect(ssid, { password: pass }, function(e){
 //      console.log("connected");
 //      if (e){
 //        onWifiError(e)
 //      }else{
 //        console.log("connected");
 //        digitalWrite(D2, true)
 //        callback()
 //      }
 //   });
 // }
}
