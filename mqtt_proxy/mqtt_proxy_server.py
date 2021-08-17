
from mqtt_proxy import MQTTManager
from constants import Constants
from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello_world():
    return 'Hello, World!'

if __name__ == '__main__':
    Constants.load()
    mqtt_manager = MQTTManager()
    mqtt_manager.create_client()
    mqtt_manager.start()

    app.run()

