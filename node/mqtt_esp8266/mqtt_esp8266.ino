#include <Arduino.h>

extern "C"
{
#include "user_interface.h"
}

#include "mqtt_esp8266.h"

#include <NTPClient.h>

#include <ESP8266WiFi.h>
#include <WiFiClient.h>
#include <MQTTClient.h>

#include <EEPROM.h>
#include <ESP8266WebServer.h>

#include <ArduinoJson.h>

#include <Wire.h>

#include <WiFiUdp.h>

#include "website.h"
#include "utils.h"

#define PIN_SDA 5
#define PIN_SCL 4

// define variables

// timer
uint32_t time2;

//os
os_timer_t myTimer;
bool tickOccured;

//config
byte debug = 1;

IPAddress local_IP(192, 168, 4, 1);
IPAddress gateway(192, 168, 4, 1);
IPAddress subnet(255, 255, 255, 0);

#define N_BUF_CSV 1024
#define N_BUF_JSON 2048

#define N_CHAR_PARAM 100

#define EEPROM_SENTINEL 25

unsigned long node_type = 1; // sensor
unsigned long node_id = 0;
unsigned long node_id_init = 0, system_clk = 0;
bool battery_saving_mode = false;
bool battery_saving_mode_fast_boot = false;

// eeprom
#define EEPROM_MAX_STRING_LENGTH 100
#define EEPROM_DATA_START 50

// status codes
#define FCN_RESULT_OK 0
#define FCN_RESULT_ER 1
#define FCN_RESULT_IN_PROGRESS 2

//connection
#define STATUS_WIFI_START 1
#define STATUS_WIFI_OK 2
#define STATUS_WIFI_WAIT_AP 3
#define STATUS_WIFI_CONNECT_AP 4
#define STATUS_WIFI_CONNECT_SERVER 5
#define STATUS_WIFI_WAIT_SERVER 6

#define DEFAULT_BAUDRATE 115200

#define N_INPUT_ARRAY 50
int input_array[N_INPUT_ARRAY];

// status
byte wifi_status = STATUS_WIFI_START;
byte flag_mode_at = 1, flag_mode_at_lock = 0;
bool flag_node_data_sent = false;
byte counter_retry_server = 0, counter_retry_wifi = 0;
int cmd_counter = 0;
byte settings_changed = 0;

byte button_state_prev, button_state;

uint32_t free_ram = 0;

int firmware_vesion = 1;
bool node_init = false;

//server
/* Set these to your desired credentials. */
char ssid[N_CHAR_PARAM] = "SSID";
char password[N_CHAR_PARAM] = "PASSWD";

// char ssid[N_CHAR_PARAM] = "Clicknet-BB50";
// char password[N_CHAR_PARAM] = "AKTELY3LP4YRM";

unsigned long port = 1883;

char mqtt_topic[N_CHAR_PARAM] = "wsn/watergame/data";
char mqtt_topic_realtime[N_CHAR_PARAM] = "wsn/watergame/realtime";
char mqtt_client_id[N_CHAR_PARAM] = "wsn/watergame/station/";
char mqtt_topic_sub_csv[N_CHAR_PARAM] = "wsn/watergame/cmd/csv";
char mqtt_topic_sub_json[N_CHAR_PARAM] = "wsn/watergame/cmd/json";
char mqtt_topic_service[N_CHAR_PARAM] = "wsn/watergame/service";
// char mqtt_user[N_CHAR_PARAM] = "60c42070";
// char mqtt_pass[N_CHAR_PARAM] = "87bc58e655e88d7f";
// char mqtt_broker[N_CHAR_PARAM] = "broker.shiftr.io";

char mqtt_user[N_CHAR_PARAM] = "pi";
char mqtt_pass[N_CHAR_PARAM] = "raspberry";
char mqtt_broker[N_CHAR_PARAM] = "ec2-3-66-146-88.eu-central-1.compute.amazonaws.com";

// settings
unsigned long baud_rate = DEFAULT_BAUDRATE;
byte mac[6];
unsigned long push_interval = 60000;
unsigned long push_interval_realtime = 10000;

// async flags
byte wifiConnectInProgress = 0;
unsigned long timeConnectWifi0;
byte wifiConnectRetryCount = 0;
byte wifiConnectMaxRetry = 20;

byte tcpConnectInProgress = 0;
unsigned long timeConnectTcp0;
byte tcpConnectRetryCount = 0;
byte tcpConnectMaxRetry = 20;

unsigned long timeStart0 = 0, timeStart1 = 0, timeClock0 = 0, timeClock1 = 0, timeClock0_2 = 0, timeStartClock = 0, timeClock0_rt = 0;

int mqtt_polling_interval = 1;

// async request flags (long-polling)
byte flag_newdata_handleDataInfo = 0;
byte flag_newdata_handleDataInfo_serial = 0, flag_newdata_handleDataInfo_tcp = 0;
byte n_serial_buffer_in = 0, n_tcp_buffer_in = 0;
unsigned long t_nodata0;

