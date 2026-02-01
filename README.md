Node.js + Express backend for study planner project.

# Backend API
# BASE URL
http://localhost:3000
## LOGIN
- Method: POST
- URL: /login
## REQUEST BODY
```json
{
"userID": "string",
"password": "string"
}
```
## RESPONSE(임시LOGIN)
- 서버 고유 ID: 1,2,3
- 멘토(1명) 1 / 멘티(2명) 2,3
```json  
{ "succcess": true,
  "userID": 1,
  "role": "mentor"
}
{ "succcess": true,
  "userID": 2,
  "role": "student"
}
```
