
cp backend/.env.example backend/.env

docker compose up --build -d

# first time
docker compose exec api alembic revision --autogenerate -m "initial"

# migrate
docker compose exec api alembic upgrade head


# http://localhost:8000/docs

# Kibana (optional)
docker compose --profile debug up -d kibana



# 1. köhnə revision-u DB-dən sil
alembic stamp base

# 2. mövcud head (0001_add_country_to_sites) kimi işarələ
alembic stamp head

# 3. indi upgrade et
alembic upgrade head