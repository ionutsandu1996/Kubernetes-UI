FROM node:20-alpine

#Create app directory
WORKDIR /app

#COPY package files
COPY package*.json ./

#Install dependencies
RUN npm install --production

#Copy source code
COPY . .

#Expose backend port
EXPOSE 3001

#Start backend
CMD ["node", "index.js"]