//other info
byte k_info1 = 0;
byte flag_info = 0;
byte flag_push = 0;

//flags
byte flag_send = 0;
bool flag_connection_error = false;
bool flag_node_discovered = false;
bool initial_wifi_connection = false;
bool wifi_disabled = false;

byte test_pin_state = 0;
byte use_test_pin = 1;
byte mqtt_connection_error = 0;

// data / direct connected sensors
int analogValue = 0;
int analogValuePercent = 0;
String last_message_sent;
byte out_relay1 = 1;

// buffers
char jsonstring[N_BUF_JSON];
char csvstring[N_BUF_CSV];
char mqtt_input_buf[N_BUF_JSON];

// io
#define N_MAX_SENSORS 9
const int sensorPins[N_MAX_SENSORS] = {0, 1, 2, 3, 4, 5, 6, 7, 8};
const int sensorPinsMap[N_MAX_SENSORS] = {16, 5, 4, 0, 2, 14, 12, 13, 15};
void (*sensorFn[N_MAX_SENSORS])(void) = {sensorFn0, sensorFn1, sensorFn2, sensorFn3, sensorFn4, sensorFn5, sensorFn6, sensorFn7, sensorFn8};
bool sensorEnable[N_MAX_SENSORS] = {false, true, true, true, false, true, true, true, false}; // available
// unsigned long sensorEnableCode = 0x0C0; // 192
unsigned long sensorEnableCode = 0x080; // 128
long sensorDataAux[N_MAX_SENSORS];
long sensorDataCounter[N_MAX_SENSORS];
long sensorData[N_MAX_SENSORS];
long sensorDataAvg[N_MAX_SENSORS];
long sensorDataTs[N_MAX_SENSORS];
long sensorDataTsU[N_MAX_SENSORS];
long sensorDataVol[N_MAX_SENSORS];
bool sensorState[N_MAX_SENSORS];

// 0x0c0 = 192 = 1,2
// 0x080 = 128 = 1
// 0x0ee = 238 = 1,2,3,5,6,7

// classes
WiFiClient wificlient;
ESP8266WebServer httpServer(80);
// by default it uses a small 128 byte buffer
MQTTClient mqttClient(N_BUF_JSON);
WiFiUDP ntpUDP;

NTPClient timeClient(ntpUDP, "pool.ntp.org", 0);

//callbacks
void timerCallback(void *pArg)
{
  tickOccured = true;
  k_info1++;

  if (use_test_pin)
  {
    digitalWrite(10, test_pin_state);
    test_pin_state ^= 1;
  }

  checkSensorTimingsResetAll();

  if (k_info1 >= 20)
  {
    k_info1 = 0;
    flag_info = 1;
    flag_push = 1;
  }
}

void initAP()
{
  Serial.print("Setting soft-AP configuration ... ");
  Serial.println(WiFi.softAPConfig(local_IP, gateway, subnet) ? "Ready" : "Failed!");

  Serial.print("Setting soft-AP ... ");
  char ap[100];
  sprintf(ap, "WatergameNodeAP%d", node_id);

  Serial.println(ap);
  Serial.println(WiFi.softAP(ap, "alexpro25") ? "Ready" : "Failed!");
  // not working? from Arduino IDE set the erase flash setting from Sketch only to Sketch + WiFi Settings
  // min 8 char password!

  Serial.print("Soft-AP IP address = ");
  Serial.println(WiFi.softAPIP());
}

int connectWiFi_Async()
{
  if (!wifiConnectInProgress)
  {
    wifiConnectInProgress = 1;
    WiFi.begin(ssid, password);
    timeConnectWifi0 = millis();
    if (debug)
    {
      Serial.print("Connecting to WiFi AP: ");
      Serial.println(ssid);
    }
  }
  else
  {
    if (millis() - timeConnectWifi0 >= 500)
    {
      timeConnectWifi0 = millis();
      if (WiFi.status() != WL_CONNECTED)
      {
        // not connected
        Serial.println(".");
        wifiConnectRetryCount++;
        if (wifiConnectRetryCount > wifiConnectMaxRetry)
        {
          wifiConnectRetryCount = 0;
          if (debug)
          {
            Serial.println("ERROR: timeout");
          }
          WiFi.disconnect();
          wifiConnectInProgress = 0;
          return FCN_RESULT_ER;
        }
      }
      else
      {
        // connected
        wifiConnectRetryCount = 0;
        if (debug)
        {
          Serial.print("Connected to ");
          Serial.println(ssid);
          Serial.print("IP address: ");
          Serial.println(WiFi.localIP());
        }
        wifiConnectInProgress = 0;
        return FCN_RESULT_OK;
      }
    }
  }
  return FCN_RESULT_IN_PROGRESS;
}

void connectMQTT()
{
  //  client_id, mqtt broker username, mqtt broker password
  mqttClient.connect(mqtt_client_id, mqtt_user, mqtt_pass);
  if (!mqttClient.connected())
  {
    Serial.println(".");
  }
  else
  {
    Serial.println("mqtt connected!");
    //  mqttClient.subscribe("wsn/#");
    mqttClient.subscribe(mqtt_topic_sub_csv);
    mqttClient.subscribe(mqtt_topic_sub_json);
    Serial.println("mqtt subscribed!");
  }
}

