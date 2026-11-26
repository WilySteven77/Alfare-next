FROM nginx:1.25-alpine
WORKDIR /alfared


COPY ./config/nginx.conf /etc/nginx/conf.d/default.conf

COPY package*.json .

RUN npm install 

RUN npm build

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
