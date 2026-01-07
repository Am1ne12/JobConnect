#!/bin/sh

# Generate config.json from environment variables
cat > /usr/share/nginx/html/assets/config.json << EOF
{
    "apiUrl": "${API_URL:-/api}"
}
EOF

echo "Generated config.json with API_URL=${API_URL:-/api}"

# Start nginx
exec nginx -g 'daemon off;'
