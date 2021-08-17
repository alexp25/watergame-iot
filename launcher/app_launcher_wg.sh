#!/bin/sh
cd /
cd home/ubuntu/watergame_iot/dist
export NODE_ENV=production
exec node main.js >> /var/log/node.log 2>&1
cd /
