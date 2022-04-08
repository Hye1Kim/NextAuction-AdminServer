FROM node:14.15.1-alpine3.11
RUN apk add g++ make python
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3002
CMD ["npm", "run", "start"] 