int mqttCheck()
{
  if (!mqttClient.connected())
  {
    Serial.println("mqtt disconnected. connecting to mqtt broker.");
    connectMQTT();
    return 1;
  }
  return 0;
}

int eeprom_write_string(char *val, int eeprom_pos)
{
  int n_val = strlen(val);
  Serial.print("eeprom write string [");
  Serial.print(n_val);
  Serial.print("] = ");
  Serial.println(val);

  for (int i = eeprom_pos; i < eeprom_pos + n_val; i++)
  {
    EEPROM.write(i, val[i - eeprom_pos]);
  }
  eeprom_pos += n_val;
  return eeprom_pos;
}

int eeprom_read_string(char *val, int eeprom_pos, int len)
{
  if (len > EEPROM_MAX_STRING_LENGTH)
  {
    len = EEPROM_MAX_STRING_LENGTH;
  }

  for (int i = eeprom_pos; i < eeprom_pos + len; i++)
  {
    //esid += char(EEPROM.read(i));
    val[i - eeprom_pos] = EEPROM.read(i);
  }

  val[len] = NULL;
  Serial.print("eeprom read string [");
  Serial.print(len);
  Serial.print("] = ");
  Serial.println(val);
  eeprom_pos += len;
  return eeprom_pos;
}

int eeprom_write_long(unsigned long val, int eeprom_pos)
{
  EEPROM.write(eeprom_pos, val >> 24);
  eeprom_pos++;
  EEPROM.write(eeprom_pos, val >> 16);
  eeprom_pos++;
  EEPROM.write(eeprom_pos, val >> 8);
  eeprom_pos++;
  EEPROM.write(eeprom_pos, val);
  eeprom_pos++;
  Serial.print("eeprom write long=");
  Serial.println(val);
  return eeprom_pos;
}

int eeprom_read_long(unsigned long *val, int eeprom_pos)
{
  *val = EEPROM.read(eeprom_pos) * 16777216;
  eeprom_pos++;
  *val += EEPROM.read(eeprom_pos) * 65536;
  eeprom_pos++;
  *val += EEPROM.read(eeprom_pos) * 256;
  eeprom_pos++;
  *val += EEPROM.read(eeprom_pos);
  eeprom_pos++;
  Serial.print("eeprom read long=");
  Serial.println(*val);
  return eeprom_pos;
}

int n_ssid, n_passwd, n_mqtt_broker, n_mqtt_topic, n_mqtt_topic_realtime, n_mqtt_user, n_mqtt_pass, n_mqtt_client, n_mqtt_topic_sub_csv, n_mqtt_topic_sub_json, n_mqtt_topic_service;
int checksum;

void build_checksum()
{
  checksum = 0;
  // string vars
  checksum += n_ssid = strlen(ssid);
  checksum += n_passwd = strlen(password);
  checksum += n_mqtt_broker = strlen(mqtt_broker);
  checksum += n_mqtt_topic = strlen(mqtt_topic);
  checksum += n_mqtt_user = strlen(mqtt_user);
  checksum += n_mqtt_pass = strlen(mqtt_pass);
  checksum += n_mqtt_topic_sub_csv = strlen(mqtt_topic_sub_csv);
  checksum += n_mqtt_topic_sub_json = strlen(mqtt_topic_sub_json);
  checksum += n_mqtt_topic_service = strlen(mqtt_topic_service);
  checksum += n_mqtt_topic_realtime = strlen(mqtt_topic_realtime);
  checksum += n_mqtt_client = strlen(mqtt_client_id);

  // long vars
  checksum += 6 * 4;

  // checksum -= 3;
}

void write_config()
{
  int eeprom_pos = EEPROM_DATA_START;

  build_checksum();

  EEPROM.write(1, EEPROM_SENTINEL);
  EEPROM.write(3, n_ssid);
  // Serial.println(n_ssid);
  EEPROM.write(4, n_passwd);
  EEPROM.write(5, n_mqtt_broker);
  EEPROM.write(6, n_mqtt_topic);
  EEPROM.write(7, n_mqtt_user);
  EEPROM.write(8, n_mqtt_pass);
  EEPROM.write(9, n_mqtt_topic_sub_csv);
  EEPROM.write(10, n_mqtt_topic_sub_json);
  EEPROM.write(11, n_mqtt_topic_service);
  EEPROM.write(12, n_mqtt_client);
  EEPROM.write(13, n_mqtt_topic_realtime);

  eeprom_pos = eeprom_write_string(ssid, eeprom_pos);
  eeprom_pos = eeprom_write_string(password, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_broker, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_topic, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_user, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_pass, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_topic_sub_csv, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_topic_sub_json, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_topic_service, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_topic_realtime, eeprom_pos);
  eeprom_pos = eeprom_write_string(mqtt_client_id, eeprom_pos);

  eeprom_pos = eeprom_write_long(port, eeprom_pos);
  eeprom_pos = eeprom_write_long(node_id, eeprom_pos);
  eeprom_pos = eeprom_write_long(node_type, eeprom_pos);
  eeprom_pos = eeprom_write_long(push_interval, eeprom_pos);
  eeprom_pos = eeprom_write_long(sensorEnableCode, eeprom_pos);
  eeprom_pos = eeprom_write_long(push_interval_realtime, eeprom_pos);

  if (debug)
  {
    Serial.println("EEPROM write");
  }

  EEPROM.commit();
}

