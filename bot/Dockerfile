FROM node:19.9.0-alpine

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --quiet

RUN npm install -g nodemon

COPY . .

CMD ["node", "./src"] 
