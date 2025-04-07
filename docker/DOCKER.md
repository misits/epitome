# Docker Deployment for Epitome

This guide explains how to deploy the Epitome static site using Docker and Docker Compose with optimized caching.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Quick Start

1. Clone the repository:
   ```
   git clone https://github.com/misits/epitome.git
   cd epitome
   ```

2. Build and start the containers:
   ```
   docker-compose up -d
   ```

3. Access your site at:
   ```
   http://localhost
   ```

## Caching Strategy

The deployment includes several layers of caching for optimal performance:

1. **Browser Caching**: Set via Nginx with different expiration times:
   - HTML files: 1 hour
   - CSS/JS files: 7 days
   - Images: 30 days
   - Fonts: 1 year

2. **Compression**: GZIP compression is enabled for all text-based assets.

3. **Nginx Cache**: A volume is mounted for Nginx to cache responses.

## Configuration Files

- `docker/Dockerfile`: Multi-stage build that compiles the static site and sets up Nginx
- `docker/nginx/nginx.conf`: Optimized Nginx configuration with caching rules
- `docker-compose.yml`: Container orchestration with volume for caching

## Customization

### Custom Domain

To use a custom domain, modify the `server_name` directive in `docker/nginx/nginx.conf`:

```nginx
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    # ...
}
```

### HTTPS Support

To add HTTPS, you can:

1. Use a reverse proxy like Traefik or Nginx Proxy Manager
2. Or modify the docker-compose.yml to include Certbot for Let's Encrypt

Example with Certbot (add to docker-compose.yml):

```yaml
certbot:
  image: certbot/certbot
  volumes:
    - ./data/certbot/conf:/etc/letsencrypt
    - ./data/certbot/www:/var/www/certbot
  command: certonly --webroot -w /var/www/certbot --email your@email.com -d your-domain.com -d www.your-domain.com --agree-tos
```

## Troubleshooting

### Cache Issues

If you need to clear the cache:

```bash
docker-compose down
docker volume rm epitome_nginx_cache
docker-compose up -d
```

### Container Logs

To view logs:

```bash
docker-compose logs -f
```

## Production Deployment Tips

1. Consider using a CDN in front of your Docker deployment
2. Set up monitoring with Prometheus and Grafana
3. Implement regular backups of your configuration 