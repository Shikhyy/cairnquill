import json
from cairnquill.adapters.snowflake import get_connection

def generate_scoreboard():
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM EVAL.RUNS ORDER BY ts DESC LIMIT 10")
            runs = cur.fetchall()
            print(json.dumps(runs, default=str, indent=2))
    finally:
        conn.close()

if __name__ == "__main__":
    generate_scoreboard()