int read_config(int debug)
{
  build_checksum();
  int n_ssid, n_passwd, n_mqtt_broker, n_mqtt_topic, n_mqtt_topic_realtime, n_mqtt_user, n_mqtt_pass, n_mqtt_client, n_mqtt_topic_sub_csv, n_mqtt_topic_sub_json, n_mqtt_topic_service;
  int eeprom_pos = EEPROM_DATA_START;
  byte start_val;
  start_val = EEPROM.read(1);
  if (debug)
  {
    Serial.println("Reading EEPROM");
  }

  if (debug)
  {
    Serial.print("sentinel read: ");
    Serial.print(start_val);
    Serial.println();
  }

  if (start_val == EEPROM_SENTINEL)
  {
    n_ssid = EEPROM.read(3);
    n_passwd = EEPROM.read(4);
    n_mqtt_broker = EEPROM.read(5);
    n_mqtt_topic = EEPROM.read(6);
    n_mqtt_user = EEPROM.read(7);
    n_mqtt_pass = EEPROM.read(8);
    n_mqtt_topic_sub_csv = EEPROM.read(9);
    n_mqtt_topic_sub_json = EEPROM.read(10);
    n_mqtt_topic_service = EEPROM.read(11);
    n_mqtt_client = EEPROM.read(12);
    n_mqtt_topic_realtime = EEPROM.read(13);

    eeprom_pos = eeprom_read_string(ssid, eeprom_pos, n_ssid);
    eeprom_pos = eeprom_read_string(password, eeprom_pos, n_passwd);
    eeprom_pos = eeprom_read_string(mqtt_broker, eeprom_pos, n_mqtt_broker);
    eeprom_pos = eeprom_read_string(mqtt_topic, eeprom_pos, n_mqtt_topic);
    eeprom_pos = eeprom_read_string(mqtt_user, eeprom_pos, n_mqtt_user);
    eeprom_pos = eeprom_read_string(mqtt_pass, eeprom_pos, n_mqtt_pass);
    eeprom_pos = eeprom_read_string(mqtt_topic_sub_csv, eeprom_pos, n_mqtt_topic_sub_csv);
    eeprom_pos = eeprom_read_string(mqtt_topic_sub_json, eeprom_pos, n_mqtt_topic_sub_json);
    eeprom_pos = eeprom_read_string(mqtt_topic_service, eeprom_pos, n_mqtt_topic_service);
    eeprom_pos = eeprom_read_string(mqtt_topic_realtime, eeprom_pos, n_mqtt_topic_realtime);
    eeprom_pos = eeprom_read_string(mqtt_client_id, eeprom_pos, n_mqtt_client);

    eeprom_pos = eeprom_read_long(&port, eeprom_pos);
    eeprom_pos = eeprom_read_long(&node_id, eeprom_pos);
    eeprom_pos = eeprom_read_long(&node_type, eeprom_pos);
    eeprom_pos = eeprom_read_long(&push_interval, eeprom_pos);
    eeprom_pos = eeprom_read_long(&sensorEnableCode, eeprom_pos);
    eeprom_pos = eeprom_read_long(&push_interval_realtime, eeprom_pos);

    if ((eeprom_pos - EEPROM_DATA_START) != checksum)
    {
      Serial.println("EEPROM checksum mismatch: ");
      Serial.println(eeprom_pos - EEPROM_DATA_START);
      Serial.println(checksum);
      settings_changed = 1;
    }

    return FCN_RESULT_OK;
  }
  else
  {
    if (debug)
    {
      Serial.println("EEPROM not initialized, using default values, create node id before mqtt update");
    }

    return FCN_RESULT_ER;
  }
}

void mqtt_send(String topic, String data)
{
  Serial.println("mqtt send [" + topic + "]");
  Serial.println(data);
  last_message_sent = data;
  mqttClient.publish(topic, data);
}

