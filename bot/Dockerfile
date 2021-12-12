FROM node:16.13.0-alpine3.12

WORKDIR /app

RUN wget https://johnvansickle.com/ffmpeg/builds/ffmpeg-git-amd64-static.tar.xz

RUN mkdir ffmpeg && tar xvf ffmpeg-git-amd64-static.tar.xz -C ffmpeg --strip-components 1

RUN mv ffmpeg/ffmpeg ffmpeg/ffprobe /usr/local/bin/

COPY package.json package-lock.json ./

RUN npm install --quiet

RUN npm install -g nodemon

COPY . .

CMD ["node", "./src"] 
