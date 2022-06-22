FROM node:16.15.1-alpine3.16

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --quiet

COPY . .

EXPOSE 3000

CMD ["npm", "start"]