void mqtt_receive(String &topic, String &payload)
{
  // a user friendly message, ignored by the connected device
  Serial.println("mqtt receive: " + topic);
  // the actual command that will be decoded by the connected device
  Serial.println(payload);

  char topic_char[100];

  payload.toCharArray(mqtt_input_buf, payload.length() + 1);
  topic.toCharArray(topic_char, topic.length() + 1);

  if (strcmp(topic_char, mqtt_topic_sub_csv) == 0)
  {
    parseCSV(mqtt_input_buf, input_array, N_INPUT_ARRAY);
    if (input_array[1] == node_id || input_array[1] == -1)
    {
      switch (input_array[0])
      {
      case 100:
        node_id = input_array[2];
        write_config();
        break;
      case 101:
        node_type = input_array[2];
        write_config();
        break;
      case 200:
        sprintf(csvstring, "ACK [%ld%]\0", node_id);
        mqtt_send(mqtt_topic_service, csvstring);
        break;
      case 300:
        sprintf(csvstring, "ACK [%ld%]\0", node_id);
        handleRestart();
        break;
      }
    }
  }

  else if (strcmp(topic_char, mqtt_topic_sub_json) == 0)
  {
    DynamicJsonDocument root(N_BUF_JSON);
    DynamicJsonDocument root_get(N_BUF_JSON);
    deserializeJson(root, payload);

    if (root["id"] == node_id || root["id"] == -1)
    {
      int mode = root["mode"];
      // (0) get, (1) post
      if (mode)
      {
        // post
        handleConfigUpdate(root);
        sprintf(csvstring, "ACK [%ld%]\0", node_id);
        mqtt_send(mqtt_topic_service, csvstring);
        delay(1000);
        handleRestart();
      }
      else
      {
        // get
        handleConfigRequest(root_get, jsonstring);
        mqtt_send(mqtt_topic_service, jsonstring);
      }
    }
  }
}

void read_config_wrapper()
{
  read_config(1);
}

/**
   measurements example
   val: mL/sample - L/h
   max: 655 - 235
   min: 115 - 41
   nor: 375 - 135
 * */

long dtToFlow(long dt, long count, long multiplier)
{
  // micros => multiplier = 10^6
  // millis => multiplier = 10^3
  float freq = multiplier * 1.0 / (float)dt;
  // float flow = (7.77 * freq - 14.8605) * 60; // L/h
  // max 30 L/min = 1800 L/h = 5.77 hz = 173 ms (old scale)
  float flow = count * freq * 60 / 7.5; // L/h (DQ/DT)
  // max 30 L/min = 1800 L/h = 225 hz = 4.44 ms
  return (long)flow;
}

long countToML(long count)
{
  float ml = (float)count / 450.0 * 1000.0;
  return (long)ml;
}

// https://www.seeedstudio.com/blog/2020/05/11/how-to-use-water-flow-sensor-with-arduino/
void checkSensorTimings(long &sensorDataAux, long &sensorData, bool &sensorState, long &sensorDataCounter)
{
  if (!sensorState)
  {
    sensorState = true;
    sensorDataAux = micros();
  }
  else
  {
    // check debounce
    long diff = micros() - sensorDataAux;
    sensorDataAux = micros();
    if (diff >= 2000) // min 2 ms debounce
    {
      sensorData = dtToFlow(diff, 1, 1000000);
      sensorDataCounter += 1;
    }
  }
}

void checkSensorTimingsResetAll()
{
  for (int i = 0; i < N_MAX_SENSORS; i++)
  {
    if (sensorEnable[i])
    {
      checkSensorTimingsReset(sensorDataAux[i], sensorData[i], sensorState[i]);
    }
  }
}

void checkSensorTimingsReset(long &sensorDataAux, long &sensorData, bool &sensorState)
{
  if (sensorState)
  {
    // check elapsed timeout
    long diff = micros() - sensorDataAux;
    // if (diff >= 500000) // 2hz min
    if (diff >= 2000000) // 0.5hz min = 4L/h
    {
      // reset flow meter
      sensorData = 0;
    }
  }
}

// Checks if motion was detected, sets LED HIGH and starts a timer
ICACHE_RAM_ATTR void sensorFn0()
{
  // Serial.println("fn0");
  checkSensorTimings(sensorDataAux[0], sensorData[0], sensorState[0], sensorDataCounter[0]);
}
ICACHE_RAM_ATTR void sensorFn1()
{
  // Serial.println("fn1");
  checkSensorTimings(sensorDataAux[1], sensorData[1], sensorState[1], sensorDataCounter[1]);
}
ICACHE_RAM_ATTR void sensorFn2()
{
  // Serial.println("fn2");
  checkSensorTimings(sensorDataAux[2], sensorData[2], sensorState[2], sensorDataCounter[2]);
}
ICACHE_RAM_ATTR void sensorFn3()
{
  // Serial.println("fn3");
  checkSensorTimings(sensorDataAux[3], sensorData[3], sensorState[3], sensorDataCounter[3]);
}
ICACHE_RAM_ATTR void sensorFn4()
{
  // Serial.println("fn4");
  checkSensorTimings(sensorDataAux[4], sensorData[4], sensorState[4], sensorDataCounter[4]);
}
ICACHE_RAM_ATTR void sensorFn5()
{
  // Serial.println("fn5");
  checkSensorTimings(sensorDataAux[5], sensorData[5], sensorState[5], sensorDataCounter[5]);
}
ICACHE_RAM_ATTR void sensorFn6()
{
  // Serial.println("fn6");
  checkSensorTimings(sensorDataAux[6], sensorData[6], sensorState[6], sensorDataCounter[6]);
}
ICACHE_RAM_ATTR void sensorFn7()
{
  // Serial.println("fn7");
  checkSensorTimings(sensorDataAux[7], sensorData[7], sensorState[7], sensorDataCounter[7]);
}
ICACHE_RAM_ATTR void sensorFn8()
{
  // Serial.println("fn8");
  checkSensorTimings(sensorDataAux[8], sensorData[8], sensorState[8], sensorDataCounter[8]);
}

