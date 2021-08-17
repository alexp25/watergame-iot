import time
from constants import Constants
from threading import Thread
from mqtt_client import MQTTClient

class MQTTManager(Thread):
    def __init__(self):
        Thread.__init__(self)
        self.mqtt_client_1 = None
        self.mqtt_client_2 = None

    # 1 = LOCAL -> CLOUD
    # 2 = LOCAL <- CLOUD
    def check_mapping(self, topic, data, direction):
        mapp = Constants.conf["MAPPING"]
        print("cbdata: ", topic, data, direction)
        for m in mapp:
            if m["DIRECTION"] == direction:
                if direction == "LOCAL_SEND" and topic == m["LOCAL"]:
                    # local -> cloud
                    self.mqtt_client_2.send(m["CLOUD"], data)
                    break
                elif direction == "LOCAL_RECEIVE" and topic == m["CLOUD"]:
                    # local <- cloud
                    self.mqtt_client_1.send(m["LOCAL"], data)
                    break

    def create_client(self):

        def callback_link_12(topic, data):
            if topic is not None:
                self.check_mapping(topic, data, "LOCAL_SEND")

        self.mqtt_client_1 = MQTTClient()
        addr = Constants.conf["MQTT_BROKER"]["LOCAL"]["URL"]
        port = Constants.conf["MQTT_BROKER"]["LOCAL"]["PORT"]
        user = Constants.conf["MQTT_BROKER"]["LOCAL"]["USER"]
        passwd = Constants.conf["MQTT_BROKER"]["LOCAL"]["PASS"]
        self.mqtt_client_1.setup(addr, port, user, passwd)
        self.mqtt_client_1.connect(Constants.conf["MQTT_BROKER"]["LOCAL"]["CLIENT"], callback_link_12)

        def callback_link_21(topic, data):
            if topic is not None:
                self.check_mapping(topic, data, "LOCAL_RECEIVE")

        self.mqtt_client_2 = MQTTClient()
        addr = Constants.conf["MQTT_BROKER"]["CLOUD"]["URL"]
        port = Constants.conf["MQTT_BROKER"]["CLOUD"]["PORT"]
        user = Constants.conf["MQTT_BROKER"]["CLOUD"]["USER"]
        passwd = Constants.conf["MQTT_BROKER"]["CLOUD"]["PASS"]
        self.mqtt_client_2.setup(addr, port, user, passwd)
        self.mqtt_client_2.connect(Constants.conf["MQTT_BROKER"]["CLOUD"]["CLIENT"], callback_link_21)

    def run(self):
        t0 = time.time()
        
           
