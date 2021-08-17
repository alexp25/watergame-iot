import paho.mqtt.client as mqttClient
import paho.mqtt as mqtt
import time
from utils import Utils


class MQTTClient:
    def __init__(self):
        self.broker_address = None
        self.client = None
        self.connected = False

    def setup(self, addr, port, user, passwd):
        self.broker_address = addr
        self.broker_port = port
        self.user = user
        self.passwd = passwd

    def disconnect(self):
        if self.client:
            self.client.loop_stop()

    def send(self, topic, data):
        self.client.publish(topic, payload=data, qos=0, retain=False)

    def connect(self, client_id, callback):
        def on_connect(client, userdata, flags, rc):
            print("client: " + str(client) + " connected")
            self.connected = True

        def on_disconnect(client, userdata, rc):
            print("client: " + str(client) + " disconnected")
            self.connected = False
            try:
                if self.client:
                    self.client.loop_stop()
            except:
                print(Utils.format_exception(self.__class__.__name__))

        def on_message(client, userdata, message):
            try:
                raw_data = str(message.payload.decode("utf-8"))
                topic = message.topic
                print(raw_data)
                if callback is not None:
                    callback(topic, raw_data)
            except:
                print(Utils.format_exception(self.__class__.__name__))

        print("creating new instance")

        self.client = mqttClient.Client(client_id=client_id, clean_session=True, userdata=None,
                                        protocol=mqtt.client.MQTTv311, transport="tcp")

        self.client.username_pw_set(self.user, self.passwd)
        self.client.on_message = on_message  # attach function to callback
        self.client.on_connect = on_connect
        self.client.on_disconnect = on_disconnect

        print("connecting to broker")
        self.client.connect(self.broker_address, port=self.broker_port,
                            keepalive=60, bind_address="")

        self.client.loop_start()  # start the loop
        print("subscribing to mqtt topics")
        self.client.subscribe(topic="#", qos=0)
