#!/usr/bin/env bash
FROM --platform=linux/amd64 node:12.18.1-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install 
COPY ./src ./src
CMD npm start