/**
   compute flow average over the last time frame (since last called)
   only call this once, when required, for true reading
   WARNING: using micros => max 30 min between readings (ts overflows)
   this is why we also use millis here as a backup, less accuracy but no risk of overflow
 **/
void computeFlowAverageTimeframe(bool initOnly)
{
  long ts = millis();
  long ts_u = micros();
  for (int i = 0; i < N_MAX_SENSORS; i++)
  {
    if (sensorEnable[i])
    {
      if (!initOnly)
      {
        if ((ts - sensorDataTs[i]) > 1800000)
        {
          // > 30 min, use low precision counter (millis)
          sensorDataAvg[i] = dtToFlow((ts - sensorDataTs[i]), sensorDataCounter[i], 1000);
        }
        else
        {
          // use high precision counter (micros)
          sensorDataAvg[i] = dtToFlow((ts_u - sensorDataTsU[i]), sensorDataCounter[i], 1000000);
        }
        sensorDataVol[i] = countToML(sensorDataCounter[i]);
      }
      // reset counter, update timeframe
      sensorDataCounter[i] = 0;
      sensorDataTs[i] = ts;
      sensorDataTsU[i] = ts_u;
    }
  }
}

void printSensorData()
{
  for (int i = 0; i < N_MAX_SENSORS; i++)
  {
    if (sensorEnable[i])
    {
      Serial.print(sensorData[i]);
      // Serial.print(sensorDataAvg[i]);
      Serial.print(",");
    }
  }
  Serial.println();
}

void setup_io()
{

  if (use_test_pin)
  {
    pinMode(10, OUTPUT); // sd3
    digitalWrite(10, 0);
  }

  int mask = 0x01;
  for (int i = 0; i < N_MAX_SENSORS; i++)
  {
    if ((sensorEnableCode & (mask << i)) != 0)
    {
      sensorEnable[N_MAX_SENSORS - i - 1] = true;
    }
    else
    {
      sensorEnable[N_MAX_SENSORS - i - 1] = false;
    }
  }

  for (int i = 0; i < N_MAX_SENSORS; i++)
  {
    if (sensorEnable[i])
    {
      Serial.print("setup sensor #");
      Serial.print(sensorPins[i]);
      Serial.println();

      // pin mode INPUT_PULLUP
      pinMode(sensorPinsMap[i], INPUT_PULLUP);
      // Set pin as interrupt, assign interrupt function and set FALLING mode
      attachInterrupt(digitalPinToInterrupt(sensorPinsMap[i]), sensorFn[i], FALLING);
    }
  }
}

void setup()
{
  int retval;
  timeStart0 = millis();

  WiFi.mode(WIFI_AP_STA);
  // WiFi.macAddress(mac);
  //  esp_wifi_set_mac(ESP_IF_WIFI_STA, &newMACAddress[0]);

  if (!battery_saving_mode_fast_boot)
  {
    WiFi.disconnect();
  }

  Serial.begin(DEFAULT_BAUDRATE);

  //  Serial.setRxBufferSize(1024);
  EEPROM.begin(512);
  read_config_wrapper();
  Serial.println();
  check_init_node_id();
  delay(1000);
  initAP();

  httpServer.begin();
  httpServer.on("/", processExample);
  httpServer.on("/data/config", handleDataConfig);
  httpServer.on("/data/info", handleDataInfo);
  httpServer.on("/service/restart", handleRestart);
  httpServer.on("/service/reset-defaults", handleResetDefaults);

  // TODO: dynamic broker change
  mqttClient.begin(mqtt_broker, port, wificlient);
  mqttClient.onMessage(mqtt_receive);

  //os config, timer
  os_timer_setfn(&myTimer, timerCallback, NULL);
  os_timer_arm(&myTimer, 100, true);
  tickOccured = false;

  system_clk = 0;
  timeStart1 = millis();
  timeClock0 = millis();
  timeClock0_2 = millis();
  timeStartClock = millis();
  timeClock0_rt = millis();

  ESP.wdtEnable(10000);

  setup_io();
  computeFlowAverageTimeframe(true);
}

void serialize(const DynamicJsonDocument &root, char *jsonstring, int maxsize)
{
  serializeJson(root, jsonstring, maxsize);
}

String macToStr(const byte *mac)
{
  String result;
  for (int i = 0; i < 6; ++i)
  {
    result += String(mac[i], 16);
    if (i < 5)
      result += ':';
  }
  return result;
}

