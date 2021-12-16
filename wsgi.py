from os import environ as env
from app import app

if __name__ == "__main__":
    app.run(host=env["HOST"], debug=bool(
        env["DEBUG_MODE"]), port=int(env["PORT"]))
