import re
import requests
import json

class urlService:
    @classmethod
    def get_identifier(self, url):
        #TODO Add validations
        r =  re.search(r"(watch\?v=|\.be\/)([\-A-z\d]+)",url)
        result = r.group(2)
        if result == None:
            return None
        return result

class GithubGistService():
    def __init__(self, githubGist_url, githubAPI_token):
        self.url = githubGist_url
        self.headers = {
            'Authorization': "Token " + githubAPI_token,
            'Content-Type': 'application/json'
        }

    def __get_request(self):
        response = requests.request(
            "GET", url=self.url, headers=self.headers)
        return json.loads(response.text)

    def __patch_request(self, body):
        response = requests.request(
            "PATCH", url=self.url, headers=self.headers, data=body)
        return json.loads(response.text)

    def get_all_files(self):
        response = self.__get_request()
        return response["files"]

    def get_url(self):
        response = self.__get_request()
        return response["files"]["PlayerURL"]["content"]

    def update_url(self, content):
        body = json.dumps({"files": {"PlayerURL": {"content": content}}})
        self.__patch_request(body)

if __name__ == '__main__':    
    ggs = GithubGistService(r"https://api.github.com/gists/e63bc87fede6f4771a311c220bd0f7e8",r"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")
    ggs.update_url("https://www.youtube.com/watch?v=3dEfc9LL9bQ")
    print(ggs.get_url())