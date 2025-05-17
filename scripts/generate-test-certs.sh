#!/bin/bash

# Generate self-signed certificates for testing HTTPS support
# NOT FOR PRODUCTION USE

echo "Generating self-signed certificates for testing..."

# Create certs directory if it doesn't exist
mkdir -p test/certs

# Generate private key
openssl genrsa -out test/certs/key.pem 2048

# Generate certificate signing request
openssl req -new -key test/certs/key.pem -out test/certs/csr.pem \
    -subj "/C=US/ST=Test/L=Test/O=MCPControl/OU=Test/CN=localhost"

# Generate self-signed certificate
openssl x509 -req -days 365 -in test/certs/csr.pem \
    -signkey test/certs/key.pem -out test/certs/cert.pem

# Clean up CSR
rm test/certs/csr.pem

echo "Test certificates generated successfully!"
echo "Certificate: test/certs/cert.pem"
echo "Private key: test/certs/key.pem"
echo ""
echo "To test HTTPS support, run:"
echo "node build/index.js --sse --https --cert test/certs/cert.pem --key test/certs/key.pem"