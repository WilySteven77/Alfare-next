FROM nginx:1.25-alpine
# Eliminar la configuración por defecto antes de copiar la propia
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Ajustar permisos para que el usuario sin privilegios pueda ejecutarse
RUN chown -R nginx:nginx /var/cache/nginx /var/run /var/log/nginx
USER nginx

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]