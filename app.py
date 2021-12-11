from os import environ as env
from dotenv import load_dotenv
from flask import Flask, render_template
from services import urlService, GithubGistService

# Load .env file
load_dotenv()


app = Flask(__name__)


ggs = GithubGistService(env["GIST_URL"],env["GITHUB_API_KEY"])

@app.route("/player")
def player():
    # Get url from GitHub Gist
    video_url = ggs.get_url()

    # Get identifier from URL
    identifier = urlService.get_identifier(video_url)

    # Send the identifier to the view
    return render_template("index.html", identifier=identifier)

if __name__ == '__main__':
    app.run(host=env["HOST"], debug=bool(env["DEBUG_MODE"]), port=int(env["PORT"]))