void handleDataInfo()
{
  DynamicJsonDocument root(N_BUF_JSON);
  if (httpServer.method() == HTTP_GET)
  {
    free_ram = system_get_free_heap_size();
    root["station_ip"] = WiFi.localIP().toString();
    root["rssi"] = WiFi.RSSI();
    root["running"] = 1;
    root["last_message_sent"] = last_message_sent;
    root["mqtt_connection_error"] = mqtt_connection_error;
    root["settings_changed"] = settings_changed;
    root["free_ram"] = free_ram;
    root["wifi_disabled"] = wifi_disabled;
    root["wifi_status"] = wifi_status;
    root["system_clock"] = system_clk;
    serialize(root, jsonstring, N_BUF_JSON);
    httpServer.send(200, "application/json", jsonstring);
  }
}

void handleResetDefaults()
{
  Serial.println("reloading");
  // reset sentinel
  EEPROM.write(1, 0);
  EEPROM.commit();
  // ESP.reset();
  // may not start
  delay(3000);
  ESP.restart();
}

void handleRestart()
{
  ESP.restart();
}

void checkUpdateLong(DynamicJsonDocument &root, String key, unsigned long *val)
{
  if (!root[key].isNull())
  {
    *val = root[key].as<unsigned long>();
  }
}

void checkUpdateString(DynamicJsonDocument &root, String key, char *val)
{
  if (!root[key].isNull())
  {
    strcpy(val, root[key]);
    strcat(val, "\0");
  }
}

void handleConfigUpdate(DynamicJsonDocument &root)
{
  checkUpdateString(root, "ssid", ssid);
  checkUpdateString(root, "password", password);
  checkUpdateString(root, "mqtt_broker", mqtt_broker);
  checkUpdateString(root, "mqtt_topic", mqtt_topic);
  checkUpdateString(root, "mqtt_user", mqtt_user);
  checkUpdateString(root, "mqtt_pass", mqtt_pass);

  checkUpdateString(root, "mqtt_topic_sub_csv", mqtt_topic_sub_csv);
  checkUpdateString(root, "mqtt_topic_sub_json", mqtt_topic_sub_json);
  checkUpdateString(root, "mqtt_topic_service", mqtt_topic_service);
  checkUpdateString(root, "mqtt_client_id", mqtt_client_id);
  checkUpdateString(root, "mqtt_topic_realtime", mqtt_topic_realtime);

  checkUpdateLong(root, "mqtt_port", &port);
  checkUpdateLong(root, "baud_rate", &baud_rate);
  checkUpdateLong(root, "station_id", &node_id);
  checkUpdateLong(root, "station_type", &node_type);

  checkUpdateLong(root, "push_interval", &push_interval);
  checkUpdateLong(root, "sensor_enable_code", &sensorEnableCode);
  checkUpdateLong(root, "push_interval_realtime", &push_interval_realtime);

  serialize(root, jsonstring, N_BUF_JSON);
  Serial.println("config update request");
  Serial.println(jsonstring);

  write_config();
}

void handleConfigRequest(DynamicJsonDocument &root, char *jsonstring)
{
  root["ssid"] = ssid;
  root["password"] = password;
  root["mqtt_port"] = port;
  root["baud_rate"] = baud_rate;
  root["mqtt_broker"] = mqtt_broker;
  root["mqtt_topic"] = mqtt_topic;
  root["mqtt_topic_sub_csv"] = mqtt_topic_sub_csv;
  root["mqtt_topic_sub_json"] = mqtt_topic_sub_json;
  root["mqtt_topic_service"] = mqtt_topic_service;
  root["mqtt_topic_realtime"] = mqtt_topic_realtime;
  root["mqtt_user"] = mqtt_user;
  root["mqtt_pass"] = mqtt_pass;
  root["mqtt_client_id"] = mqtt_client_id;
  root["station_id"] = node_id;
  root["station_type"] = node_type;
  root["mac_address"] = WiFi.macAddress();
  root["push_interval"] = push_interval;
  root["push_interval_realtime"] = push_interval_realtime;
  root["sensor_enable_code"] = sensorEnableCode;

  serialize(root, jsonstring, N_BUF_JSON);
  Serial.println("config read request");
  Serial.println(jsonstring);
}

void handleDataConfig()
{
  DynamicJsonDocument root(N_BUF_JSON);
  if (httpServer.method() == HTTP_GET)
  {
    handleConfigRequest(root, jsonstring);
    httpServer.send(200, "application/json", jsonstring);
  }
  else if (httpServer.method() == HTTP_POST)
  {
    Serial.println(httpServer.args());
    for (int i = 0; i < httpServer.args(); i++)
    {
      Serial.print(httpServer.argName(i) + ": " + httpServer.arg(i) + "\n");
    }
    if (httpServer.args() > 0)
    {
      deserializeJson(root, httpServer.arg(0));
      handleConfigUpdate(root);
      httpServer.send(200, "text/plain", "settings updated");
    }
    else
    {
      httpServer.send(500, "text/plain", "request format error");
    }
  }
}

