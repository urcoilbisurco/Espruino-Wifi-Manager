'use strict';

var wifi = require('Wifi');
var f = new (require("FlashEEPROM"))();
var parseRequestData = function parseRequestData(str) {
  return str.split("&").reduce(function (prev, curr, i, arr) {
    var p = curr.split("=");
    prev[decodeURIComponent(p[0])] = decodeURIComponent(p[1]);
    return prev;
  }, {});
};
var handleRequest = function handleRequest(req, res) {
  print(process.memory());
  if (req.method == "POST") {
    obj = parseRequestData(req.read());
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end("<html><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>body *{padding:8px;display:block;}</style><div><h1>Thank you.</h1><h2>You can now close this page and restore your Wi-Fi connection.</h2></div></html>");
    setTimeout(function () {
      wifi.stopAP();
      start_wifi(obj.ssid, obj.pssw);
      digitalWrite(D2, false);
    }, 3000);
  } else {
    wifi.scan(function (ns) {
      print(process.memory());
      var out = "\n      <html><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>body *{font-size:24px;padding:8px;display:block;}</style><body>";
      out = out + "<form method=\"POST\" action=\"/\"><label for=\"s\">Choose Wifi</label><select name=\"ssid\" id=\"s\">";
      out = out + ns.map(function (n) {
        return '<option value="' + n.ssid + '">' + n.ssid + '</option>';
      });
      print(process.memory());
      out = out + "</select><label for=\"p\">Password</label><input id=\"p\" name=\"pssw\" type=\"password\"/><input type=\"submit\" value=\"Save\"></form>";
      out = out + "</body></html>";
      print(process.memory());
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(out);
    });
  }
};
var onWifiError = function onWifiError() {
  console.log("ERROR wifi");
  print(process.memory());
  wifi.setHostname("espruino-wifi");
  wifi.startAP("espruino-wifi", {}, function (err) {
    if (err) {
      console.log("An error has occured :( ", err.message);
    } else {
      require("http").createServer(handleRequest).listen(80);
      console.log("Visit http://" + wifi.getIP().ip, "in your web browser.");
      print(process.memory());
    }
  });
};
var check_wifi = function check_wifi() {
  var timer = setInterval(function () {
    wifi.getDetails(function (obj) {
      console.log("status:", obj);
      if (obj.status == "no_ap_found" || obj.status == "wrong_password" || obj.status == "off" || obj.status == "connect_failed") {
        onWifiError();
        clearInterval(timer);
      }
      if (obj.status == "connected") {
        console.log("Connected to: " + wifi.getIP().ip);
        clearInterval(timer);
      }
    });
  }, 1000);
};
var start_wifi = function start_wifi(ssid, passw, callback) {
  check_wifi();
  console.log("start_wifi");
  if (ssid) {
    wifi.connect(ssid, { password: passw }, function (error) {
      if (error) {
        onWifiError();
      } else {
        console.log("Connected to: " + wifi.getIP().ip);
        if (callback) {
          callback();
        } else {
          f.write(0, ssid);
          f.write(1, passw);
          console.log("rebooting...");
          load();
        }
      }
    });
  }
};
var read = function read(pos) {
  var p = f.read(pos);
  return p != undefined ? E.toString(p) : undefined;
};
var conn$1 = conn = function conn(callback) {
  digitalWrite(D2, false);
  var ssid = read(5);
  var pass = read(6);
  start_wifi(ssid, pass, function () {
    digitalWrite(D2, true);
    callback();
  });
};

var isOn = false;
var interval = 500;
function main() {
  conn$1(function () {
    setInterval(function () {
      isOn = !isOn;
      digitalWrite(D2, isOn);
    }, interval);
  });
}
main();
