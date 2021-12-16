from os import environ as env
import os
from dotenv import load_dotenv
from flask import Flask, render_template, send_from_directory, url_for
from services import urlService, GithubGistService

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

@ app.route("/player")
def player():
    # Get url from GitHub Gist
    video_url = ggs.get_url()

    # Get identifier from URL
    identifier = urlService.get_identifier(video_url)

    # Send the identifier to the view
    return render_template("index.html", identifier=identifier)