void processExample()
{
  if (httpServer.args() > 0) // Are there any POST/GET Fields ?
  {
    for (uint8_t i = 0; i < httpServer.args(); i++)
    { // Iterate through the fields
      if (httpServer.argName(i) == "firstname")
      {
        // Your processing for the transmitted form-variable
        String fName = httpServer.arg(i);
      }
    }
  }
  httpServer.send(200, "text/html", FPSTR(website_content));
}

void format_reading(char *datastring, bool realtime)
{
  char buf[50];
  sprintf(buf, "%ld,%ld,%d,", node_type, node_id, 0);
  strcpy(datastring, buf);

  if (!realtime)
  {
    computeFlowAverageTimeframe(false);
  }

  for (int i = 0; i < N_MAX_SENSORS; i++)
  {
    if (sensorEnable[i])
    {
      if (!realtime)
      {
        sprintf(buf, "%ld,%ld,", sensorDataVol[i], sensorDataAvg[i]);
      }
      else
      {
        sprintf(buf, "%ld,", sensorData[i]);
      }
      strcat(datastring, buf);
    }
  }

  strcat(datastring, "\0");
  // remove last virgula
  datastring[strlen(datastring) - 1] = NULL;
}

void check_init_node_id()
{
  char buf[50];
  if (node_id == 0)
  {
    timeClient.begin();
    timeClient.update();
    // Serial.println(timeClient.getFormattedTime());
    // Serial.println(timeClient.getEpochTime());
    // node_id_init = timeClient.getEpochTime();

    node_id_init = 0;

    if (!node_id_init)
    {
      node_id_init = random(100000);
    }

    node_id = node_id_init % 100000;
    sprintf(buf, "%ld", node_id);
    strcat(mqtt_client_id, buf);
    write_config();
  }
}

void data_loop()
{
  timeClock1 = millis();

  if ((timeClock1 - timeClock0_2) >= mqtt_polling_interval)
  {
    timeClock0_2 = timeClock1;

    mqttClient.loop();

    int error = mqttCheck();
    if (!error)
    {
      mqtt_polling_interval = 1;
      mqtt_connection_error = 0;

      if (push_interval > 0)
      {
        if ((timeClock1 - timeClock0) >= push_interval)
        {
          timeClock0 = timeClock1;

          format_reading(csvstring, false);
          String csvstring2(csvstring);
          mqtt_send(mqtt_topic, csvstring2);
        }
      }

      if (push_interval_realtime > 0)
      {
        if ((timeClock1 - timeClock0_rt) >= push_interval_realtime)
        {
          timeClock0_rt = timeClock1;
          format_reading(csvstring, true);
          String csvstring2(csvstring);
          mqtt_send(mqtt_topic_realtime, csvstring2);
        }
      }
    }
    else
    {
      // prevent unresponsive system due to mqtt connection attempts
      mqtt_polling_interval = 10000;
      mqtt_connection_error = 1;
    }
  }
}

void loop()
{
  byte retval;
  char c;

  if (tickOccured)
  {
    tickOccured = false;
    system_clk += millis() - timeStartClock;
    timeStartClock = millis();
  }

  ESP.wdtFeed();

  // check connection status
  switch (wifi_status)
  {
  case STATUS_WIFI_START:
    if ((millis() - timeStart1) > 3000)
    {
      wifi_status = STATUS_WIFI_OK;
      Serial.end();
      Serial.begin(baud_rate);
      // reset sensor data (init complete)
      computeFlowAverageTimeframe(true);
    }
    break;
  case STATUS_WIFI_OK:
    //other info
    if (flag_info)
    {
      flag_info = 0;
      // info is used for debug purpose
      // and also for devices which can display info on lcd

      Serial.print("info: ");
      Serial.print(firmware_vesion);
      Serial.print(",");
      Serial.print(macToStr(mac));
      Serial.print(",");
      Serial.print(WiFi.localIP().toString());
      Serial.print(",");
      Serial.print(WiFi.RSSI());
      Serial.println();
      printSensorData();
    }

    httpServer.handleClient();

    if (WiFi.status() != WL_CONNECTED)
    {
      if (!wifi_disabled)
      {
        Serial.println("wifi disconnected");
        wifi_status = STATUS_WIFI_CONNECT_AP;
      }
    }
    else
    {
      check_init_node_id();
      data_loop();
      initial_wifi_connection = true;
    }
    break;
  case STATUS_WIFI_CONNECT_AP:

    httpServer.handleClient();

    retval = connectWiFi_Async();

    if (retval == FCN_RESULT_OK)
    {
      Serial.println("wifi connected");
      wifi_status = STATUS_WIFI_OK;
    }
    else if (retval == FCN_RESULT_IN_PROGRESS)
    {
    }
    else if (retval == FCN_RESULT_ER)
    {
      if (!initial_wifi_connection)
      {
        // stop connection attempts if ESP was unable to connect after power on / multiple attempts
        wifi_disabled = true;
      }
      wifi_status = STATUS_WIFI_OK;
    }
    break;
  default:
    break;
  }

  if ((flag_node_data_sent || flag_connection_error) && battery_saving_mode)
  {
    Serial.println("entering sleep mode");
    ESP.deepSleep(10 * 1000000);
  }
}
