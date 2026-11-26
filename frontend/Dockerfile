FROM nginx:1.25-alpine

# Eliminar la configuración por defecto antes de copiar la propia
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Eliminamos el chown y el USER nginx para que el proceso maestro arranque normal
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]