const wifi = require('Wifi');
const f = new (require("FlashEEPROM"))();

//Library for instant feedback using a led
export L={
  init:(pin)=>{
    L.pin=pin
  },
  write:(w)=>{
    digitalWrite(L.pin,w);
  },
  reset:()=>{
    if(L.i){
      clearInterval(L.i);
      L.i=undefined;
    }
  },
  turn:(s)=>{
    L.reset()
    L.write(!s);
  },
  blink:(times,t=500)=>{
    L.reset();
    L.ledOn=false;
    L.times=0;
    L.i=setInterval(()=>{
      L.write(L.ledOn);
      L.ledOn=!L.ledOn;
      L.times=L.times+1;
      if(L.times==times*2){
        L.reset()
      }
    },t)
  }
}



export default C={
  handleRequest: (req,res)=>{
    if (req.method=="POST") {
      req.on("close", function(){
        obj=C.parse(req.read())
        if(obj.s){
          setTimeout(() => {
            wifi.stopAP();
            C.start_wifi(obj.s, obj.p);
            L.turn(false);
          }, 3000)
        }
      })
      res.writeHead(200);
      res.end(`<html><h2>You can now close this page and restore your Wi-Fi connection.</h2></html>`);
    }else{
      wifi.scan(ns => {
        let out=`<html><style>body *{font-size:24px;padding:8px;display:block;}</style><meta name="viewport" content="width=device-width, initial-scale=1"><form method="POST" action="/"><label for="s">Choose Wifi</label><br/><select name="s" id="s">`
        out=out+ns.map(n => '<option value="'+n.ssid+'">'+n.ssid+'</option>');
        out=out+`</select><label>Password</label><input id="p" name="p" type="text"/><input type="submit" value="save"></form>`;
        out=out+"</html>"
        res.writeHead(200);
        res.end(out);
      });
    }
  },
  parse:(s)=>{
    return s.split("&").reduce((prev, c)=> {
      let p = c.split("=");
      prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
      return prev;
    }, {});
  },
  start_setup:()=>{
    C.reboot=false;
    print(process.memory());
    wifi.setHostname("espruino-wifi")
    wifi.startAP("espruino-wifi", {}, err => {
      require("http").createServer(C.handleRequest).listen(80);
      L.turn(true)
      print(process.memory());
    })
  },
  check_wifi:()=>{
    var ct=setInterval(()=>{
      wifi.getDetails(obj =>{
        console.log(obj.status);
        print(process.memory());
        if(obj.status=="no_ap_found" || obj.status=="wrong_password" || obj.status=="off" || obj.status=="connect_failed"){
          C.error()
          clearInterval(ct);
        }
        if(obj.status=="connected"){
          clearInterval(ct);
        }
      })
    },1000)
  },

  error:()=>{
    console.log("ERROR")
    if(C.pin){
      C.reboot=true;
      print(process.memory());
      L.blink(2, 700);
      setTimeout(()=>{
        if(C.reboot){load()};
      }, 10000)
    }else{
      C.start_setup();
    }
  },
  start_wifi:(ssid, passw, callback)=>{
    C.check_wifi()
    L.turn(true)
    if(ssid){
      wifi.connect(ssid, { password: passw}, function(error) {
        if(error){
          //Bad Password
          C.error();
        }else{
          console.log(`Connected to: ${ wifi.getIP().ip }`)
          if(callback){
            callback()
            L.blink(5)
          }else{
            f.erase();
            f.write(0, ssid);
            f.write(1, passw);
            //I have the right ssid and pass, reboot
            console.log("rebooting...")
            load()

          }
        }
      });
    }
  },
  read:(pos)=>{
    let p=f.read(pos);
    return (p!=undefined ? E.toString(p) : undefined)
  },
  init:(led, cb)=>{
    L.init(led);
    C.check_wifi();
    let ssid=C.read(0)
    let pass=C.read(1)
    console.log("saved ssid:", ssid)
    console.log("saved pass:", pass)
    start_wifi(ssid, pass, function(){
      callback()
    })
    wifi.on("disconnected", C.error);
  },
  setupPin:(pin)=>{
    C.pin=pin;
    pinMode(pin, 'input_pullup');
    setWatch(C.start_setup, C.pin, { repeat: true, edge: 'falling', debounce: 50 });
  }
}
