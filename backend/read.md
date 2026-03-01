
cp backend/.env.example backend/.env

docker compose up --build -d

# first time
docker compose exec api alembic revision --autogenerate -m "initial"
docker compose exec api alembic upgrade head

# http://localhost:8000/docs

# Kibana (optional)
docker compose --profile debug up -d kibana