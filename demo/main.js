let isOn = false;
const interval = 500; // 500 milliseconds = 0.5 seconds
import C from "../esp-wifi-manager.js";
let LED= D2;


function main() {
  //use setupPin(PIN) if you want to setup a button for the Access Point management
  //C.setupPin(0);
  C.init( LED, () =>{
    //this device is connected to Internet!
    setInterval(() => {
        isOn = !isOn; // Flips the state on or off
        digitalWrite(LED, isOn); // D2 is the blue LED on the ESP8266 boards
    }, interval);
  })
}
