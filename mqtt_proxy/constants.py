import yaml

class Constants:
    LOOP_DELAY = 0.01

    conf = {}
    @staticmethod
    def load():
        with open("config.yml", 'r') as stream:
            try:
                conf = yaml.load(stream)
                print(conf)
                Constants.conf = conf
            except yaml.YAMLError as exc:
                print(exc)