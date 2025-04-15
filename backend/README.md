To run mongo

docker run -d \
  --name mongo_auth \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=user \
  -e MONGO_INITDB_ROOT_PASSWORD=secpass \
  mongo:latest --replSet=rs0
