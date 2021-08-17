const char website_content[] PROGMEM = R"=====(
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <!--<link rel="stylesheet" href="/style.css" type="text/css" />-->
  <!--<script src="/microajax.js"></script>--> <!-- Adding microajax  -->
  <h1>ESP Home</h1>

  <h4>Settings</h4>
  <p>*see readme below</p>
  
  <div class="grid">

  <label>ssid</label>
  <input type="text" id="ssid"></input>

  <label>password</label>
  <input type="text" id="password"></input>

  <label>station (node) ID</label>
  <input type="text" id="station_id"></input>

  <label>station (node) type</label>
  <input type="text" id="station_type"></input>

  <label>mqtt broker</label>
  <input type="text" id="mqtt_broker"></input>

  <label>mqtt client id</label>  
  <input type="text" id="mqtt_client_id"></input>

  <label>mqtt topic</label>
  <input type="text" id="mqtt_topic"></input>

  <label>mqtt topic realtime</label>
  <input type="text" id="mqtt_topic_realtime"></input>

  <label>mqtt topic sub csv</label>
  <input type="text" id="mqtt_topic_sub_csv"></input>

  <label>mqtt topic sub json</label>
  <input type="text" id="mqtt_topic_sub_json"></input>

  <label>mqtt topic (service)</label>
  <input type="text" id="mqtt_topic_service"></input>

  <label>mqtt user</label>
  <input type="text" id="mqtt_user"></input>

  <label>mqtt pass</label>  
  <input type="text" id="mqtt_pass"></input>

  <label>mqtt port</label>
  <input type="number" id="mqtt_port"></input>

  <label>baud rate</label>
  <input type="number" id="baud_rate"></input>

  <label>push interval (0 for polling mode)</label>
  <input type="number" id="push_interval"></input>

  <label>push interval realtime (0 for polling mode)</label>
  <input type="number" id="push_interval_realtime"></input>

  <label>sensor enable code (0x000 - 0x1FF) / use decimal via pins [0, 1, 2, 3, 4, 5, 6, 7, 8]</label>
  <input type="number" id="sensor_enable_code"></input>

  <div>
  <button class="mybutton" onclick="refresh();">Load settings</button>
  </div>
  <div>
  <button class="mybutton" onclick="submit();">Save settings</button>
  </div>
  <div>
  <button class="mybutton" onclick="restart();">Restart</button>
  </div>
  <div>
  <button class="mybutton" onclick="resetDefaults();">Reset defaults</button>
  </div>
  </div>

  <h4>Info</h4>
  <div class="grid">

  <label>running</label>
  <input type="text" id="running"></input>

  <label>System clock</label>
  <input type="text" id="system_clock"></input>

  <label>WiFi connection disabled / unavailable (please check the SSID and restart the ESP module)</label>
  <input type="text" id="wifi_disabled"></input>

  <label>WiFi status</label>
  <input type="text" id="wifi_status"></input>

  <label>mqtt connection error</label>
  <input type="text" id="mqtt_connection_error"></input>

  <label>last message sent</label>
  <input type="text" id="last_message_sent"></input>

  <label>settings changed (not using defaults)</label>
  <input type="text" id="settings_changed"></input>

  <label>MAC address</label>
  <input type="text" id="mac_address"></input>

  <label>Station IP</label>
  <input type="text" id="station_ip"></input>

  <label>Signal strength (RSSI)</label>
  <input type="text" id="rssi"></input>

  <label>Free RAM (bytes)</label>
  <input type="text" id="free_ram"></input>

  </div>


  <h4>Readme</h4>
  <p>When connecting to your WiFi router for the first time, you must set the SSID and PASSWORD for the ESP WiFi module.</p>
  <p>WARNING: this page can become unresponsive while the ESP is attempting to connect to your WiFi router. Please wait about 30 seconds after you power on the ESP.</p>
  <p>If the ESP is unable to connect after several attempts, it will no longer try to connect and the page will become more responsive to allow you to change the config</p>
  <p>After updating the configuration, the ESP will restart automatically. You may also restart the ESP manually from this interface or power cycle to be sure that the config is applied.</p>
  <p>Note: This software is experimental. Please contact the supplier for any problems you may encounter.</p>

  <script>

  var tcp_data_log="";
  var serial_data_log="";
  var myTimer1;

  var keysConfig = [
    "ssid", 
    "password", 
    "mqtt_broker", 
    "mqtt_topic", 
    "mqtt_topic_realtime", 
    "mqtt_topic_sub_csv", 
    "mqtt_topic_sub_json", 
    "mqtt_topic_service", 
    "mqtt_client_id",
    "mqtt_user", 
    "mqtt_pass", 
    "mqtt_port", 
    "baud_rate", 
    "station_id", 
    "station_type",
    "push_interval",
    "push_interval_realtime",
    "sensor_enable_code",
    "mac_address"
  ];

  var keysInfo = [
    "running",
    "mqtt_connection_error",
    "settings_changed",
    "station_ip",
    "rssi",
    "last_message_sent",
    "wifi_status",
    "wifi_disabled",
    "free_ram",
    "system_clock"
  ];

  function microAjax(options) {
    "use strict";

    // Default to GET
    if (!options.method) {
      options.method = "GET";
    }

    // Default empty functions for the callbacks
    function noop() {}
    if (!options.success) {
      options.success = noop;
    }
    if (!options.warning) {
      options.warning = noop;
    }
    if (!options.error) {
      options.error = noop;
    }

    var request = new XMLHttpRequest();
    request.open(options.method, options.url, true);
    request.send(options.data);

    request.onload = function() {
      // Success!
      if (request.readyState === 4 && request.status === 200) {
        options.success(request.responseText);

        // We reached our target destination, but it returned an error
      } else {
        options.warning();
      }
    };

    // There was a connection error of some sort
    request.onerror = options.error;
  }

  function getValues(text){
    document.getElementById("mydynamicdata").value = text;
  }


  var getInfoData = function(){
    return new Promise(function(resolve, reject){
      microAjax({
        url: "/data/info",
        method: "GET",
        success: function(string){
          var obj = JSON.parse(string);

          if (obj.flag_serial==1){
            serial_data_log+=(obj.serial_in);
          }
          if(obj.flag_tcp==1){
            tcp_data_log+=(obj.tcp_in);
          }
          var textarea;

          for(let key of keysInfo){
            document.getElementById(key).value = obj[key];
          }
          resolve(true);
        }
        /* Successful request callback */,
        warning: function(value){
          console.log("warning");
          console.log(value);
          resolve(false);
        }
        /* Request warning callback */,
        error: function(value){
          console.log("error");
          console.log(value);
          resolve(false);
        }
        /* Request error callback */
      });
    });    
  };

  var refresh = function(){
    console.log("refresh");
    microAjax({
      url: "/data/config",
      method: "GET",
      success: function(string){
        var obj = JSON.parse(string);
        console.log(string);
        console.log(obj);
        for(let key of keysConfig){
          document.getElementById(key).value = obj[key];
        }
      }
      /* Successful request callback */,
      warning: function(value){
        console.log("warning");
        console.log(value);
      }
      /* Request warning callback */,
      error: function(value){
        console.log("error");
        console.log(value);
      }
      /* Request error callback */
    });
  };

  var submit = function(){
    console.log("submit");

    var obj = {};

    for(let key of keysConfig){
      obj[key] = document.getElementById(key).value;
    }

    microAjax({
      url: "/data/config",
      method: "POST",
      data: JSON.stringify(obj),
      success: function(string){
        console.log("post success");
      }
      /* Successful request callback */,
      warning: function(value){
        console.log("warning");
        console.log(value);
      }
      /* Request warning callback */,
      error: function(value){
        console.log("error");
        console.log(value);
      }
      /* Request error callback */
    });
  };


  var restart = function(){
    console.log("restart");

    microAjax({
      url: "/service/restart",
      method: "POST",
      data: null,
      success: function(string){
        document.getElementById("running").value = 0;
        console.log("post success");
      }
      /* Successful request callback */,
      warning: function(value){
        console.log("warning");
        console.log(value);
      }
      /* Request warning callback */,
      error: function(value){
        console.log("error");
        console.log(value);
      }
      /* Request error callback */
    });
  };


  var resetDefaults = function(){
    console.log("reset defaults");

    microAjax({
      url: "/service/reset-defaults",
      method: "POST",
      data: null,
      success: function(string){
        console.log("post success");
      }
      /* Successful request callback */,
      warning: function(value){
        console.log("warning");
        console.log(value);
      }
      /* Request warning callback */,
      error: function(value){
        console.log("error");
        console.log(value);
      }
      /* Request error callback */
    });
  };

  // init
  refresh();

  function myTimerFunction1() {
    myTimer1 = setTimeout(function(){
      getInfoData().then(function(){
        myTimerFunction1();
      });     
    }, 2000);
  };

  function myStopFunction() {
    clearTimeout(myTimer1);
  }

  myTimerFunction1();

  </script>

  <style>

  .mybutton {
    background-color: white;
    color: black;
    border: 2px solid #4CAF50;
    padding: 16px 32px;
    text-align: center;
    text-decoration: none;
    display: inline-block;
    font-size: 16px;
    margin: 4px 2px;
    // -webkit-transition-duration: 0.1s; /* Safari */
    // transition-duration: 0.1s;
    cursor: pointer;
  }

  .mybutton:hover {
    background-color: #4CAF50;
    color: white;
  }
  .grid {

    display:flex;
    flex-direction:column;
    width: 100%;
    // display: grid;
    // grid-template-areas: "a a";
    // grid-gap: 20px 5px;
    // grid-auto-rows: 100px;
  }

  .grid > label {
    background-color: lime;
  }
  </style>
)=====";
