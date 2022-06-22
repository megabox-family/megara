FROM node:16.15.1-alpine3.16

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --quiet

RUN npm install -g nodemon

COPY . .

EXPOSE 3002

CMD ["node", "./src"]