import psycopg2

try:
    conn = psycopg2.connect(
        host="localhost",
        database="wikiapp",
        user="postgres",
        password="112233",
        port=5432
    )
    print("✅ PostgreSQL connection successful!")
    conn.close()
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")