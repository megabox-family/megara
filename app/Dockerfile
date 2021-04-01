FROM mhart/alpine-node:14.16.0

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm install --quiet

COPY . .

EXPOSE 3000

CMD ["npm", "start"]