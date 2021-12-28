from flask import Flask, render_template, send_from_directory
from services import urlService, GithubGistService
from dotenv import load_dotenv
from os import environ as env
import json
import os

# Load environment variables
load_dotenv()

# Load application
app = Flask(__name__)

# Load base directory
basedir = os.path.abspath(os.path.dirname(__file__))

# Load Hithub Gist Service
ggs = GithubGistService(env["GIST_URL"], env["GITHUB_API_KEY"])


@app.route('/favicon.ico')
def favicon():
    print(os.path.join(app.root_path, 'static'), 'favicon.ico')

    return send_from_directory(os.path.join(app.root_path, 'static'),
                               'favicon.ico',
                               mimetype='image/vnd.microsoft.icon')


@app.route("/")
def index():
    data = {"msg": "Welcome to Dafnix UI"}
    response = app.response_class(
        response=json.dumps(data),
        status=200,
        mimetype='application/json'
    )
    return response


@app.route("/status")
def status():
    data = {"msg": "Status Online"}
    response = app.response_class(
        response=json.dumps(data),
        status=200,
        mimetype='application/json'
    )
    return response


@app.route("/player")
def player():
    # Get url from GitHub Gist
    video_url = ggs.get_url()

    # Get identifier from URL
    if "Error" in video_url:
        identifier = video_url
    else:
        identifier = urlService.get_identifier(video_url)

    # Send the identifier to the view
    return render_template("index.html", identifier=identifier)
