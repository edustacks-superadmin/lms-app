import requests

url = "https://thapovaninstitute.testpress.in/api/v2.5/auth-token/"

payload = {
    "username": "admin",
    "password": "0123443210"
}
headers = {
    'content-type': "application/json",
    'cache-control': "no-cache",
}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
