FROM node:22-alpine

WORKDIR /app

COPY ./package.json ./package.json
COPY ./package-lock.json ./package-lock.json

RUN npm install

COPY . . 
ENV DB_URL=mongodb://mongo:27017/
ENV EMAIL_PASS_KEY="fzso rcne lirf ditx"
ENV CLOUDINARY_CLOUD_NAME ="dlsgdlo8u"
ENV CLOUDINARY_API_KEY=551963352323951
ENV CLOUDINARY_API_SECRET="zzfLbrYWXZeasmMjqME5-vYWsqM"
ENV DEVCONNECT_TOKEN_KEY="DevConnect$3#12"


EXPOSE 4000

CMD ["npm", "run", "start"]

