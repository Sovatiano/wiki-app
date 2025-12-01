import psycopg2
import sys
import os

# Set UTF-8 encoding for Windows
if sys.platform == 'win32':
    os.environ['PGCLIENTENCODING'] = 'UTF8'

try:
    # Use direct connection parameters (avoid DSN string parsing issues)
    conn = psycopg2.connect(
        host="localhost",
        database="wikiapp",
        user="postgres",
        password="password",
        port=5433,
        connect_timeout=5
    )
    print("✅ PostgreSQL connection successful!")
    conn.close()
except Exception as e:
    print(f"❌ PostgreSQL connection failed: {e}")
    import traceback
    traceback.print_exc()