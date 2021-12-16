from os import environ as env
from main import app as application

if __name__ == "__main__":
    application.run(host=env["HOST"], debug=bool(
        env["DEBUG_MODE"]), port=int(env["PORT"]))
