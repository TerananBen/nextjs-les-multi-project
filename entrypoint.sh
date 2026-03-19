#!/bin/sh
set -e

node modify-config.mjs

exec node server.js