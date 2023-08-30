https://nodesource.com/blog/running-your-node-js-app-with-systemd-part-1/

sudo nano /lib/systemd/system/hello_env.service

# reload commands
sudo systemctl daemon-reload

# start commands
sudo systemctl start hello_env
sudo systemctl status hello_env
sudo systemctl stop hello_env
sudo systemctl restart hello_env

# start when the machine boots
sudo systemctl enable hello_env
sudo systemctl disable hello_env

# view logs
journalctl -u hello_env.service -n 100



# check for failed to start services
systemctl --failed

# check enabled services
systemctl list-unit-files