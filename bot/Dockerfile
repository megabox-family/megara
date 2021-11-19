FROM node:16.13.0-alpine3.12

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --quiet

RUN npm install -g nodemon

COPY . .

CMD ["node", "./src"] 
